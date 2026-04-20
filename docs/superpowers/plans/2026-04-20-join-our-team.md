# Join Our Team Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/join-our-team` — a public careers page with a grouped application form that POSTs to a stub API route and swaps to a success card on success.

**Architecture:** Single Next.js App Router page under `src/app/(public)/join-our-team/` composes five section components. The form is one client component (`JobApplicationForm.tsx`) with inline fieldsets, no sub-components. A shared `validateApplication()` function in `src/lib/` is imported by both the client form and the API route so the rules live in one place. The API route logs four redacted fields and returns `{ ok: true }` — Supabase/Resend hookup is deferred.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind (existing sage palette), lucide-react icons, Jest + ts-jest for tests. No new dependencies.

**Spec reference:** `docs/superpowers/specs/2026-04-20-join-our-team-design.md`

---

## File Structure

| Path | New/Modify | Responsibility |
|------|-----------|----------------|
| `src/types/application.ts` | New | `ApplicationFormData`, `ApplicationFormErrors`, `JobApplicationPayload`, supporting enums |
| `src/lib/applicationValidation.ts` | New | Pure `validateApplication(data)` — shared by client and server |
| `src/__tests__/lib/applicationValidation.test.ts` | New | Unit tests for validation rules |
| `src/app/api/submit-application/route.ts` | New | POST handler — stub, logs redacted preview |
| `src/__tests__/api/submit-application.test.ts` | New | API route tests (jsdom→node) |
| `src/components/JobApplicationForm.tsx` | New | Client form, inline sections, pills, chips, submit flow |
| `src/components/CareersHero.tsx` | New | Two-column hero with placeholder block |
| `src/components/WhyWorkWithSano.tsx` | New | 3 benefit cards |
| `src/components/CareersProcess.tsx` | New | 5-step row |
| `src/components/CareersContact.tsx` | New | "Have a question?" block |
| `src/app/(public)/join-our-team/page.tsx` | New | Server component, composes sections, metadata |
| `src/components/Footer.tsx` | Modify | Add "Join Our Team" link to Company column |

---

## Mike Checkpoints

Pause and ask Mike to eyeball before proceeding past:
- **After Task 3** — API route + validation locked in (critical contract)
- **After Task 5** — Form component first draft (biggest file; worth a visual sanity check in browser)
- **After Task 12** — Final browser walkthrough before cleanup/commit polish

---

## Task 1: Types (`src/types/application.ts`)

**Files:**
- Create: `src/types/application.ts`

- [ ] **Step 1: Create the types file**

```ts
// src/types/application.ts

export type ApplicationType = 'contractor' | 'casual' | 'either'

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
  full_name: string
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
  equipment_notes: string

  // Availability
  available_days: DayOfWeek[]
  preferred_hours: string
  travel_areas: string

  // Additional questions
  work_preferences: string
  independent_work: boolean | null
  why_join_sano: string

  // Compliance
  work_rights_nz: boolean | null
  has_insurance: boolean | null
  willing_to_get_insurance: boolean | null

  // Declaration
  confirm_truth: boolean
}

export type ApplicationFormErrors = Partial<Record<keyof ApplicationFormData, string>>

export type JobApplicationPayload = ApplicationFormData
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`
Expected: PASS (no errors from the new file)

- [ ] **Step 3: Commit**

```bash
cd F:/Sano/01-Site && git add src/types/application.ts && git commit -m "feat(careers): add ApplicationFormData and payload types"
```

---

## Task 2: Shared validation module

**Files:**
- Create: `src/lib/applicationValidation.ts`
- Create: `src/__tests__/lib/applicationValidation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/applicationValidation.test.ts`:

```ts
import { validateApplication, createEmptyApplicationForm } from '@/lib/applicationValidation'
import type { ApplicationFormData } from '@/types/application'

function valid(): ApplicationFormData {
  return {
    full_name: 'Jane Doe',
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
    equipment_notes: '',
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    work_preferences: '',
    independent_work: true,
    why_join_sano: '',
    work_rights_nz: true,
    has_insurance: null,
    willing_to_get_insurance: null,
    confirm_truth: true,
  }
}

describe('validateApplication', () => {
  it('returns no errors for a complete valid form', () => {
    expect(validateApplication(valid())).toEqual({})
  })

  it('requires full_name', () => {
    const data = { ...valid(), full_name: '   ' }
    expect(validateApplication(data).full_name).toBeDefined()
  })

  it('requires phone (presence only, no format check)', () => {
    const missing = validateApplication({ ...valid(), phone: '' })
    expect(missing.phone).toBeDefined()
    const anyFormat = validateApplication({ ...valid(), phone: '12345' })
    expect(anyFormat.phone).toBeUndefined()
  })

  it('requires a valid email format', () => {
    expect(validateApplication({ ...valid(), email: '' }).email).toBeDefined()
    expect(validateApplication({ ...valid(), email: 'not-an-email' }).email).toBeDefined()
  })

  it('requires suburb', () => {
    expect(validateApplication({ ...valid(), suburb: '' }).suburb).toBeDefined()
  })

  it('requires application_type', () => {
    expect(validateApplication({ ...valid(), application_type: '' }).application_type).toBeDefined()
  })

  it('requires has_license/has_vehicle/can_travel to be non-null', () => {
    expect(validateApplication({ ...valid(), has_license: null }).has_license).toBeDefined()
    expect(validateApplication({ ...valid(), has_vehicle: null }).has_vehicle).toBeDefined()
    expect(validateApplication({ ...valid(), can_travel: null }).can_travel).toBeDefined()
  })

  it('requires has_experience/has_equipment/independent_work to be non-null', () => {
    expect(validateApplication({ ...valid(), has_experience: null }).has_experience).toBeDefined()
    expect(validateApplication({ ...valid(), has_equipment: null }).has_equipment).toBeDefined()
    expect(validateApplication({ ...valid(), independent_work: null }).independent_work).toBeDefined()
  })

  it('requires work_rights_nz', () => {
    expect(validateApplication({ ...valid(), work_rights_nz: null }).work_rights_nz).toBeDefined()
  })

  it('does NOT require has_insurance or willing_to_get_insurance', () => {
    const errors = validateApplication({ ...valid(), has_insurance: null, willing_to_get_insurance: null })
    expect(errors.has_insurance).toBeUndefined()
    expect(errors.willing_to_get_insurance).toBeUndefined()
  })

  it('requires confirm_truth to be true', () => {
    expect(validateApplication({ ...valid(), confirm_truth: false }).confirm_truth).toBeDefined()
  })

  it('requires at least one experience_type when has_experience is true', () => {
    const errors = validateApplication({ ...valid(), has_experience: true, experience_types: [] })
    expect(errors.experience_types).toBeDefined()
  })

  it('does not require experience_types when has_experience is false', () => {
    const errors = validateApplication({ ...valid(), has_experience: false, experience_types: [] })
    expect(errors.experience_types).toBeUndefined()
  })

  it('createEmptyApplicationForm returns a form that fails validation', () => {
    const empty = createEmptyApplicationForm()
    expect(Object.keys(validateApplication(empty)).length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd F:/Sano/01-Site && npm test -- applicationValidation`
Expected: FAIL with `Cannot find module '@/lib/applicationValidation'`

- [ ] **Step 3: Implement the validation module**

Create `src/lib/applicationValidation.ts`:

```ts
import type { ApplicationFormData, ApplicationFormErrors } from '@/types/application'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function createEmptyApplicationForm(): ApplicationFormData {
  return {
    full_name: '',
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
    equipment_notes: '',
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    work_preferences: '',
    independent_work: null,
    why_join_sano: '',
    work_rights_nz: null,
    has_insurance: null,
    willing_to_get_insurance: null,
    confirm_truth: false,
  }
}

export function validateApplication(data: ApplicationFormData): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {}

  if (!data.full_name.trim()) errors.full_name = 'Your full name is required'
  if (!data.phone.trim()) errors.phone = 'Phone is required'
  if (!data.email.trim() || !EMAIL_RE.test(data.email)) errors.email = 'A valid email is required'
  if (!data.suburb.trim()) errors.suburb = 'Suburb is required'

  if (!data.application_type) errors.application_type = 'Please choose one'

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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd F:/Sano/01-Site && npm test -- applicationValidation`
Expected: PASS — all 13 tests green

- [ ] **Step 5: Commit**

```bash
cd F:/Sano/01-Site && git add src/lib/applicationValidation.ts src/__tests__/lib/applicationValidation.test.ts && git commit -m "feat(careers): add shared application validation with tests"
```

---

## Task 3: API route `/api/submit-application`

**Files:**
- Create: `src/app/api/submit-application/route.ts`
- Create: `src/__tests__/api/submit-application.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/api/submit-application.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { POST } from '@/app/api/submit-application/route'
import { NextRequest } from 'next/server'
import type { JobApplicationPayload } from '@/types/application'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/submit-application', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validBody(): JobApplicationPayload {
  return {
    full_name: 'Jane Doe',
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
    equipment_notes: '',
    available_days: [],
    preferred_hours: '',
    travel_areas: '',
    work_preferences: '',
    independent_work: true,
    why_join_sano: '',
    work_rights_nz: true,
    has_insurance: null,
    willing_to_get_insurance: null,
    confirm_truth: true,
  }
}

describe('POST /api/submit-application', () => {
  const originalLog = console.log
  beforeEach(() => {
    console.log = jest.fn()
  })
  afterEach(() => {
    console.log = originalLog
  })

  it('returns 200 and { ok: true } for a valid payload', async () => {
    const res = await POST(makeRequest(validBody()))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('logs only the four redacted fields on success', async () => {
    await POST(makeRequest(validBody()))
    expect(console.log).toHaveBeenCalledWith(
      '[job-application] received',
      expect.objectContaining({
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        suburb: 'Mount Eden',
        application_type: 'contractor',
      }),
    )
    const call = (console.log as jest.Mock).mock.calls[0][1]
    expect(Object.keys(call).sort()).toEqual(
      ['application_type', 'email', 'full_name', 'suburb'].sort(),
    )
  })

  it('returns 400 when full_name is missing', async () => {
    const res = await POST(makeRequest({ ...validBody(), full_name: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when email is invalid', async () => {
    const res = await POST(makeRequest({ ...validBody(), email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when confirm_truth is false', async () => {
    const res = await POST(makeRequest({ ...validBody(), confirm_truth: false }))
    expect(res.status).toBe(400)
  })

  it('returns 200 when insurance booleans are null (insurance is optional)', async () => {
    const res = await POST(makeRequest({ ...validBody(), has_insurance: null, willing_to_get_insurance: null }))
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd F:/Sano/01-Site && npm test -- submit-application`
Expected: FAIL with `Cannot find module '@/app/api/submit-application/route'`

- [ ] **Step 3: Implement the route**

Create `src/app/api/submit-application/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { validateApplication } from '@/lib/applicationValidation'
import type { JobApplicationPayload } from '@/types/application'

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as JobApplicationPayload

    const errors = validateApplication(payload)
    const errorKeys = Object.keys(errors)
    if (errorKeys.length > 0) {
      return NextResponse.json(
        { error: errors[errorKeys[0] as keyof typeof errors] ?? 'Invalid submission' },
        { status: 400 },
      )
    }

    console.log('[job-application] received', {
      full_name: payload.full_name,
      email: payload.email,
      suburb: payload.suburb,
      application_type: payload.application_type,
    })

    // TODO(later): insert into job_applications (Supabase), send Resend thank-you, notify SANO_NOTIFY_EMAIL.

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[job-application] error', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd F:/Sano/01-Site && npm test -- submit-application`
Expected: PASS — all 6 tests green

- [ ] **Step 5: Commit**

```bash
cd F:/Sano/01-Site && git add src/app/api/submit-application/route.ts src/__tests__/api/submit-application.test.ts && git commit -m "feat(careers): add /api/submit-application stub with tests"
```

- [ ] **Step 6: PAUSE — Mike checkpoint**

Contract is locked here. Ask Mike to confirm the API route + validation shape before touching the form.

---

## Task 4: Footer link addition

**Files:**
- Modify: `src/components/Footer.tsx` (Company column array, ~lines 35-45)

Doing this early so the page is reachable from navigation the moment the route exists.

- [ ] **Step 1: Update the Company column array**

In `src/components/Footer.tsx`, replace the three-entry Company array:

```tsx
{[
  { href: '/about', label: 'About Sano' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact Us' },
].map((link) => (
```

With the four-entry version (Join Our Team between FAQ and Contact Us):

```tsx
{[
  { href: '/about', label: 'About Sano' },
  { href: '/faq', label: 'FAQ' },
  { href: '/join-our-team', label: 'Join Our Team' },
  { href: '/contact', label: 'Contact Us' },
].map((link) => (
```

- [ ] **Step 2: Verify the build still passes**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd F:/Sano/01-Site && git add src/components/Footer.tsx && git commit -m "feat(footer): add Join Our Team link to Company column"
```

---

## Task 5: `JobApplicationForm.tsx` — the full form

**Files:**
- Create: `src/components/JobApplicationForm.tsx`

This is the biggest file (~500 lines). Inline yes/no pill and chip components live at the top of the file; sections render inline via fieldsets. Validation imports the shared function from Task 2.

- [ ] **Step 1: Create the component with helpers and scaffolding**

Create `src/components/JobApplicationForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type {
  ApplicationFormData,
  ApplicationFormErrors,
  ApplicationType,
  DayOfWeek,
  ExperienceType,
} from '@/types/application'
import { validateApplication, createEmptyApplicationForm } from '@/lib/applicationValidation'

// ---------- Shared styling constants ----------

const inputBase =
  'w-full rounded-xl border px-4 py-3 text-sm bg-sage-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-300'
const inputOk = 'border-sage-100'
const inputErr = 'border-red-300'
const labelBase = 'block text-sm font-medium text-gray-700 mb-1.5'
const cardBase = 'rounded-2xl border border-sage-100 bg-white p-6 sm:p-8'
const sectionTitle = 'text-lg font-semibold text-sage-800'
const helper = 'text-xs text-gray-500 mt-1'

// ---------- Inline helpers: yes/no pills, chip multi-select ----------

function YesNoPills({
  name,
  value,
  onChange,
  error,
}: {
  name: string
  value: boolean | null
  onChange: (v: boolean) => void
  error?: string
}) {
  const pill = (selected: boolean) =>
    `px-5 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
      selected
        ? 'bg-sage-800 text-white border-sage-800'
        : error
        ? 'bg-white border-red-300 text-gray-700 hover:border-sage-300'
        : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
    }`

  return (
    <div role="radiogroup" aria-labelledby={`${name}-label`} className="flex gap-3">
      <button
        type="button"
        role="radio"
        aria-checked={value === true}
        onClick={() => onChange(true)}
        className={pill(value === true)}
      >
        Yes
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === false}
        onClick={() => onChange(false)}
        className={pill(value === false)}
      >
        No
      </button>
    </div>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sage-300 ${
        selected
          ? 'bg-sage-800 text-white border-sage-800'
          : 'bg-white border-sage-100 text-gray-700 hover:border-sage-300'
      }`}
    >
      {children}
    </button>
  )
}

// ---------- Data: multi-select options ----------

const EXPERIENCE_OPTIONS: { value: ExperienceType; label: string }[] = [
  { value: 'residential', label: 'Residential cleaning' },
  { value: 'deep', label: 'Deep cleaning' },
  { value: 'end_of_tenancy', label: 'End of tenancy' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'carpet_upholstery', label: 'Carpet & upholstery' },
  { value: 'windows', label: 'Window cleaning' },
  { value: 'post_construction', label: 'Post-construction' },
  { value: 'other', label: 'Other' },
]

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const APPLICATION_TYPE_OPTIONS: { value: ApplicationType; label: string }[] = [
  { value: 'contractor', label: 'Contractor' },
  { value: 'casual', label: 'Casual' },
  { value: 'either', label: 'Either' },
]

// ---------- Main component ----------

export function JobApplicationForm() {
  const [form, setForm] = useState<ApplicationFormData>(createEmptyApplicationForm())
  const [errors, setErrors] = useState<ApplicationFormErrors>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function update<K extends keyof ApplicationFormData>(key: K, value: ApplicationFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  function toggleArrayMember<T>(arr: T[], value: T): T[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validateApplication(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      // Scroll to first error
      const firstKey = Object.keys(validationErrors)[0]
      const el = document.querySelector(`[data-field="${firstKey}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setStatus('loading')
    try {
      const res = await fetch('/api/submit-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed')
      }
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  // ---------- Success card ----------

  if (status === 'success') {
    return (
      <div role="status" className="bg-sage-50 border border-sage-100 rounded-2xl p-8 text-center">
        <p className="text-4xl mb-4" aria-hidden="true">✓</p>
        <h3 className="text-sage-800 text-xl font-semibold mb-3">Thanks — application received</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          We&apos;ve received your application and will be in touch if it looks like a good fit. If you don&apos;t hear from us within a week, feel free to reach out at{' '}
          <a href="mailto:hello@sano.nz" className="text-sage-800 underline hover:text-sage-500">
            hello@sano.nz
          </a>
          .
        </p>
      </div>
    )
  }

  // ---------- Form ----------

  const err = (k: keyof ApplicationFormErrors) =>
    errors[k] ? (
      <p className="mt-1 text-xs text-red-500" role="alert">
        {errors[k]}
      </p>
    ) : null

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* SECTION: Personal details */}
      <fieldset className={cardBase} data-field="full_name">
        <legend className={sectionTitle}>Personal details</legend>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="full_name" className={labelBase}>Full name *</label>
            <input
              id="full_name"
              type="text"
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              className={`${inputBase} ${errors.full_name ? inputErr : inputOk}`}
            />
            {err('full_name')}
          </div>
          <div>
            <label htmlFor="phone" className={labelBase}>Phone *</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className={`${inputBase} ${errors.phone ? inputErr : inputOk}`}
            />
            {err('phone')}
          </div>
          <div>
            <label htmlFor="email" className={labelBase}>Email *</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={`${inputBase} ${errors.email ? inputErr : inputOk}`}
            />
            {err('email')}
          </div>
          <div>
            <label htmlFor="suburb" className={labelBase}>Suburb *</label>
            <input
              id="suburb"
              type="text"
              autoComplete="address-level2"
              value={form.suburb}
              onChange={(e) => update('suburb', e.target.value)}
              className={`${inputBase} ${errors.suburb ? inputErr : inputOk}`}
            />
            {err('suburb')}
          </div>
        </div>
      </fieldset>

      {/* SECTION: Role type */}
      <fieldset className={cardBase} data-field="application_type">
        <legend className={sectionTitle}>Role type</legend>
        <p className="mt-2 text-sm text-gray-600">Which type of work are you looking for? *</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {APPLICATION_TYPE_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              selected={form.application_type === opt.value}
              onClick={() => update('application_type', opt.value)}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
        {err('application_type')}
      </fieldset>

      {/* SECTION: Licence & transport */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Licence & transport</legend>
        <div className="mt-5 space-y-5">
          <div data-field="has_license">
            <p id="has_license-label" className={labelBase}>Do you have a driver&apos;s licence? *</p>
            <YesNoPills name="has_license" value={form.has_license} onChange={(v) => update('has_license', v)} error={errors.has_license} />
            {err('has_license')}
          </div>
          <div data-field="has_vehicle">
            <p id="has_vehicle-label" className={labelBase}>Do you have your own vehicle? *</p>
            <YesNoPills name="has_vehicle" value={form.has_vehicle} onChange={(v) => update('has_vehicle', v)} error={errors.has_vehicle} />
            {err('has_vehicle')}
          </div>
          <div data-field="can_travel">
            <p id="can_travel-label" className={labelBase}>Are you able to travel to different jobs? *</p>
            <YesNoPills name="can_travel" value={form.can_travel} onChange={(v) => update('can_travel', v)} error={errors.can_travel} />
            {err('can_travel')}
          </div>
        </div>
      </fieldset>

      {/* SECTION: Experience */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Experience</legend>
        <div className="mt-5 space-y-5">
          <div data-field="has_experience">
            <p id="has_experience-label" className={labelBase}>Do you have cleaning experience? *</p>
            <YesNoPills name="has_experience" value={form.has_experience} onChange={(v) => update('has_experience', v)} error={errors.has_experience} />
            {err('has_experience')}
          </div>
          {form.has_experience === true && (
            <div data-field="experience_types">
              <p className={labelBase}>What types? *</p>
              <p className={helper}>Select all that apply.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    selected={form.experience_types.includes(opt.value)}
                    onClick={() => update('experience_types', toggleArrayMember(form.experience_types, opt.value))}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </div>
              {err('experience_types')}
            </div>
          )}
          <div>
            <label htmlFor="experience_notes" className={labelBase}>Anything else about your experience?</label>
            <textarea
              id="experience_notes"
              rows={3}
              value={form.experience_notes}
              onChange={(e) => update('experience_notes', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Equipment */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Equipment</legend>
        <div className="mt-5 space-y-5">
          <div data-field="has_equipment">
            <p id="has_equipment-label" className={labelBase}>Do you have your own cleaning equipment? *</p>
            <YesNoPills name="has_equipment" value={form.has_equipment} onChange={(v) => update('has_equipment', v)} error={errors.has_equipment} />
            {err('has_equipment')}
          </div>
          <div>
            <label htmlFor="equipment_notes" className={labelBase}>Notes about your equipment</label>
            <textarea
              id="equipment_notes"
              rows={3}
              value={form.equipment_notes}
              onChange={(e) => update('equipment_notes', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Availability */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Availability</legend>
        <div className="mt-5 space-y-5">
          <div>
            <p className={labelBase}>Which days are you generally available?</p>
            <p className={helper}>Tap the days you&apos;re generally available.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={form.available_days.includes(opt.value)}
                  onClick={() => update('available_days', toggleArrayMember(form.available_days, opt.value))}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="preferred_hours" className={labelBase}>Preferred hours</label>
              <input
                id="preferred_hours"
                type="text"
                placeholder="e.g. mornings, school hours"
                value={form.preferred_hours}
                onChange={(e) => update('preferred_hours', e.target.value)}
                className={`${inputBase} ${inputOk}`}
              />
            </div>
            <div>
              <label htmlFor="travel_areas" className={labelBase}>Areas you can travel to</label>
              <input
                id="travel_areas"
                type="text"
                placeholder="e.g. Central, North Shore"
                value={form.travel_areas}
                onChange={(e) => update('travel_areas', e.target.value)}
                className={`${inputBase} ${inputOk}`}
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* SECTION: Additional questions */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Additional questions</legend>
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="work_preferences" className={labelBase}>Any work preferences or restrictions?</label>
            <textarea
              id="work_preferences"
              rows={3}
              value={form.work_preferences}
              onChange={(e) => update('work_preferences', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
          <div data-field="independent_work">
            <p id="independent_work-label" className={labelBase}>Are you comfortable working independently? *</p>
            <YesNoPills name="independent_work" value={form.independent_work} onChange={(v) => update('independent_work', v)} error={errors.independent_work} />
            {err('independent_work')}
          </div>
          <div>
            <label htmlFor="why_join_sano" className={labelBase}>Why do you want to join Sano?</label>
            <textarea
              id="why_join_sano"
              rows={3}
              value={form.why_join_sano}
              onChange={(e) => update('why_join_sano', e.target.value)}
              className={`${inputBase} ${inputOk} resize-none`}
            />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Compliance */}
      <fieldset className={cardBase}>
        <legend className={sectionTitle}>Compliance</legend>
        <div className="mt-5 space-y-5">
          <div data-field="work_rights_nz">
            <p id="work_rights_nz-label" className={labelBase}>Do you have the right to work in New Zealand? *</p>
            <YesNoPills name="work_rights_nz" value={form.work_rights_nz} onChange={(v) => update('work_rights_nz', v)} error={errors.work_rights_nz} />
            {err('work_rights_nz')}
          </div>
          <div>
            <p id="has_insurance-label" className={labelBase}>Do you currently have public liability insurance?</p>
            <YesNoPills name="has_insurance" value={form.has_insurance} onChange={(v) => update('has_insurance', v)} />
          </div>
          <div>
            <p id="willing_to_get_insurance-label" className={labelBase}>If needed, would you be willing to get insured?</p>
            <YesNoPills name="willing_to_get_insurance" value={form.willing_to_get_insurance} onChange={(v) => update('willing_to_get_insurance', v)} />
          </div>
        </div>
      </fieldset>

      {/* SECTION: Declaration */}
      <fieldset className={cardBase} data-field="confirm_truth">
        <legend className={sectionTitle}>Declaration</legend>
        <label className="mt-5 flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.confirm_truth}
            onChange={(e) => update('confirm_truth', e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-sage-100 text-sage-800 focus:ring-sage-300"
          />
          <span className="text-sm text-gray-700 leading-relaxed">
            I confirm the information I&apos;ve provided is true and accurate. *
          </span>
        </label>
        {err('confirm_truth')}
      </fieldset>

      {/* Error banner */}
      {status === 'error' && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
          {errorMessage}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full rounded-full bg-sage-800 px-6 py-4 font-medium text-white hover:bg-sage-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'loading' ? 'Sending…' : 'Apply Now'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run all tests to make sure nothing regressed**

Run: `cd F:/Sano/01-Site && npm test`
Expected: PASS — all prior tests still green (form has no tests yet; browser smoke test comes in Task 12)

- [ ] **Step 4: Commit**

```bash
cd F:/Sano/01-Site && git add src/components/JobApplicationForm.tsx && git commit -m "feat(careers): add JobApplicationForm with all sections and submit flow"
```

- [ ] **Step 5: PAUSE — Mike checkpoint**

Form is a big file — good to have Mike eyeball the component once it's visible in the browser (which happens in Task 12). Flag this task as "ready for visual check later" but proceed.

---

## Task 6: `CareersHero.tsx`

**Files:**
- Create: `src/components/CareersHero.tsx`

- [ ] **Step 1: Create the hero component**

```tsx
import { Users } from 'lucide-react'

export function CareersHero() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div>
            <p className="eyebrow mb-4">Careers</p>
            <h1 className="mb-6">Join Our Team</h1>
            <p className="body-text max-w-xl">
              We&apos;re always looking for reliable, detail-focused people who take pride in their work. If you have cleaning experience and want flexible opportunities with a growing team, we&apos;d love to hear from you.
            </p>
          </div>

          {/* Placeholder block (swap for <Image> later — same wrapper, same classes) */}
          <div className="relative rounded-2xl ring-1 ring-sage-100/60 shadow-sm overflow-hidden aspect-video lg:aspect-[4/5] bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center">
            <Users className="w-16 h-16 text-sage-500/40" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd F:/Sano/01-Site && git add src/components/CareersHero.tsx && git commit -m "feat(careers): add CareersHero with placeholder block"
```

---

## Task 7: `WhyWorkWithSano.tsx`

**Files:**
- Create: `src/components/WhyWorkWithSano.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Clock3, TrendingUp, Users } from 'lucide-react'
import type React from 'react'

interface Benefit {
  icon: React.ReactNode
  title: string
  body: string
}

const BENEFITS: Benefit[] = [
  {
    icon: <Clock3 className="w-6 h-6" />,
    title: 'Flexible Work',
    body: 'Choose work that suits your schedule. We offer flexible opportunities across different types of cleaning jobs.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Supportive Team',
    body: 'We keep things straightforward and back our team. Clear communication and support matter to us.',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Consistent Opportunities',
    body: "We're growing and have regular work available. We're looking for people we can rely on long term.",
  },
]

export function WhyWorkWithSano() {
  return (
    <section className="section-padding section-y bg-[#faf9f6]">
      <div className="container-max">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2>Why work with Sano</h2>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-3 gap-6">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-sage-100 bg-white p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
                {b.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-sage-800">{b.title}</h3>
              <p className="text-sm leading-relaxed text-sage-600">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd F:/Sano/01-Site && git add src/components/WhyWorkWithSano.tsx && git commit -m "feat(careers): add WhyWorkWithSano 3-card section"
```

---

## Task 8: `CareersProcess.tsx`

**Files:**
- Create: `src/components/CareersProcess.tsx`

- [ ] **Step 1: Create the component**

```tsx
const STEPS = ['Apply', 'Review', 'Contact', 'Trial', 'Get started']

export function CareersProcess() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2>How it works</h2>
        </div>

        {/* Desktop: horizontal row with connector line */}
        <div className="relative mx-auto hidden max-w-4xl md:block">
          <div
            aria-hidden="true"
            className="absolute left-[10%] top-5 h-px w-[80%] bg-sage-100"
          />
          <div className="relative grid grid-cols-5 gap-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-sage-100 text-sage-600 text-sm font-semibold ring-4 ring-white">
                  {i + 1}
                </div>
                <p className="mt-3 text-sm font-medium text-sage-800">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical stack */}
        <ol className="mx-auto max-w-sm space-y-5 md:hidden">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-sage-100 text-sage-600 text-sm font-semibold">
                {i + 1}
              </div>
              <p className="text-sm font-medium text-sage-800">{label}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd F:/Sano/01-Site && git add src/components/CareersProcess.tsx && git commit -m "feat(careers): add CareersProcess 5-step row"
```

---

## Task 9: `CareersContact.tsx`

**Files:**
- Create: `src/components/CareersContact.tsx`

- [ ] **Step 1: Create the component**

```tsx
export function CareersContact() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4">Have a question?</h2>
          <p className="body-text mb-8">
            If you&apos;re unsure about anything or want to check if this is the right fit, feel free to get in touch.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="tel:0800726686"
              className="inline-flex items-center justify-center rounded-full bg-sage-800 px-6 py-3 text-sm font-medium text-white hover:bg-sage-500 transition-colors"
            >
              0800 726 686
            </a>
            <a
              href="mailto:hello@sano.nz"
              className="inline-flex items-center justify-center rounded-full border border-sage-800 px-6 py-3 text-sm font-medium text-sage-800 hover:bg-sage-50 transition-colors"
            >
              hello@sano.nz
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd F:/Sano/01-Site && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd F:/Sano/01-Site && git add src/components/CareersContact.tsx && git commit -m "feat(careers): add CareersContact section"
```

---

## Task 10: Page composition + metadata

**Files:**
- Create: `src/app/(public)/join-our-team/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import type { Metadata } from 'next'
import { CareersHero } from '@/components/CareersHero'
import { WhyWorkWithSano } from '@/components/WhyWorkWithSano'
import { CareersProcess } from '@/components/CareersProcess'
import { JobApplicationForm } from '@/components/JobApplicationForm'
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
      <section className="section-padding section-y bg-[#faf9f6]">
        <div className="mx-auto max-w-3xl">
          <JobApplicationForm />
        </div>
      </section>
      <CareersContact />
    </>
  )
}
```

- [ ] **Step 2: Verify the full build passes**

Run: `cd F:/Sano/01-Site && npm run build`
Expected: PASS — build succeeds, `/join-our-team` listed in the route output

- [ ] **Step 3: Commit**

```bash
cd F:/Sano/01-Site && git add "src/app/(public)/join-our-team/page.tsx" && git commit -m "feat(careers): add /join-our-team page composition"
```

---

## Task 11: Lint pass

**Files:**
- Modify: any file flagged by the linter

- [ ] **Step 1: Run lint**

Run: `cd F:/Sano/01-Site && npm run lint`
Expected: PASS (no errors). If warnings or errors surface, fix them in the original file — common ones to watch for: unescaped apostrophes (`&apos;`), unused imports, missing alt text.

- [ ] **Step 2: If fixes were needed, commit**

```bash
cd F:/Sano/01-Site && git add -u && git commit -m "fix(careers): address lint warnings"
```

If no fixes needed, skip.

---

## Task 12: Browser smoke test

**Files:** none (dev server only).

Must test the feature in a real browser — type checks don't verify feature correctness.

- [ ] **Step 1: Start the dev server**

Run: `cd F:/Sano/01-Site && npm run dev`
Wait for "Ready in Xms".

- [ ] **Step 2: Walk the page at http://localhost:3000/join-our-team**

Verify the following. If any fail, note the issue and fix in the original component file, then re-test.

**Visual / layout:**
- [ ] Hero renders with "Careers" eyebrow, "Join Our Team" H1, and the placeholder block on the right (desktop) or stacked (mobile).
- [ ] "Why work with Sano" shows 3 cards in a row on desktop, stacked on mobile. Icons render. Copy matches the brief.
- [ ] "How it works" shows 5 numbered circles horizontally on desktop, stacked on mobile. Labels match: Apply, Review, Contact, Trial, Get started.
- [ ] Form is centred in a narrow column, each section is its own white card.
- [ ] "Have a question?" section renders with phone and email pill buttons.
- [ ] Footer shows "Join Our Team" between FAQ and Contact Us.

**Form behaviour — golden path:**
- [ ] Fill every required field with valid data, check the declaration, click Apply Now.
- [ ] Button shows "Sending…" briefly, then the success card replaces the form.
- [ ] Success card reads `Thanks — application received` with the approved body text and a mailto link.

**Form behaviour — validation:**
- [ ] Click Apply Now on an empty form. All required fields show red inline errors. Page scrolls to the first error.
- [ ] Yes/no pill groups show their error state clearly.
- [ ] Select "No" for "Do you have cleaning experience?" — the experience types chip selector hides.
- [ ] Select "Yes" — chip selector shows.
- [ ] Leave all experience_types unselected while has_experience is Yes — submit → error shown under chips.
- [ ] Uncheck the declaration — submit → error shown.

**Form behaviour — insurance is optional:**
- [ ] Fill a valid form but leave both insurance questions unanswered. Submit. Success card appears.

**API logging:**
- [ ] After a successful submit, check the terminal where `npm run dev` is running. You should see a log line like:
      `[job-application] received { full_name: '…', email: '…', suburb: '…', application_type: '…' }`
- [ ] No other form fields are logged.

**Keyboard / accessibility:**
- [ ] Tab through the form — focus indicators visible.
- [ ] Arrow keys move selection within a yes/no pill group.
- [ ] If a screen reader misreads any pill state or the keyboard nav feels broken, fall back to styled native radios in `JobApplicationForm.tsx` without waiting.

**Regression check:**
- [ ] Visit `/`, `/about`, `/contact`, `/services/regular-cleaning` — confirm nothing visual changed.
- [ ] Footer shows the new link on every page.

- [ ] **Step 3: If any fixes landed during testing, commit them**

```bash
cd F:/Sano/01-Site && git add -u && git commit -m "fix(careers): <describe fix>"
```

- [ ] **Step 4: Stop the dev server.**

- [ ] **Step 5: PAUSE — Mike checkpoint**

Mike walks the page. Flag anything to change before wrapping up.

---

## Task 13: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `cd F:/Sano/01-Site && npm test`
Expected: PASS — all tests green, including the 13 validation tests and 6 API route tests added in this work.

- [ ] **Step 2: Run the full build**

Run: `cd F:/Sano/01-Site && npm run build`
Expected: PASS — static/dynamic route summary includes `/join-our-team` and `/api/submit-application`.

- [ ] **Step 3: Confirm git state is clean**

Run: `cd F:/Sano/01-Site && git status --short`
Expected: empty output (everything committed).

- [ ] **Step 4: Summarise commits**

Run: `cd F:/Sano/01-Site && git log --oneline ebfb9a2..HEAD`
Expected: 9–12 commits tagged `feat(careers):`, `feat(footer):`, and optionally `fix(careers):`.

---

## Success criteria (end state)

- `/join-our-team` renders correctly on desktop and mobile, matching the spec's visual design.
- Form validates required fields on both client and server; insurance booleans never block submission.
- Submitting a valid form logs the four-field redacted preview server-side and returns `{ ok: true }`.
- Success card replaces the form on success with the approved copy; error banner shows on failure without clearing inputs.
- Footer shows "Join Our Team" in the Company column between FAQ and Contact Us on every page.
- `npm test` passes — all new unit tests green plus all existing tests still green.
- `npm run build` completes without errors.
- No Header changes. No changes to the homepage, service pages, or the existing `/api/submit-quote` route.
