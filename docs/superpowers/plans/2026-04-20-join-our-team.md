# Join Our Team Implementation Plan — Revision 2 (wizard refactor)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the existing single-page careers form into (a) a clean landing page at `/join-our-team` and (b) a guided multi-step wizard at `/join-our-team/apply`. Reuse the types, validator, API route, and landing-page section components where possible. Retire `JobApplicationForm.tsx`.

**Architecture:** Two public routes, one data contract. The landing page is a server component composing Hero → Why → Process → Contact, with an Apply Now CTA in the hero. The wizard is a client component driven by a declarative `STEPS` config array; a small library of step-type components (text / yes-no / chip / info / declaration / review / success) renders each step. State is in-memory; conditional branching drives visibility of contractor-only insurance steps and the experience-types follow-up.

**Tech stack:** Next.js 14 (App Router), TypeScript, Tailwind (existing sage palette), lucide-react, framer-motion (already in the project), Jest + ts-jest. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-20-join-our-team-design.md`

**Branch:** `feat/join-our-team` (already contains Revision 1's commits; unrelated commits from other work will be filtered at PR time via cherry-pick onto a fresh branch).

---

## What already exists

From the prior build, the following commits are live on this branch and will be reused with small edits or unchanged:

| File | Prior commit | This plan |
|------|--------------|-----------|
| `src/types/application.ts` | `0f353d1` | Edit (T1) |
| `src/lib/applicationValidation.ts` | `a4dd9e3` | Edit (T2) |
| `src/__tests__/lib/applicationValidation.test.ts` | `a4dd9e3` | Edit (T2) |
| `src/app/api/submit-application/route.ts` | `3e5d676` | Edit (T3) |
| `src/__tests__/api/submit-application.test.ts` | `3e5d676` | Edit (T3) |
| `src/components/Footer.tsx` | `8698684` | No change |
| `src/components/JobApplicationForm.tsx` | `ded2b93`, `67ae446` | Retire (T4) |
| `src/components/CareersHero.tsx` | `c533731` | Edit (T4) |
| `src/components/WhyWorkWithSano.tsx` | `e785e11` | No change |
| `src/components/CareersProcess.tsx` | `fabb926` | No change |
| `src/components/CareersContact.tsx` | `a5cda0f` | No change |
| `src/app/(public)/join-our-team/page.tsx` | `2375934` | Edit (T4) |

---

## File structure after this plan

```
src/
  app/
    (public)/
      join-our-team/
        page.tsx                              — landing, no form
        apply/
          page.tsx                            — NEW wizard host
    api/
      submit-application/
        route.ts                              — edited: log first_name/last_name
  components/
    CareersHero.tsx                           — edited: Apply Now CTA
    WhyWorkWithSano.tsx
    CareersProcess.tsx
    CareersContact.tsx
    Footer.tsx
    _retired/
      JobApplicationForm.old.tsx              — NEW location (moved from parent dir)
    careers-apply/
      ApplicationWizard.tsx                   — NEW orchestrator
      steps.config.ts                         — NEW declarative flow
      WizardProgress.tsx                      — NEW
      WizardNav.tsx                           — NEW
      step-types/
        WelcomeStep.tsx                       — NEW
        TextStep.tsx                          — NEW
        TextareaStep.tsx                      — NEW
        YesNoStep.tsx                         — NEW
        ChipSingleStep.tsx                    — NEW
        ChipMultiStep.tsx                     — NEW
        InfoStep.tsx                          — NEW
        DeclarationStep.tsx                   — NEW
        ReviewStep.tsx                        — NEW
        SuccessStep.tsx                       — NEW
  lib/
    applicationValidation.ts                  — edited
    applicationStepValidation.ts              — NEW per-step gating
  types/
    application.ts                            — edited
  __tests__/
    lib/
      applicationValidation.test.ts           — edited fixture
    api/
      submit-application.test.ts              — edited fixture
```

---

## Mike checkpoints

Pause and ask Mike before proceeding past:
- **After Task 3** — API contract finalised (same gate as before, new shape).
- **After Task 11** — wizard orchestrator + all step types assembled; good to browser-test the flow.
- **Before T13 PR cleanup** — Mike decides whether to cherry-pick onto a fresh branch.

---

## Task 1: Type edits

**Files:** modify `src/types/application.ts`.

- [ ] **Step 1: Replace the types file with the revised shape.**

```ts
// src/types/application.ts

export type ApplicationType = 'contractor' | 'employee'

export type ExperienceType =
  | 'residential'
  | 'deep'
  | 'end_of_tenancy'
  | 'commercial'
  | 'carpet_upholstery'
  | 'windows'
  | 'post_construction'
  | 'other'

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface ApplicationFormData {
  // Personal details
  first_name: string
  last_name: string
  phone: string
  email: string
  suburb: string

  // Role type
  application_type: ApplicationType | ''

  // Licence & transport
  has_license: boolean | null
  has_vehicle: boolean | null
  can_travel: boolean | null

  // Experience
  has_experience: boolean | null
  experience_types: ExperienceType[]
  experience_notes: string

  // Equipment
  has_equipment: boolean | null

  // Availability
  available_days: DayOfWeek[]
  preferred_hours: string
  travel_areas: string

  // Independent work + compliance
  independent_work: boolean | null
  work_rights_nz: boolean | null
  has_insurance: boolean | null
  willing_to_get_insurance: boolean | null

  // Motivation (optional)
  why_join_sano: string

  // Declaration
  confirm_truth: boolean
}

export type ApplicationFormErrors = Partial<Record<keyof ApplicationFormData, string>>
export type JobApplicationPayload = ApplicationFormData
```

- [ ] **Step 2: Run tsc.**

Run: `cd F:/Sano/01-Site && rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`

Expected: **Errors in `src/lib/applicationValidation.ts`, `src/components/JobApplicationForm.tsx`, `src/__tests__/*/applicationValidation.test.ts`, `src/__tests__/api/submit-application.test.ts`, and `src/app/api/submit-application/route.ts`** — all references to `full_name`, `application_type: 'casual'`/`'either'`, `equipment_notes`, `work_preferences` will break. This is expected; Tasks 2–4 fix them.

Do NOT commit yet — commit after Task 2 so tsc is green at commit time.

---

## Task 2: Update `validateApplication` and tests

**Files:** modify `src/lib/applicationValidation.ts` and `src/__tests__/lib/applicationValidation.test.ts`.

- [ ] **Step 1: Update the test fixture + tests first (TDD — tests first).**

Open `src/__tests__/lib/applicationValidation.test.ts`. Replace the `valid()` fixture:

```ts
function valid(): ApplicationFormData {
  return {
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '021 000 0000',
    email: 'jane@example.com',
    suburb: 'Mount Eden',
    application_type: 'contractor',
    has_license: true,
    has_vehicle: true,
    can_travel: true,
    has_experience: true,
    experience_types: ['residential'],
    experience_notes: '',
    has_equipment: true,
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    independent_work: true,
    work_rights_nz: true,
    has_insurance: null,
    willing_to_get_insurance: null,
    why_join_sano: '',
    confirm_truth: true,
  }
}
```

Rename `it('requires full_name', ...)` to `it('requires first_name', ...)` and update to flip `first_name`. Add a symmetric `it('requires last_name', ...)`:

```ts
it('requires first_name', () => {
  const data = { ...valid(), first_name: '   ' }
  expect(validateApplication(data).first_name).toBeDefined()
})

it('requires last_name', () => {
  const data = { ...valid(), last_name: '' }
  expect(validateApplication(data).last_name).toBeDefined()
})
```

Remove any remaining `full_name` references.

- [ ] **Step 2: Run the tests — expect failures.**

Run: `cd F:/Sano/01-Site && npm test -- applicationValidation`

Expected: multiple failures (module still has old rules).

- [ ] **Step 3: Update `src/lib/applicationValidation.ts`.**

```ts
import type { ApplicationFormData, ApplicationFormErrors } from '@/types/application'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createEmptyApplicationForm(): ApplicationFormData {
  return {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    suburb: '',
    application_type: '',
    has_license: null,
    has_vehicle: null,
    can_travel: null,
    has_experience: null,
    experience_types: [],
    experience_notes: '',
    has_equipment: null,
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    independent_work: null,
    work_rights_nz: null,
    has_insurance: null,
    willing_to_get_insurance: null,
    why_join_sano: '',
    confirm_truth: false,
  }
}

export function validateApplication(data: ApplicationFormData): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {}

  if (!data.first_name.trim()) errors.first_name = 'Your first name is required'
  if (!data.last_name.trim()) errors.last_name = 'Your last name is required'
  if (!data.phone.trim()) errors.phone = 'Phone is required'
  if (!data.email.trim() || !EMAIL_RE.test(data.email.trim())) errors.email = 'A valid email is required'
  if (!data.suburb.trim()) errors.suburb = 'Suburb is required'

  if (data.application_type !== 'contractor' && data.application_type !== 'employee') {
    errors.application_type = 'Please choose one'
  }

  if (data.has_license === null) errors.has_license = 'Please answer yes or no'
  if (data.has_vehicle === null) errors.has_vehicle = 'Please answer yes or no'
  if (data.can_travel === null) errors.can_travel = 'Please answer yes or no'

  if (data.has_experience === null) errors.has_experience = 'Please answer yes or no'
  if (data.has_experience === true && data.experience_types.length === 0) {
    errors.experience_types = 'Select at least one type'
  }

  if (data.has_equipment === null) errors.has_equipment = 'Please answer yes or no'

  if (data.independent_work === null) errors.independent_work = 'Please answer yes or no'
  if (data.work_rights_nz === null) errors.work_rights_nz = 'Please answer yes or no'

  if (!data.confirm_truth) errors.confirm_truth = 'You must confirm before submitting'

  return errors
}
```

Note: `EMAIL_RE.test(data.email.trim())` picks up the minor trim fix flagged in the prior code review.

- [ ] **Step 4: Run tests — expect pass.**

Run: `cd F:/Sano/01-Site && npm test -- applicationValidation`

Expected: all tests green (14 → 15 with the new `last_name` test).

- [ ] **Step 5: Commit.**

```bash
cd F:/Sano/01-Site && git add src/types/application.ts src/lib/applicationValidation.ts src/__tests__/lib/applicationValidation.test.ts && git commit -m "refactor(careers): split names, tighten enum, trim email in validator"
```

---

## Task 3: Update API route + tests

**Files:** modify `src/app/api/submit-application/route.ts` and `src/__tests__/api/submit-application.test.ts`.

- [ ] **Step 1: Update the test fixture + logging assertion first.**

In `src/__tests__/api/submit-application.test.ts`:

Replace `validBody()` to use the new field names (same pattern as Task 2's fixture).

Rename `it('returns 400 when full_name is missing', ...)` to `it('returns 400 when first_name is missing', ...)` and update the body.

Update the logging test to match five fields:

```ts
it('logs only the five redacted fields on success', async () => {
  await POST(makeRequest(validBody()))
  expect(console.log).toHaveBeenCalledWith(
    '[job-application] received',
    expect.objectContaining({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      suburb: 'Mount Eden',
      application_type: 'contractor',
    }),
  )
  const call = (console.log as jest.Mock).mock.calls[0][1]
  expect(Object.keys(call).sort()).toEqual(
    ['application_type', 'email', 'first_name', 'last_name', 'suburb'].sort(),
  )
})
```

- [ ] **Step 2: Run tests — expect failures.**

Run: `cd F:/Sano/01-Site && npm test -- submit-application`

Expected: fixture + logging-key assertion both fail.

- [ ] **Step 3: Update `src/app/api/submit-application/route.ts`.**

Replace the console.log block only:

```ts
console.log('[job-application] received', {
  first_name: payload.first_name,
  last_name: payload.last_name,
  email: payload.email,
  suburb: payload.suburb,
  application_type: payload.application_type,
})
```

Everything else in the route (validator call, response shape, try/catch) stays as-is.

- [ ] **Step 4: Run tests — expect pass.**

Run: `cd F:/Sano/01-Site && npm test -- submit-application`

Expected: all 6 tests green.

- [ ] **Step 5: Commit.**

```bash
cd F:/Sano/01-Site && git add src/app/api/submit-application/route.ts src/__tests__/api/submit-application.test.ts && git commit -m "refactor(careers): log first_name+last_name (5 redacted fields)"
```

- [ ] **Step 6: PAUSE — Mike checkpoint.**

API contract locked. Confirm before proceeding to the UI refactor.

---

## Task 4: Retire old form + landing page cleanup + Apply Now CTA (batched)

These three changes belong together — they transition the site from "form on /join-our-team" to "landing page → apply link". Doing them in one task keeps intermediate commits coherent.

**Files:**
- Move: `src/components/JobApplicationForm.tsx` → `src/components/_retired/JobApplicationForm.old.tsx`
- Modify: `src/components/CareersHero.tsx`
- Modify: `src/app/(public)/join-our-team/page.tsx`

- [ ] **Step 1: Move JobApplicationForm out of the live tree.**

```bash
cd F:/Sano/01-Site && mkdir -p src/components/_retired && git mv src/components/JobApplicationForm.tsx src/components/_retired/JobApplicationForm.old.tsx
```

- [ ] **Step 2: Update `src/components/CareersHero.tsx` to include the Apply Now CTA.**

Replace the file with:

```tsx
import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'

export function CareersHero() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div>
            <p className="eyebrow mb-4">Careers</p>
            <h1 className="mb-6">Join Our Team</h1>
            <p className="body-text max-w-xl mb-8">
              We&apos;re always looking for reliable, detail-focused people who take pride in their work. If you have cleaning experience and want flexible opportunities with a growing team, we&apos;d love to hear from you.
            </p>
            <Link
              href="/join-our-team/apply"
              className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors"
            >
              Apply Now
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Placeholder block */}
          <div className="relative rounded-2xl ring-1 ring-sage-100/60 shadow-sm overflow-hidden aspect-video lg:aspect-[4/5] bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center">
            <Users className="w-16 h-16 text-sage-500/40" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Update `src/app/(public)/join-our-team/page.tsx` to drop the form section.**

Replace the file with:

```tsx
import type { Metadata } from 'next'
import { CareersHero } from '@/components/CareersHero'
import { WhyWorkWithSano } from '@/components/WhyWorkWithSano'
import { CareersProcess } from '@/components/CareersProcess'
import { CareersContact } from '@/components/CareersContact'

export const metadata: Metadata = {
  title: 'Join Our Team | Sano',
  description:
    "We're looking for reliable, detail-focused people for flexible cleaning work across Auckland. Apply to join the Sano team.",
}

export default function JoinOurTeamPage() {
  return (
    <>
      <CareersHero />
      <WhyWorkWithSano />
      <CareersProcess />
      <CareersContact />
    </>
  )
}
```

(Note: `JobApplicationForm` import is gone; the wrapper `<section>` around it is gone; the import list is 4 components.)

- [ ] **Step 4: Verify tsc still passes.**

Run: `cd F:/Sano/01-Site && rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`

Expected: clean.

- [ ] **Step 5: Run the test suite.**

Run: `cd F:/Sano/01-Site && npm test`

Expected: the 20 careers-suite tests from Tasks 2 and 3 still pass; unrelated pre-existing failures in `services.test.ts` and `Header.test.tsx` are fine.

- [ ] **Step 6: Commit.**

```bash
cd F:/Sano/01-Site && git add -A src/components/_retired src/components/JobApplicationForm.tsx src/components/CareersHero.tsx "src/app/(public)/join-our-team/page.tsx" && git commit -m "refactor(careers): retire old form; landing page drops inline form; hero gets Apply Now CTA"
```

---

## Task 5: Per-step validator module

**Files:** create `src/lib/applicationStepValidation.ts`.

- [ ] **Step 1: Create the module.**

```ts
import type { ApplicationFormData } from '@/types/application'
import { validateApplication } from './applicationValidation'

// Returns the error message for `field` if the full-form validator would flag it, else null.
function fieldError(data: ApplicationFormData, field: keyof ApplicationFormData): string | null {
  const errors = validateApplication(data)
  return errors[field] ?? null
}

export const stepValidators = {
  first_name: (d: ApplicationFormData) => fieldError(d, 'first_name'),
  last_name: (d: ApplicationFormData) => fieldError(d, 'last_name'),
  phone: (d: ApplicationFormData) => fieldError(d, 'phone'),
  email: (d: ApplicationFormData) => fieldError(d, 'email'),
  suburb: (d: ApplicationFormData) => fieldError(d, 'suburb'),
  application_type: (d: ApplicationFormData) => fieldError(d, 'application_type'),
  has_license: (d: ApplicationFormData) => fieldError(d, 'has_license'),
  has_vehicle: (d: ApplicationFormData) => fieldError(d, 'has_vehicle'),
  can_travel: (d: ApplicationFormData) => fieldError(d, 'can_travel'),
  has_experience: (d: ApplicationFormData) => fieldError(d, 'has_experience'),
  experience_types: (d: ApplicationFormData) => fieldError(d, 'experience_types'),
  has_equipment: (d: ApplicationFormData) => fieldError(d, 'has_equipment'),
  independent_work: (d: ApplicationFormData) => fieldError(d, 'independent_work'),
  work_rights_nz: (d: ApplicationFormData) => fieldError(d, 'work_rights_nz'),
  confirm_truth: (d: ApplicationFormData) => fieldError(d, 'confirm_truth'),
} as const

export type StepField = keyof typeof stepValidators
```

This composes per-step validators from the shared rules — zero rule duplication.

- [ ] **Step 2: Verify tsc.**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`

Expected: clean.

- [ ] **Step 3: Commit.**

```bash
cd F:/Sano/01-Site && git add src/lib/applicationStepValidation.ts && git commit -m "feat(careers): add per-step validators composed from shared rules"
```

---

## Task 6: Simple step-type components (Welcome, Info, Success)

**Files:** create 3 files under `src/components/careers-apply/step-types/`.

- [ ] **Step 1: Create `WelcomeStep.tsx`.**

```tsx
'use client'

import { ArrowRight } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center">
      <p className="eyebrow mb-4">Application</p>
      <h1 className="mb-6">Let&apos;s get you onboard.</h1>
      <p className="body-text max-w-lg mx-auto mb-10">
        This should take about five minutes. A few quick questions so we can understand if it&apos;s a good fit.
      </p>
      <button
        type="button"
        onClick={onNext}
        className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors"
      >
        Let&apos;s start
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `InfoStep.tsx`.**

```tsx
'use client'

import type { ApplicationFormData } from '@/types/application'

interface InfoStepProps {
  data: ApplicationFormData
  title?: string | ((d: ApplicationFormData) => string)
  body: string | ((d: ApplicationFormData) => string)
}

export function InfoStep({ data, title, body }: InfoStepProps) {
  const resolvedTitle = typeof title === 'function' ? title(data) : title
  const resolvedBody = typeof body === 'function' ? body(data) : body

  return (
    <div className="text-center">
      {resolvedTitle && <h2 className="mb-6">{resolvedTitle}</h2>}
      <p className="body-text max-w-lg mx-auto">{resolvedBody}</p>
    </div>
  )
}
```

- [ ] **Step 3: Create `SuccessStep.tsx`.**

```tsx
'use client'

export function SuccessStep() {
  return (
    <div role="status" className="bg-sage-50 border border-sage-100 rounded-2xl p-10 text-center">
      <p className="text-5xl mb-6" aria-hidden="true">✓</p>
      <h2 className="text-sage-800 mb-4">Thanks — application received</h2>
      <p className="body-text max-w-lg mx-auto">
        We&apos;ve received your application and will be in touch if it looks like a good fit. If you don&apos;t hear from us within a week, feel free to reach out at{' '}
        <a href="mailto:hello@sano.nz" className="text-sage-800 underline hover:text-sage-500">
          hello@sano.nz
        </a>
        .
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Verify tsc.**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`

Expected: clean.

- [ ] **Step 5: Commit.**

```bash
cd F:/Sano/01-Site && git add src/components/careers-apply/step-types/WelcomeStep.tsx src/components/careers-apply/step-types/InfoStep.tsx src/components/careers-apply/step-types/SuccessStep.tsx && git commit -m "feat(careers): add WelcomeStep, InfoStep, SuccessStep"
```

---

## Task 7: Input step-type components (TextStep, TextareaStep, DeclarationStep)

**Files:** create 3 files under `src/components/careers-apply/step-types/`.

- [ ] **Step 1: Create `TextStep.tsx`.**

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface TextStepProps {
  id: string
  question: string
  value: string
  onChange: (value: string) => void
  onNext: () => void
  inputType?: 'text' | 'tel' | 'email'
  placeholder?: string
  error?: string | null
}

export function TextStep({ id, question, value, onChange, onNext, inputType = 'text', placeholder, error }: TextStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [id])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onNext()
    }
  }

  const inputId = `step-${id}`

  return (
    <div>
      <label htmlFor={inputId} className="block text-2xl sm:text-3xl font-semibold text-sage-800 mb-6 leading-tight">
        {question}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete={
          inputType === 'email' ? 'email' :
          inputType === 'tel' ? 'tel' :
          'off'
        }
        className={`w-full rounded-xl border px-4 py-4 text-lg bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 ${
          error ? 'border-red-300' : 'border-sage-100'
        }`}
      />
      {error && <p className="mt-2 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create `TextareaStep.tsx`.**

```tsx
'use client'

interface TextareaStepProps {
  id: string
  question: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helper?: string
}

export function TextareaStep({ id, question, value, onChange, placeholder, helper }: TextareaStepProps) {
  const inputId = `step-${id}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-2xl sm:text-3xl font-semibold text-sage-800 mb-4 leading-tight">
        {question}
      </label>
      {helper && <p className="text-sm text-gray-500 mb-4">{helper}</p>}
      <textarea
        id={inputId}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-sage-100 px-4 py-4 text-base bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300 resize-none"
      />
    </div>
  )
}
```

- [ ] **Step 3: Create `DeclarationStep.tsx`.**

```tsx
'use client'

interface DeclarationStepProps {
  body: string
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string | null
}

export function DeclarationStep({ body, checked, onChange, error }: DeclarationStepProps) {
  return (
    <div>
      <h2 className="mb-6">One last thing.</h2>
      <label className="flex items-start gap-3 cursor-pointer bg-sage-50 border border-sage-100 rounded-2xl p-6">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-5 w-5 rounded border-sage-100 text-sage-800 focus:ring-sage-300"
        />
        <span className="text-base text-gray-700 leading-relaxed">{body}</span>
      </label>
      {error && <p className="mt-2 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Verify tsc and commit.**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`

Expected: clean.

```bash
cd F:/Sano/01-Site && git add src/components/careers-apply/step-types/TextStep.tsx src/components/careers-apply/step-types/TextareaStep.tsx src/components/careers-apply/step-types/DeclarationStep.tsx && git commit -m "feat(careers): add TextStep, TextareaStep, DeclarationStep"
```

---

## Task 8: Choice step-type components (YesNoStep, ChipSingleStep, ChipMultiStep)

**Files:** create 3 files under `src/components/careers-apply/step-types/`.

- [ ] **Step 1: Create `YesNoStep.tsx`.**

```tsx
'use client'

interface YesNoStepProps {
  id: string
  question: string
  value: boolean | null
  onChange: (v: boolean) => void
  error?: string | null
}

export function YesNoStep({ id, question, value, onChange, error }: YesNoStepProps) {
  const pill = (selected: boolean) =>
    `px-8 py-4 rounded-full border text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
      selected
        ? 'bg-sage-800 text-white border-sage-800'
        : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
    }`

  return (
    <div>
      <h2 id={`step-${id}-label`} className="mb-8">{question}</h2>
      <div role="radiogroup" aria-labelledby={`step-${id}-label`} className="flex gap-4">
        <button type="button" role="radio" aria-checked={value === true} onClick={() => onChange(true)} className={pill(value === true)}>
          Yes
        </button>
        <button type="button" role="radio" aria-checked={value === false} onClick={() => onChange(false)} className={pill(value === false)}>
          No
        </button>
      </div>
      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create `ChipSingleStep.tsx`.**

```tsx
'use client'

interface Option { value: string; label: string }

interface ChipSingleStepProps {
  id: string
  question: string
  options: Option[]
  value: string
  onChange: (v: string) => void
  error?: string | null
}

export function ChipSingleStep({ id, question, options, value, onChange, error }: ChipSingleStepProps) {
  return (
    <div>
      <h2 id={`step-${id}-label`} className="mb-8">{question}</h2>
      <div role="radiogroup" aria-labelledby={`step-${id}-label`} className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              className={`px-6 py-3 rounded-full border text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
                selected ? 'bg-sage-800 text-white border-sage-800' : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create `ChipMultiStep.tsx`.**

```tsx
'use client'

interface Option { value: string; label: string }

interface ChipMultiStepProps {
  id: string
  question: string
  helper?: string
  options: Option[]
  value: string[]
  onChange: (v: string[]) => void
  error?: string | null
}

export function ChipMultiStep({ id, question, helper, options, value, onChange, error }: ChipMultiStepProps) {
  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt))
    else onChange([...value, opt])
  }

  return (
    <div>
      <h2 className="mb-3" id={`step-${id}-label`}>{question}</h2>
      {helper && <p className="text-sm text-gray-500 mb-6">{helper}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`step-${id}-label`}>
        {options.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(opt.value)}
              className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
                selected ? 'bg-sage-800 text-white border-sage-800' : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Verify tsc and commit.**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`

Expected: clean.

```bash
cd F:/Sano/01-Site && git add src/components/careers-apply/step-types/YesNoStep.tsx src/components/careers-apply/step-types/ChipSingleStep.tsx src/components/careers-apply/step-types/ChipMultiStep.tsx && git commit -m "feat(careers): add YesNoStep, ChipSingleStep, ChipMultiStep"
```

---

## Task 9: ReviewStep

**Files:** create `src/components/careers-apply/step-types/ReviewStep.tsx`.

- [ ] **Step 1: Create the component.**

```tsx
'use client'

import type { ApplicationFormData, DayOfWeek, ExperienceType } from '@/types/application'

interface ReviewStepProps {
  data: ApplicationFormData
  status: 'idle' | 'submitting' | 'error'
  errorMessage?: string
  onSubmit: () => void
}

const EXPERIENCE_LABELS: Record<ExperienceType, string> = {
  residential: 'Residential cleaning',
  deep: 'Deep cleaning',
  end_of_tenancy: 'End of tenancy',
  commercial: 'Commercial',
  carpet_upholstery: 'Carpet & upholstery',
  windows: 'Window cleaning',
  post_construction: 'Post-construction',
  other: 'Other',
}

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

function yesNo(v: boolean | null): string {
  return v === true ? 'Yes' : v === false ? 'No' : '—'
}

function orDash(v: string): string {
  return v.trim() ? v : '—'
}

export function ReviewStep({ data, status, errorMessage, onSubmit }: ReviewStepProps) {
  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: `${data.first_name} ${data.last_name}`.trim() },
    { label: 'Phone', value: data.phone },
    { label: 'Email', value: data.email },
    { label: 'Suburb', value: data.suburb },
    { label: 'Role type', value: data.application_type === 'contractor' ? 'Contractor' : data.application_type === 'employee' ? 'Employee' : '—' },
    { label: 'Driver licence', value: yesNo(data.has_license) },
    { label: 'Vehicle', value: yesNo(data.has_vehicle) },
    { label: 'Can travel', value: yesNo(data.can_travel) },
    { label: 'Has experience', value: yesNo(data.has_experience) },
  ]

  if (data.has_experience) {
    rows.push({ label: 'Experience types', value: data.experience_types.map((t) => EXPERIENCE_LABELS[t]).join(', ') || '—' })
    rows.push({ label: 'Experience notes', value: orDash(data.experience_notes) })
  }

  rows.push({ label: 'Own equipment', value: yesNo(data.has_equipment) })
  rows.push({ label: 'Available days', value: data.available_days.map((d) => DAY_LABELS[d]).join(', ') || '—' })
  rows.push({ label: 'Preferred hours', value: orDash(data.preferred_hours) })
  rows.push({ label: 'Travel areas', value: orDash(data.travel_areas) })
  rows.push({ label: 'Independent work', value: yesNo(data.independent_work) })
  rows.push({ label: 'Right to work in NZ', value: yesNo(data.work_rights_nz) })

  if (data.application_type === 'contractor') {
    rows.push({ label: 'Public liability insurance', value: yesNo(data.has_insurance) })
    if (data.has_insurance === false) {
      rows.push({ label: 'Willing to arrange insurance', value: yesNo(data.willing_to_get_insurance) })
    }
  }

  rows.push({ label: 'Why Sano', value: orDash(data.why_join_sano) })

  return (
    <div>
      <h2 className="mb-6">Quick review.</h2>
      <p className="body-text mb-8">Have a look over your answers. Hit Back if you want to change anything.</p>

      <dl className="rounded-2xl border border-sage-100 bg-white divide-y divide-sage-100">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col sm:flex-row gap-2 sm:gap-6 py-4 px-5">
            <dt className="text-sm font-medium text-sage-600 sm:w-56 sm:flex-shrink-0">{row.label}</dt>
            <dd className="text-sm text-sage-800 whitespace-pre-wrap break-words">{row.value}</dd>
          </div>
        ))}
      </dl>

      {status === 'error' && (
        <p className="mt-6 text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
          {errorMessage || 'Something went wrong. Please try again.'}
        </p>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={status === 'submitting'}
        className="mt-8 w-full rounded-full bg-sage-800 px-6 py-4 font-medium text-white hover:bg-sage-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending…' : 'Submit application'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify tsc and commit.**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`

Expected: clean.

```bash
cd F:/Sano/01-Site && git add src/components/careers-apply/step-types/ReviewStep.tsx && git commit -m "feat(careers): add ReviewStep summary screen"
```

---

## Task 10: WizardProgress + WizardNav

**Files:** create 2 files under `src/components/careers-apply/`.

- [ ] **Step 1: Create `WizardProgress.tsx`.**

```tsx
'use client'

interface WizardProgressProps {
  current: number // 0-indexed
  total: number
}

export function WizardProgress({ current, total }: WizardProgressProps) {
  const pct = Math.min(100, Math.max(0, ((current + 1) / total) * 100))
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-sage-600">
          Step {current + 1} of {total}
        </span>
      </div>
      <div className="h-[3px] w-full bg-sage-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-sage-800 transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current + 1}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `WizardNav.tsx`.**

```tsx
'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'

interface WizardNavProps {
  onNext: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
  nextLabel?: string
  nextDisabled?: boolean
}

export function WizardNav({ onNext, onBack, isFirst, isLast, nextLabel, nextDisabled }: WizardNavProps) {
  return (
    <div className="flex items-center justify-between gap-4 mt-10">
      {!isFirst ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-sage-600 hover:text-sage-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </button>
      ) : <span />}
      {!isLast && (
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex items-center gap-2 rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {nextLabel ?? 'Next'}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify tsc and commit.**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`

Expected: clean.

```bash
cd F:/Sano/01-Site && git add src/components/careers-apply/WizardProgress.tsx src/components/careers-apply/WizardNav.tsx && git commit -m "feat(careers): add WizardProgress and WizardNav"
```

---

## Task 11: steps.config.ts + ApplicationWizard orchestrator + /apply route

This is the heart of the refactor. Single larger commit combining the config, orchestrator, and host page — they only make sense together.

**Files:**
- Create `src/components/careers-apply/steps.config.ts`
- Create `src/components/careers-apply/ApplicationWizard.tsx`
- Create `src/app/(public)/join-our-team/apply/page.tsx`

- [ ] **Step 1: Create `steps.config.ts`.**

```ts
import type { ApplicationFormData } from '@/types/application'

export type StepDef =
  | { id: string; type: 'welcome' }
  | { id: string; type: 'info'; title?: string | ((d: ApplicationFormData) => string); body: string | ((d: ApplicationFormData) => string); visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'text'; field: 'first_name' | 'last_name' | 'phone' | 'email' | 'suburb' | 'preferred_hours' | 'travel_areas'; question: string; inputType?: 'text' | 'tel' | 'email'; placeholder?: string; required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'textarea'; field: 'experience_notes' | 'why_join_sano'; question: string; placeholder?: string; helper?: string; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'yesno'; field: 'has_license' | 'has_vehicle' | 'can_travel' | 'has_experience' | 'has_equipment' | 'independent_work' | 'work_rights_nz' | 'has_insurance' | 'willing_to_get_insurance'; question: string | ((d: ApplicationFormData) => string); required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'chip-single'; field: 'application_type'; question: string; options: { value: string; label: string }[]; required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'chip-multi'; field: 'experience_types' | 'available_days'; question: string; helper?: string; options: { value: string; label: string }[]; minSelected?: number; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'declaration'; field: 'confirm_truth'; body: string }
  | { id: string; type: 'review' }
  | { id: string; type: 'success' }

const EXPERIENCE_OPTIONS = [
  { value: 'residential', label: 'Residential cleaning' },
  { value: 'deep', label: 'Deep cleaning' },
  { value: 'end_of_tenancy', label: 'End of tenancy' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'carpet_upholstery', label: 'Carpet & upholstery' },
  { value: 'windows', label: 'Window cleaning' },
  { value: 'post_construction', label: 'Post-construction' },
  { value: 'other', label: 'Other' },
]

const DAY_OPTIONS = [
  { value: 'mon', label: 'Mon' }, { value: 'tue', label: 'Tue' }, { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' }, { value: 'fri', label: 'Fri' }, { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const APPLICATION_TYPE_OPTIONS = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'employee', label: 'Employee' },
]

export const STEPS: StepDef[] = [
  { id: 'welcome', type: 'welcome' },

  { id: 'first_name', type: 'text', field: 'first_name', question: "What's your first name?", required: true },
  { id: 'last_name', type: 'text', field: 'last_name', question: 'And your last name?', required: true },

  { id: 'hello', type: 'info',
    title: (d) => `Nice to meet you, ${d.first_name.trim() || 'there'}.`,
    body: 'A few more quick questions and we\u2019ll have what we need.',
  },

  { id: 'phone', type: 'text', field: 'phone', inputType: 'tel', question: "What's the best number to reach you on?", required: true },
  { id: 'email', type: 'text', field: 'email', inputType: 'email', question: 'And an email address?', required: true },
  { id: 'suburb', type: 'text', field: 'suburb', question: 'Which suburb or area are you based in?', required: true },

  { id: 'application_type', type: 'chip-single', field: 'application_type',
    question: 'Are you looking for contractor or employee work?',
    options: APPLICATION_TYPE_OPTIONS, required: true,
  },

  { id: 'fit_intro', type: 'info',
    body: 'The next few questions help us understand fit, availability, and how you work.',
  },

  { id: 'has_license', type: 'yesno', field: 'has_license', question: 'Do you hold a current NZ driver licence?', required: true },
  { id: 'has_vehicle', type: 'yesno', field: 'has_vehicle', question: 'Do you have access to a vehicle for getting to jobs?', required: true },
  { id: 'can_travel', type: 'yesno', field: 'can_travel', question: 'Are you comfortable travelling to different job locations?', required: true },

  { id: 'has_experience', type: 'yesno', field: 'has_experience', question: 'Have you worked in cleaning before?', required: true },

  { id: 'experience_types', type: 'chip-multi', field: 'experience_types',
    question: 'What types of cleaning have you done?',
    helper: 'Select all that apply.',
    options: EXPERIENCE_OPTIONS, minSelected: 1,
    visible: (d) => d.has_experience === true,
  },
  { id: 'experience_notes', type: 'textarea', field: 'experience_notes',
    question: 'Tell us a bit about your experience.',
    helper: 'Optional \u2014 a sentence or two is plenty.',
  },

  { id: 'values', type: 'info',
    body: 'We work best with people who are reliable, detail-focused, and take pride in their work.',
  },

  { id: 'has_equipment', type: 'yesno', field: 'has_equipment',
    question: (d) =>
      d.application_type === 'contractor'
        ? 'Do you have your own cleaning equipment and products?'
        : 'Do you currently have cleaning equipment and products of your own?',
    required: true,
  },

  { id: 'available_days', type: 'chip-multi', field: 'available_days',
    question: 'Which days generally work for you?',
    helper: 'Tap the days you\u2019re usually available \u2014 optional.',
    options: DAY_OPTIONS,
  },
  { id: 'preferred_hours', type: 'text', field: 'preferred_hours',
    question: 'Any hours that work best?',
    placeholder: 'e.g. mornings, school hours',
  },
  { id: 'travel_areas', type: 'text', field: 'travel_areas',
    question: 'Which areas are you happy to work in?',
    placeholder: 'e.g. Central, North Shore, Eastern suburbs',
  },

  { id: 'independent_work', type: 'yesno', field: 'independent_work', question: 'Are you comfortable working independently when needed?', required: true },
  { id: 'work_rights_nz', type: 'yesno', field: 'work_rights_nz', question: 'Do you have the legal right to work in New Zealand?', required: true },

  { id: 'has_insurance', type: 'yesno', field: 'has_insurance',
    question: 'Do you currently hold public liability insurance?',
    visible: (d) => d.application_type === 'contractor',
  },
  { id: 'willing_to_get_insurance', type: 'yesno', field: 'willing_to_get_insurance',
    question: 'Would you be willing to arrange public liability insurance if required?',
    visible: (d) => d.application_type === 'contractor' && d.has_insurance === false,
  },

  { id: 'why_join_sano', type: 'textarea', field: 'why_join_sano',
    question: 'Why are you interested in working with Sano?',
    helper: 'Optional.',
  },

  { id: 'declaration', type: 'declaration', field: 'confirm_truth',
    body: 'I confirm the information I\u2019ve provided is true and accurate.',
  },

  { id: 'review', type: 'review' },
  { id: 'success', type: 'success' },
]
```

- [ ] **Step 2: Create `ApplicationWizard.tsx`.**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ApplicationFormData, JobApplicationPayload } from '@/types/application'
import { createEmptyApplicationForm, validateApplication } from '@/lib/applicationValidation'
import { stepValidators, type StepField } from '@/lib/applicationStepValidation'
import { STEPS, type StepDef } from './steps.config'
import { WizardProgress } from './WizardProgress'
import { WizardNav } from './WizardNav'
import { WelcomeStep } from './step-types/WelcomeStep'
import { InfoStep } from './step-types/InfoStep'
import { TextStep } from './step-types/TextStep'
import { TextareaStep } from './step-types/TextareaStep'
import { YesNoStep } from './step-types/YesNoStep'
import { ChipSingleStep } from './step-types/ChipSingleStep'
import { ChipMultiStep } from './step-types/ChipMultiStep'
import { DeclarationStep } from './step-types/DeclarationStep'
import { ReviewStep } from './step-types/ReviewStep'
import { SuccessStep } from './step-types/SuccessStep'

type Status = 'idle' | 'submitting' | 'success' | 'error'

function stepError(step: StepDef, data: ApplicationFormData): string | null {
  if ('field' in step && step.type !== 'declaration' && step.type !== 'review' && step.type !== 'success') {
    const field = step.field as StepField
    if (field in stepValidators) {
      const required = 'required' in step && step.required
      const minSelected = step.type === 'chip-multi' ? step.minSelected ?? 0 : 0
      if (required || minSelected > 0) {
        return stepValidators[field](data)
      }
    }
  }
  return null
}

export function ApplicationWizard() {
  const [form, setForm] = useState<ApplicationFormData>(createEmptyApplicationForm())
  const [stepIndex, setStepIndex] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showStepError, setShowStepError] = useState(false)

  const visibleSteps = useMemo(() => STEPS.filter((s) => !('visible' in s) || !s.visible || s.visible(form)), [form])
  const currentStep = visibleSteps[Math.min(stepIndex, visibleSteps.length - 1)]
  const total = visibleSteps.length
  const isFirst = stepIndex === 0
  const isLast = currentStep.type === 'success'

  function update<K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setShowStepError(false)
  }

  function goNext() {
    const err = stepError(currentStep, form)
    if (err) {
      setShowStepError(true)
      return
    }
    if (currentStep.type === 'review') return // review has its own submit button
    setShowStepError(false)
    setStepIndex((i) => Math.min(i + 1, visibleSteps.length - 1))
  }

  function goBack() {
    setShowStepError(false)
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  async function submit() {
    const errors = validateApplication(form)
    if (Object.keys(errors).length > 0) {
      setErrorMessage(Object.values(errors)[0] ?? 'Please check your answers.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    try {
      const payload: JobApplicationPayload = form
      const res = await fetch('/api/submit-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed')
      }
      setStatus('success')
      setStepIndex(visibleSteps.findIndex((s) => s.type === 'success'))
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const err = showStepError ? stepError(currentStep, form) : null

  return (
    <div className="min-h-[600px] flex flex-col">
      {currentStep.type !== 'success' && (
        <div className="mb-10 max-w-2xl mx-auto w-full">
          <WizardProgress current={stepIndex} total={total} />
        </div>
      )}

      <div className="flex-1 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep(currentStep, form, update, goNext, submit, status, errorMessage, err)}
          </motion.div>
        </AnimatePresence>

        {currentStep.type !== 'success' && currentStep.type !== 'review' && currentStep.type !== 'welcome' && (
          <WizardNav onNext={goNext} onBack={goBack} isFirst={isFirst} isLast={isLast} />
        )}

        {currentStep.type === 'welcome' && !isFirst && (
          <WizardNav onNext={goNext} onBack={goBack} isFirst={isFirst} isLast={isLast} />
        )}
      </div>
    </div>
  )
}

function renderStep(
  step: StepDef,
  form: ApplicationFormData,
  update: <K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) => void,
  goNext: () => void,
  submit: () => void,
  status: Status,
  errorMessage: string,
  err: string | null,
) {
  switch (step.type) {
    case 'welcome':
      return <WelcomeStep onNext={goNext} />
    case 'info':
      return <InfoStep data={form} title={step.title} body={step.body} />
    case 'text':
      return (
        <TextStep
          id={step.id}
          question={step.question}
          value={String(form[step.field] ?? '')}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          onNext={goNext}
          inputType={step.inputType}
          placeholder={step.placeholder}
          error={err}
        />
      )
    case 'textarea':
      return (
        <TextareaStep
          id={step.id}
          question={step.question}
          value={String(form[step.field] ?? '')}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          placeholder={step.placeholder}
          helper={step.helper}
        />
      )
    case 'yesno':
      return (
        <YesNoStep
          id={step.id}
          question={typeof step.question === 'function' ? step.question(form) : step.question}
          value={form[step.field] as boolean | null}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          error={err}
        />
      )
    case 'chip-single':
      return (
        <ChipSingleStep
          id={step.id}
          question={step.question}
          options={step.options}
          value={String(form[step.field] ?? '')}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          error={err}
        />
      )
    case 'chip-multi':
      return (
        <ChipMultiStep
          id={step.id}
          question={step.question}
          helper={step.helper}
          options={step.options}
          value={(form[step.field] as string[]) ?? []}
          onChange={(v) => update(step.field, v as ApplicationFormData[typeof step.field])}
          error={err}
        />
      )
    case 'declaration':
      return (
        <DeclarationStep
          body={step.body}
          checked={form.confirm_truth}
          onChange={(v) => update('confirm_truth', v)}
          error={err}
        />
      )
    case 'review':
      return <ReviewStep data={form} status={status === 'submitting' ? 'submitting' : status === 'error' ? 'error' : 'idle'} errorMessage={errorMessage} onSubmit={submit} />
    case 'success':
      return <SuccessStep />
    default:
      return null
  }
}
```

- [ ] **Step 3: Create `src/app/(public)/join-our-team/apply/page.tsx`.**

```tsx
import type { Metadata } from 'next'
import { ApplicationWizard } from '@/components/careers-apply/ApplicationWizard'

export const metadata: Metadata = {
  title: 'Apply | Sano Careers',
  description: 'Apply to join the Sano cleaning team.',
}

export default function ApplyPage() {
  return (
    <section className="section-padding section-y bg-[#faf9f6] min-h-[80vh]">
      <ApplicationWizard />
    </section>
  )
}
```

- [ ] **Step 4: Verify tsc.**

Run: `cd F:/Sano/01-Site && rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`

Expected: clean.

- [ ] **Step 5: Run full test suite.**

Run: `cd F:/Sano/01-Site && npm test`

Expected: careers tests (validation + API route) all green; pre-existing unrelated failures acceptable.

- [ ] **Step 6: Commit.**

```bash
cd F:/Sano/01-Site && git add src/components/careers-apply "src/app/(public)/join-our-team/apply" && git commit -m "feat(careers): add wizard orchestrator, steps config, and /apply route"
```

- [ ] **Step 7: PAUSE — Mike checkpoint.**

Wizard fully assembled. Browser-test before cleanup.

---

## Task 12: Browser smoke test

**Files:** none. This is a Mike checkpoint.

- [ ] **Step 1: Start dev server.**

```bash
cd F:/Sano/01-Site && rm -rf .next && npm run dev
```

- [ ] **Step 2: Mike walks the flows.**

At `http://localhost:3000/join-our-team`:
- [ ] Landing page renders: hero with Apply Now button, Why section, Process section, Contact section.
- [ ] No form appears on the landing page.
- [ ] Click Apply Now → navigates to `/join-our-team/apply`.

At `http://localhost:3000/join-our-team/apply`:
- [ ] Welcome step renders with "Let's start" button.
- [ ] Clicking through a **contractor** path: First → Last → "Nice to meet you, {first_name}." → Phone → Email → Suburb → Role (Contractor) → fit transition → driver/vehicle/travel → experience (Yes) → experience types → experience notes → values transition → equipment (contractor wording) → days → hours → areas → independent → right to work → insurance → (if No) willing → why → declaration → review (everything shown including insurance rows) → submit → success.
- [ ] Clicking through an **employee** path skips insurance steps; review has no insurance rows.
- [ ] Clicking through with "no experience": experience types step is skipped; review shows no experience types row.
- [ ] On a required-field step, Next without answer shows inline error below the question and the step does not advance.
- [ ] Declaration unchecked → Next blocked with error.
- [ ] Back button works on every non-first, non-success step.
- [ ] Progress bar advances per step and shows "Step N of M" with M being the correct total (26 employee / 28 contractor).
- [ ] Transitions between steps are subtle (200ms fade+slide).
- [ ] On a successful submit, the dev server terminal prints a log line `[job-application] received { first_name: ..., last_name: ..., email: ..., suburb: ..., application_type: ... }` with only those five fields.

If anything fails, note it and I'll dispatch a fix. Otherwise: "all green" = done.

---

## Task 13: Final verification + PR handoff

- [ ] **Step 1: `npx tsc --noEmit`** — clean (removing `tsconfig.tsbuildinfo` first if stale).
- [ ] **Step 2: `npm test`** — careers suites green; pre-existing unrelated failures noted but not blocked.
- [ ] **Step 3: `npm run lint`** — no new warnings or errors on careers files.
- [ ] **Step 4: `git status --short`** — clean (no uncommitted changes).
- [ ] **Step 5: PAUSE — Mike decides branch strategy for PR.**
  - Option A: push `feat/join-our-team` directly, open PR from it (includes 4 unrelated commits).
  - Option B: cherry-pick only the careers commits onto a fresh branch cut from `main`, open the PR from there. Commands:
    ```bash
    git log --oneline main..feat/join-our-team | grep careers | awk '{print $1}' | tac > /tmp/careers-shas.txt
    git checkout -b feat/careers-clean main
    xargs -a /tmp/careers-shas.txt git cherry-pick
    ```
  - Option B produces a clean diff. Mike to confirm before running.
- [ ] **Step 6: `gh pr create`** (after Mike confirms branch).

---

## Success criteria (end state)

- `/join-our-team` shows a landing page with no form; Apply Now button links to `/join-our-team/apply`.
- `/join-our-team/apply` renders the wizard and walks a valid applicant from Welcome to Success.
- Contractor vs Employee path correctly shows/hides insurance steps.
- Experience types step shown only after a Yes.
- Required fields gate Next; server also re-validates on final submit.
- Success log line on Netlify shows exactly five redacted fields.
- All careers tests green. Pre-existing unrelated test failures remain but are not introduced by this work.
- `JobApplicationForm.tsx` retired to `_retired/` subfolder (not deleted).
- Footer retains the Join Our Team link. Header unchanged.
