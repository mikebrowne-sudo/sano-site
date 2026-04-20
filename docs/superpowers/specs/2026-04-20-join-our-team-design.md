# Join Our Team — Design Spec

**Date:** 2026-04-20
**Revised:** 2026-04-20 — pivoted from single-page grouped form to landing page + multi-step wizard. See "Revision history" at bottom for what changed.

---

## Overview

Ship a Sano careers experience in two routes:

1. **`/join-our-team`** — landing page. Hero, benefits, how-it-works, contact block. One prominent **Apply Now** CTA in the hero linking to `/apply`. No form on this page.
2. **`/join-our-team/apply`** — guided multi-step application wizard. One primary question per screen, subtle fade/slide transitions between steps, personalized transition screens using previously-entered answers (e.g. "Nice to meet you, Jane."), conditional branching (contractor-only insurance questions, experience-type follow-up only if has experience), progress bar, Next/Back navigation, in-memory state only. Final step submits to the existing `/api/submit-application` route.

Layout/interaction inspiration: Enhanced Cleaning careers flow (structural reference only — no copy, branding, or questions reused). Tone is Sano's own: professional, human, clear, confident, not corporate or cheesy. NZ-specific wording throughout.

The footer gains one new link under the Company column (already done in the prior build). **Header is NOT changed** in this pass — confirmed as a later decision.

---

## Route map

| Route | Type | Purpose |
|-------|------|---------|
| `/join-our-team` | Server component | Landing page (static marketing content) |
| `/join-our-team/apply` | Client component host | Multi-step wizard |
| `/api/submit-application` | POST | Payload receiver (unchanged structurally; payload shape updated to split names) |

---

## Files

### New
```
src/app/(public)/join-our-team/apply/page.tsx   — wizard host (client-rendered)
src/components/careers-apply/
  ApplicationWizard.tsx                         — orchestrator: state, nav, transitions, submit
  steps.config.ts                               — declarative STEPS array (one entry per screen)
  WizardProgress.tsx                            — thin progress bar + "Step N of M" label
  WizardNav.tsx                                 — Next / Back buttons
  step-types/
    WelcomeStep.tsx                             — intro + "Let's start" CTA
    TextStep.tsx                                — single text input (name / phone / email / suburb / etc.)
    TextareaStep.tsx                            — optional longer text (experience notes, why Sano)
    YesNoStep.tsx                               — pill pair
    ChipSingleStep.tsx                          — role type chip picker
    ChipMultiStep.tsx                           — experience types, available days
    InfoStep.tsx                                — transition/personalized screens
    DeclarationStep.tsx                         — final checkbox
    ReviewStep.tsx                              — summary of answers
    SuccessStep.tsx                             — terminal "application received" card
src/lib/applicationStepValidation.ts            — per-step field subset validators
```

### Modified
```
src/types/application.ts                        — split full_name → first_name + last_name; application_type enum becomes 'contractor' | 'employee'
src/lib/applicationValidation.ts                — mirror type change; drop 'either'/'casual'; rename full_name rule; drop equipment_notes + work_preferences
src/__tests__/lib/applicationValidation.test.ts — fixture uses new field names and enum
src/app/api/submit-application/route.ts         — redacted log updated to first_name + last_name; shape otherwise unchanged
src/__tests__/api/submit-application.test.ts    — fixture updated
src/components/CareersHero.tsx                  — add prominent Apply Now CTA linking to /join-our-team/apply
src/app/(public)/join-our-team/page.tsx         — remove the inline form section; section order becomes Hero → Why → Process → Contact
```

### Retired (not deleted yet — moved for reference)
```
src/components/JobApplicationForm.tsx → src/components/_retired/JobApplicationForm.old.tsx
```

### Unchanged
```
src/components/WhyWorkWithSano.tsx
src/components/CareersProcess.tsx
src/components/CareersContact.tsx
src/components/Footer.tsx   (already has the Join Our Team link)
```

---

## Data types

`src/types/application.ts`:

```ts
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
  has_insurance: boolean | null            // captured only if application_type = 'contractor'
  willing_to_get_insurance: boolean | null // captured only if contractor AND has_insurance = false

  // Motivation (optional)
  why_join_sano: string

  // Declaration
  confirm_truth: boolean
}

export type ApplicationFormErrors = Partial<Record<keyof ApplicationFormData, string>>
export type JobApplicationPayload = ApplicationFormData
```

Fields removed vs prior spec:
- `full_name` (replaced by first_name + last_name)
- `work_preferences` and `equipment_notes` (dropped — never asked explicitly in the new flow)

---

## Validation

### Shared server-side rules (`src/lib/applicationValidation.ts`)

Same signature as before — `validateApplication(data): ApplicationFormErrors`. Rules:

- `first_name` — required (trim non-empty)
- `last_name` — required
- `phone` — required (presence only, no NZ format check)
- `email` — required + regex match
- `suburb` — required
- `application_type` — must be `'contractor'` or `'employee'`
- `has_license`, `has_vehicle`, `can_travel` — non-null
- `has_experience` — non-null
- `experience_types` — required (≥1) **iff** `has_experience === true`
- `has_equipment` — non-null
- `available_days` — optional (any length OK)
- `preferred_hours`, `travel_areas`, `experience_notes`, `why_join_sano` — optional
- `independent_work` — non-null
- `work_rights_nz` — non-null
- `has_insurance` — optional (ignored if non-contractor; never blocks submission)
- `willing_to_get_insurance` — optional
- `confirm_truth` — must be `true`

Insurance booleans are intentionally never required — conditional only in the UI, not in validation. An employee application will have them both `null`; that's fine.

### Per-step client-side rules (`src/lib/applicationStepValidation.ts`)

Each wizard step that needs gating declares a pure `(data) => string | null` validator. Next button is disabled (or shows an inline error on tap) until the validator returns `null`. Optional-field steps export a no-op validator.

These per-step rules are **strict subsets** of the rules in `validateApplication`. Duplication is avoided by composing per-step validators from a shared rule set.

---

## Step flow — `/join-our-team/apply`

Total visible steps: **28** (contractor), **26** (employee — skips #23 and #24). Step 14 only appears if #13 is Yes.

| # | Step | Type | Validate | Notes |
|---|------|------|----------|-------|
| 1 | Welcome | `WelcomeStep` | — | Short intro, single "Let's start" button. |
| 2 | First name | `TextStep` (`first_name`) | required | "What's your first name?" |
| 3 | Last name | `TextStep` (`last_name`) | required | "And your last name?" |
| 4 | Hello | `InfoStep` | — | Personalized: "Nice to meet you, {first_name}." |
| 5 | Phone | `TextStep` (`phone`, inputType="tel") | required (presence only) | "What's the best number to reach you on?" |
| 6 | Email | `TextStep` (`email`, inputType="email") | required + regex | "And an email address?" |
| 7 | Suburb | `TextStep` (`suburb`) | required | "Which suburb or area are you based in?" |
| 8 | Role type | `ChipSingleStep` (`application_type`) | required | Options: Contractor / Employee |
| 9 | Transition | `InfoStep` | — | "The next few questions help us understand fit, availability, and how you work." |
| 10 | Driver licence | `YesNoStep` (`has_license`) | required | "Do you hold a current NZ driver licence?" |
| 11 | Vehicle access | `YesNoStep` (`has_vehicle`) | required | "Do you have access to a vehicle for getting to jobs?" |
| 12 | Travel | `YesNoStep` (`can_travel`) | required | "Are you comfortable travelling to different job locations?" |
| 13 | Experience | `YesNoStep` (`has_experience`) | required | "Have you worked in cleaning before?" |
| 14 | Experience types | `ChipMultiStep` (`experience_types`) | ≥1 | **Conditional — visible only if #13 is Yes.** Helper: "Select all that apply." |
| 15 | Experience notes | `TextareaStep` (`experience_notes`) | optional | "Tell us a bit about your experience." |
| 16 | Values | `InfoStep` | — | "We work best with people who are reliable, detail-focused, and take pride in their work." |
| 17 | Equipment | `YesNoStep` (`has_equipment`) | required | Copy adapts to role: contractors see "Do you have your own cleaning equipment and products?"; employees see "Do you currently have cleaning equipment and products of your own?" |
| 18 | Available days | `ChipMultiStep` (`available_days`) | optional | Mon–Sun chips. Helper: "Tap the days that generally work for you." |
| 19 | Preferred hours | `TextStep` (`preferred_hours`) | optional | Placeholder: "e.g. mornings, school hours" |
| 20 | Travel areas | `TextStep` (`travel_areas`) | optional | Placeholder: "e.g. Central, North Shore, Eastern suburbs" |
| 21 | Independent work | `YesNoStep` (`independent_work`) | required | "Are you comfortable working independently when needed?" |
| 22 | Right to work | `YesNoStep` (`work_rights_nz`) | required | "Do you have the legal right to work in New Zealand?" |
| 23 | Insurance now | `YesNoStep` (`has_insurance`) | optional | **Conditional — contractor only.** "Do you currently hold public liability insurance?" |
| 24 | Willing to insure | `YesNoStep` (`willing_to_get_insurance`) | optional | **Conditional — contractor AND #23 is No.** "Would you be willing to arrange public liability insurance if required?" |
| 25 | Why Sano | `TextareaStep` (`why_join_sano`) | optional | "Why are you interested in working with Sano?" |
| 26 | Declaration | `DeclarationStep` (`confirm_truth`) | must be `true` | Checkbox + copy. |
| 27 | Review | `ReviewStep` | — | Summary of answers. Back button still visible. Submit triggers POST. |
| 28 | Success | `SuccessStep` | — | Terminal screen. Cannot navigate back. |

Per step, the copy shown above is the intended Sano tone. Exact wording is the implementer's to tighten during build — but no step should acquire questions not in this table.

---

## Wizard architecture

### Orchestrator (`ApplicationWizard.tsx`)

- Owns `form: ApplicationFormData`, `stepIndex: number`, `status: 'idle' | 'submitting' | 'success' | 'error'`, `errorMessage: string`.
- Initialises `form` via `createEmptyApplicationForm()` (exported from `applicationValidation.ts`).
- Computes `visibleSteps` by filtering `STEPS` through each entry's `visible(form)` predicate on every render.
- Renders current step through a `type → component` map.
- Handles `goNext()`, `goBack()`, `submit()`.
- `submit()` runs the full `validateApplication(form)` one last time. If errors, set status `'error'`, show the first error message via the inline error banner. Otherwise POST to `/api/submit-application`, set `'success'`.

### Step config (`steps.config.ts`)

Declarative array of ~28 entries:

```ts
export type StepDef =
  | { id: string; type: 'welcome' }
  | { id: string; type: 'info'; title?: string | ((d: ApplicationFormData) => string); body: string | ((d: ApplicationFormData) => string); visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'text'; field: keyof ApplicationFormData; question: string; inputType?: 'text' | 'tel' | 'email'; placeholder?: string; required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'textarea'; field: keyof ApplicationFormData; question: string; placeholder?: string; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'yesno'; field: keyof ApplicationFormData; question: string | ((d: ApplicationFormData) => string); required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'chip-single'; field: keyof ApplicationFormData; question: string; options: { value: string; label: string }[]; required?: boolean; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'chip-multi'; field: keyof ApplicationFormData; question: string; helper?: string; options: { value: string; label: string }[]; minSelected?: number; visible?: (d: ApplicationFormData) => boolean }
  | { id: string; type: 'declaration'; field: 'confirm_truth'; body: string }
  | { id: string; type: 'review' }
  | { id: string; type: 'success' }

export const STEPS: StepDef[] = [ /* 28 entries */ ]
```

The config is the single source of truth for order, field binding, copy, and conditional visibility. Reordering or inserting a step is a config-only change.

### Step-type components

Each step-type component takes a minimal prop surface:

- `data: ApplicationFormData`
- `onChange<K>(key: K, value: ApplicationFormData[K])`
- `onNext(): void`
- `onBack(): void`
- `isFirst: boolean` / `isLast: boolean` — for nav button rendering
- `error: string | null` — current validation error, if any
- Step-specific config (e.g. `question`, `options`)

Size budget per step-type component: 60–120 lines.

### Animations

`framer-motion` (already in the project, used in `ProcessSteps.tsx`). Use `<AnimatePresence mode="wait">` wrapping the current step with a subtle variant:

```tsx
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.2 }}
```

No dramatic movement. Respect `prefers-reduced-motion` — framer-motion handles this automatically.

### Progress indicator (`WizardProgress.tsx`)

- Thin bar, height 3px, sage-800 fill on sage-100 background.
- Width: `(stepIndex + 1) / visibleSteps.length * 100%`.
- Label (right aligned, optional): "Step N of M".
- Hidden on the Success step.

### Navigation (`WizardNav.tsx`)

- Full-width Next button, sage-800 pill, loading state on final submit.
- Back button: ghost style, left-aligned, hidden on step 0 (Welcome) and on Success.
- Keyboard: `Enter` triggers Next when focus is in a text input or on the Next button.

### State and refresh

In-memory only. Refresh = start over. This is documented and acceptable for this first release. URL state is noted as follow-up if drop-off data argues for it.

---

## Landing page changes

### `src/app/(public)/join-our-team/page.tsx`

```tsx
<CareersHero />
<WhyWorkWithSano />
<CareersProcess />
<CareersContact />
```

No form section. The page is now pure marketing content.

### `src/components/CareersHero.tsx`

- Keep the placeholder block on the right.
- In the text column, add a single pill-style CTA under the body paragraph:
  - `Apply Now` with `→` icon (lucide-react `ArrowRight`).
  - Links to `/join-our-team/apply` via `next/link`.
  - Style mirrors the existing sage-800 pill used site-wide.

Nothing else in the hero changes.

---

## API + logging

Route unchanged structurally. Redacted log updates from:

```ts
console.log('[job-application] received', { full_name, email, suburb, application_type })
```

to:

```ts
console.log('[job-application] received', { first_name, last_name, email, suburb, application_type })
```

Still five or fewer fields, still no free-text content. Server-side validation continues to call `validateApplication(payload)`.

---

## Header nav

**Not changed in this pass.** Adding `Join Our Team` to the header's top-level nav was discussed but explicitly deferred. Footer link (from Task 4 of the prior plan) stays and remains the only entry point besides direct URL.

---

## Accessibility

- Wizard root is a `<main>` with `aria-label="Application form"`.
- Each step's question renders as an `<h1>` or `<h2>` with an id the progress bar can reference via `aria-describedby`.
- YesNo pills and chips continue the accessibility patterns from the previous form (role="radio"/"radiogroup", aria-pressed, keyboard focus rings).
- `prefers-reduced-motion` disables the slide transition.
- Focus moves to the step heading on Next/Back so screen readers announce the new question.

---

## Out of scope (unchanged from prior spec)

- Supabase persistence, Resend emails, file uploads, portal Applicants flow.
- URL state (wizard resumes on refresh).
- SEO structured data or OG image.
- Reordering or editing answers from the review step (user hits Back instead).

---

## Revision history

**2026-04-20 — pivot to wizard.** Original spec was a single-page grouped form with nine `<fieldset>` cards on `/join-our-team`. Revised to:

- Split `/join-our-team` into a landing page and `/join-our-team/apply` wizard.
- One question per screen with subtle transitions.
- Personalized transition screens using prior answers.
- `full_name` split into `first_name` + `last_name`.
- `application_type` enum changed from `contractor | casual | either` to `contractor | employee`.
- Insurance questions now contractor-only (UI-level conditional).
- `equipment_notes` and `work_preferences` dropped from the data model — not asked in the new flow.
- Header nav addition deferred; footer link stays.

---

## Success criteria

- `/join-our-team` renders the landing page (no form).
- Hero has a visible Apply Now button linking to `/join-our-team/apply`.
- `/join-our-team/apply` renders the wizard starting at Welcome; Next moves forward, Back returns, progress bar tracks.
- Contractor path shows insurance questions; Employee path skips them.
- Experience types step appears only after a Yes to "Have you worked in cleaning before?".
- Required fields block Next with an inline error; server also rejects an invalid payload on final submit.
- Successful submit returns `{ ok: true }` with the first/last/email/suburb/application_type redacted log line in Netlify function logs.
- Success step replaces the wizard on a successful submit.
- All prior tests (validation, API route) pass with updated fixtures.
- No changes to the Header. Footer unchanged.
