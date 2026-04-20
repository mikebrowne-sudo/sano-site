# Join Our Team — Design Spec
**Date:** 2026-04-20

## Overview

Build a `/join-our-team` careers page for the public Sano site: hero, three benefit cards, a five-step row, a grouped application form, and a small contact block. The form submits to a new stub API route `/api/submit-application` that validates server-side and logs a redacted preview. Supabase persistence, Resend emails, and the portal Applicants flow are explicitly out of scope for this build but the data contracts are designed so later wiring is mechanical. The footer gains one new link under the Company column; the header is unchanged.

Layout inspiration: enhancedcleaning.com.au/careers (structure only — no wording or branding copied).

---

## Files

### New
```
src/app/(public)/join-our-team/page.tsx           — page composition
src/app/api/submit-application/route.ts            — POST endpoint (stub)
src/components/CareersHero.tsx                     — hero with placeholder block
src/components/WhyWorkWithSano.tsx                 — 3 benefit cards
src/components/CareersProcess.tsx                  — 5-step row
src/components/JobApplicationForm.tsx              — full form, single client component
src/components/CareersContact.tsx                  — "Have a question?" block
src/types/application.ts                           — form + payload types
```

### Modified
```
src/components/Footer.tsx                          — add "Join Our Team" to Company column
```

### Not touched
- `src/components/Header.tsx` — careers stays out of top nav (customer-journey focused).
- `src/lib/resend.ts`, `src/lib/supabase.ts` — no new functions in this build.

---

## Route, nav, SEO

- **Route:** `/join-our-team`
- **Footer Company column order** (`src/components/Footer.tsx`):
  1. About Sano
  2. FAQ
  3. Join Our Team *(new)*
  4. Contact Us
- **Page `metadata`:** title `Join Our Team | Sano`, description aligned with the hero copy. No OG image overrides for this build.

---

## Page composition

`src/app/(public)/join-our-team/page.tsx` is a server component rendering, in order:

1. `<CareersHero />`
2. `<WhyWorkWithSano />`
3. `<CareersProcess />`
4. `<JobApplicationForm />` — wrapped in a section element with off-white background and `max-w-3xl` inner container
5. `<CareersContact />`

Section spacing uses the existing `.section-y` / `.section-padding` utilities. Backgrounds alternate white / `#faf9f6` to match the homepage rhythm.

---

## Component specs

### `CareersHero.tsx`

- Two-column grid on `lg:`, stacked on mobile (`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center`).
- Text column:
  - Eyebrow: `Careers` (`.eyebrow` utility class)
  - H1: `Join Our Team`
  - Body paragraph (from brief):
    > We're always looking for reliable, detail-focused people who take pride in their work. If you have cleaning experience and want flexible opportunities with a growing team, we'd love to hear from you.
  - No CTA button.
- Placeholder block (right / stacked below):
  - Aspect ratio: `aspect-[4/5]` on `lg:`, `aspect-video` on mobile.
  - Styling: `rounded-2xl`, `bg-gradient-to-br from-sage-50 to-sage-100`, `ring-1 ring-sage-100/60`, subtle `shadow-sm`.
  - Centered lucide-react `Users` icon, `w-16 h-16`, `text-sage-500/40`.
  - No text inside the block. This is intentional neutral surface, not a banner.
- **Future swap:** replace the placeholder `<div>` with `<Image>` of the same aspect ratio and classes. No parent layout change required.

### `WhyWorkWithSano.tsx`

- Section background: `#faf9f6`.
- Heading block: centered, short intro optional (omit if it starts to feel like filler).
- Grid: `grid grid-cols-1 md:grid-cols-3 gap-6` inside `max-w-5xl mx-auto`.
- Card styling (shared): `rounded-2xl border border-sage-100 bg-white p-6`. No hover scale (keeps the page quieter than the homepage `StepCard`).
- Card contents:
  - Icon square: `w-12 h-12 rounded-lg bg-sage-50 flex items-center justify-center text-sage-600`.
  - H3 title: `text-lg font-semibold text-sage-800 mb-2`.
  - Body: `.body-text` but size-reduced — `text-sm leading-relaxed text-sage-600`.
- Three cards (copy verbatim from brief):

| Icon | Title | Body |
|------|-------|------|
| `Clock3` | Flexible Work | Choose work that suits your schedule. We offer flexible opportunities across different types of cleaning jobs. |
| `Users` | Supportive Team | We keep things straightforward and back our team. Clear communication and support matter to us. |
| `TrendingUp` | Consistent Opportunities | We're growing and have regular work available. We're looking for people we can rely on long term. |

### `CareersProcess.tsx`

- White background.
- Heading: `How it works` (no supporting paragraph — brief said keep it simple).
- 5 equal-width circles on `md:`, stacked vertically on mobile.
- Circle: `w-10 h-10 rounded-full bg-white border border-sage-100 text-sage-600 font-semibold` containing the step number `1`…`5`.
- Connector: horizontal thin sage-100 line behind the circles on `md:`; short vertical line between circles on mobile. Same technique as `ProcessSteps.tsx` uses for its 3 numbered dots.
- Label beneath each circle: `text-sm font-medium text-sage-800`. Labels: **Apply**, **Review**, **Contact**, **Trial**, **Get started**.
- No descriptions, no cards, no animations. This is a visual rhythm beat between the benefits and the form, not a content section.

### `JobApplicationForm.tsx`

See dedicated section below.

### `CareersContact.tsx`

- White background, `max-w-3xl mx-auto text-center`.
- H2: `Have a question?`
- Body paragraph (from brief):
  > If you're unsure about anything or want to check if this is the right fit, feel free to get in touch.
- Two pill buttons, stacked on mobile and inline on `sm:` (`flex flex-col sm:flex-row gap-3 justify-center`):
  - Phone: `<a href="tel:0800726686">` — filled sage button, display text `0800 726 686`.
  - Email: `<a href="mailto:hello@sano.nz">` — outlined sage button, display text `hello@sano.nz`.
- Phone number formatting: exactly `0800 726 686` (with spaces) in the visible text.

### `Footer.tsx` (modified)

Add `{ href: '/join-our-team', label: 'Join Our Team' }` to the Company column array, inserted between the FAQ and Contact Us entries. No other changes.

---

## Form: `JobApplicationForm.tsx`

Single `'use client'` component. One `useState` for the form object, one `useState` for errors, one `useState` for status. One `validate()` function. Sections rendered inline as consecutive `<fieldset>` elements, each wrapped in a white card. No sub-components.

### Types — `src/types/application.ts`

```ts
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

// Alias today; keeps API contract decoupled from form shape if they diverge later.
export type JobApplicationPayload = ApplicationFormData
```

Booleans that represent user choice (yes/no questions) are `boolean | null` so "unanswered" is distinguishable from "no" at validation time. `confirm_truth` is plain `boolean` because unchecked = false = invalid.

### Form sections (rendered in this order)

Each section wraps in `<fieldset class="rounded-2xl border border-sage-100 bg-white p-6 sm:p-8">` with an `<legend>` (visually rendered as an H3 inside the card).

1. **Personal details** — `full_name`, `phone`, `email`, `suburb`.
2. **Role type** — `application_type` (three chip-style options: Contractor, Casual, Either).
3. **Licence & transport** — `has_license`, `has_vehicle`, `can_travel` (each a yes/no pill pair).
4. **Experience**
   - `has_experience` (yes/no pills)
   - `experience_types` (chip multi-select, revealed only when `has_experience === true`)
   - `experience_notes` (textarea, always visible, optional)
5. **Equipment** — `has_equipment` (yes/no pills), `equipment_notes` (textarea, optional).
6. **Availability** — `available_days` (chip multi-select, Mon–Sun), `preferred_hours` (text), `travel_areas` (text). All optional.
7. **Additional questions** — `work_preferences` (textarea, optional), `independent_work` (yes/no pills), `why_join_sano` (textarea, optional).
8. **Compliance** — `work_rights_nz` (yes/no pills), `has_insurance` (yes/no pills), `willing_to_get_insurance` (yes/no pills). Only the first is required.
9. **Declaration** — single `confirm_truth` checkbox with inline label:
    > I confirm the information I've provided is true and accurate.

Submit button sits below the last card: full-width pill, `bg-sage-800 hover:bg-sage-500`, text `Apply Now` (loading state `Sending…`).

### Multi-select option labels (user-facing)

**Experience types:**
- Residential cleaning (`residential`)
- Deep cleaning (`deep`)
- End of tenancy (`end_of_tenancy`)
- Commercial (`commercial`)
- Carpet & upholstery (`carpet_upholstery`)
- Window cleaning (`windows`)
- Post-construction (`post_construction`)
- Other (`other`)

**Available days:** Mon / Tue / Wed / Thu / Fri / Sat / Sun (short labels, 7 chips in a single wrapping row).

### Validation rules

`validate(data: ApplicationFormData): ApplicationFormErrors` runs on submit.

**Required** — must be non-empty / non-null / true:
- `full_name` — trim, non-empty
- `phone` — trim, non-empty (presence only, no NZ format check)
- `email` — trim, non-empty, matches `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `suburb` — trim, non-empty
- `application_type` — one of the three enum values (empty string fails)
- `has_license`, `has_vehicle`, `can_travel` — non-null
- `has_experience`, `has_equipment`, `independent_work` — non-null
- `work_rights_nz` — non-null
- `confirm_truth` — must be `true`
- If `has_experience === true`, then `experience_types.length >= 1`

**Not required** (captured but never block submission):
- `has_insurance`, `willing_to_get_insurance`
- `experience_notes`, `equipment_notes`, `preferred_hours`, `travel_areas`, `work_preferences`, `why_join_sano`
- `available_days`

The insurance booleans are intentionally optional — blocking on insurance at application stage filters out casual applicants who'd be fine once onboarded.

Errors clear as the user edits (same pattern as `QuoteForm.tsx`). Validation runs only on submit — no on-blur validation.

### Yes/no pill component (inline helper)

Each yes/no pill group renders as:

```tsx
<div role="radiogroup" aria-labelledby={`${name}-label`} className="flex gap-2">
  <button
    type="button"
    role="radio"
    aria-checked={value === true}
    onClick={() => onChange(true)}
    className={/* selected: bg-sage-800 text-white border-sage-800; unselected: bg-white border-sage-100 text-gray-700 */}
  >
    Yes
  </button>
  {/* mirrored No button */}
</div>
```

Keyboard: arrow keys move selection within the group (standard radiogroup behaviour). Focus ring `ring-sage-300`. Error state adds `border-red-300` to the unselected pill when validation fails.

**Accessibility fallback:** if during build any accessibility gap surfaces (screen reader misreads selection state, keyboard nav glitches, etc.), fall back to styled native `<input type="radio">` without asking. Clarity trumps style.

### Chip multi-select (inline helper)

Used for `experience_types` and `available_days`. Each option is a `<button type="button" aria-pressed={selected}>` that toggles inclusion in the array. Selected: `bg-sage-800 text-white`; unselected: `bg-white border border-sage-100 text-gray-700`. Wraps across lines naturally. Minimum tap target 40×40 on mobile.

### Helper text

Used sparingly. Only where it genuinely clarifies:
- `experience_types`: small helper when revealed — `Select all that apply.`
- `available_days`: small helper — `Tap the days you're generally available.`

No helper text on fields where the label already makes the ask clear.

### Submit flow

1. Client `validate()` → if errors, `setErrors()`, scroll to first error, return.
2. `setStatus('loading')`, submit button shows `Sending…`, disabled.
3. `POST /api/submit-application` with the form data as JSON body.
4. On `res.ok` → `setStatus('success')`, component swaps its return to a success card (no form reset — success card replaces the form).
5. On failure → `setStatus('error')`, inline error banner above the submit button, form stays populated for retry.

### Success card

Replaces the entire form on success. Styled like the existing `QuoteForm` success card: sage-50 background, `rounded-2xl`, `p-8`, `text-center`, large checkmark.

- **Heading:** `Thanks — application received`
- **Body:**
  > We've received your application and will be in touch if it looks like a good fit. If you don't hear from us within a week, feel free to reach out at hello@sano.nz.

No "submit another" button — a 25-field form shouldn't silently reset.

---

## API route — `src/app/api/submit-application/route.ts`

### Shape

```ts
import type { JobApplicationPayload } from '@/types/application'

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as JobApplicationPayload

    const validationError = validatePayload(payload)
    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 })
    }

    console.log('[job-application] received', {
      full_name: payload.full_name,
      email: payload.email,
      suburb: payload.suburb,
      application_type: payload.application_type,
    })

    // TODO(later): insert into job_applications (Supabase), send Resend thank-you, notify SANO_NOTIFY_EMAIL.

    return Response.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('[job-application] error', err)
    return Response.json({ error: 'Submission failed' }, { status: 500 })
  }
}
```

### Server-side validation

`validatePayload(payload)` runs the same required-field rules as the client-side `validate()`. Returns a single string on failure (e.g., `"Missing required fields"`), `null` on success. Never trust the client.

### Logging

Logs exactly four fields: `full_name`, `email`, `suburb`, `application_type`. Intentionally redacted — enough to spot activity or a spam wave in Netlify logs without spraying 25 fields of PII.

### Response contract

- Success: `{ ok: true }`, status 200.
- Client validation failure: `{ error: string }`, status 400.
- Server failure: `{ error: 'Submission failed' }`, status 500.

Matches the pattern the existing `/api/submit-quote` handler uses, so the frontend `res.ok` check reads identically.

---

## Design tokens used

- **Colours:** `sage-50`, `sage-100`, `sage-300`, `sage-500`, `sage-600`, `sage-800` only. No new palette additions.
- **Off-white section background:** `#faf9f6` (homepage alternating pattern).
- **Typography:** existing H1/H2/H3 scale from `globals.css`, `.body-text` for paragraphs, `.eyebrow` for kickers.
- **Container widths:** `max-w-6xl` for full-width sections (hero, benefits, process), `max-w-3xl` for form and contact sections.
- **Radii:** `rounded-2xl` for cards, `rounded-xl` for inputs, `rounded-full` for submit and pill buttons.
- **Section spacing:** `.section-y` (py-20 lg:py-24), `.section-padding` (px-4 sm:px-6 lg:px-8).

No new Tailwind config entries. No new global CSS utilities.

---

## Out of scope (future work — designed-in, not built)

What this spec intentionally defers. The shape of the form and API route is chosen so each of these is an additive step, not a refactor:

- **Supabase persistence.** Table `job_applications` with columns matching `ApplicationFormData`, plus `id`, `created_at`, `application_status` enum (`new`/`reviewing`/`approved`/`declined`/`converted`, default `new`), and internal-only columns `police_vetting_status`, `trial_feedback_notes`. Later: replace `console.log` in the API route with `supabaseAdmin.from('job_applications').insert(payload)`. No frontend change.
- **Resend emails.** Thank-you on submit, approval email, decline email, contractor-invite email. New functions in `src/lib/resend.ts` following the existing `sendQuoteConfirmation` pattern, called from the API route (thank-you) or later from portal server actions (approval/decline/invite).
- **File uploads.** CV, photo ID, insurance certificate. New `FileUploadSection` component inserted between Experience and Compliance. Payload extends with `cv_url`, `id_url`, `insurance_url`. Supabase Storage handles upload.
- **Portal Applicants flow.** New `/portal/applicants` route lists submissions, allows status changes, enables convert-to-contractor (copies relevant fields into `contractors` table). Out of scope for this build.
- **SEO extras.** Structured data, OG image, sitemap entry — add in a later pass once the page copy is settled.

---

## Open questions / assumptions

- **Meta description copy:** spec assumes a meta description derived from the hero paragraph is acceptable. If a tighter SEO-optimised description is wanted, flag during implementation.
- **`experience_types` when `has_experience === false`:** form hides the chip selector in this case; payload sends an empty array. Server-side validation accepts this.
- **Favicon / OG image:** not changed in this build.

---

## Success criteria

- `/join-our-team` renders on desktop and mobile with no layout regressions elsewhere.
- Form validates required fields client-side and server-side; insurance booleans never block submission.
- Submitting a valid form logs the four-field redacted preview in Netlify function logs and returns `{ ok: true }`.
- Success card replaces the form on success; error banner shows on failure without clearing inputs.
- Footer shows the new "Join Our Team" link in the Company column between FAQ and Contact Us.
- No changes to the Header, homepage, service pages, or the existing `/api/submit-quote` route.
- Tailwind tokens only — no new CSS, no new config entries.
