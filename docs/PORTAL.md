# Sano Portal — Master Brief

> Canonical spec for the CRM portal (`/portal`, `/contractor` routes) inside the Sano site.
> Source: migrated from `F:\Sano\Invoices\Sano Portal.txt` on 2026-04-19.
> Update this file when portal architecture changes.

---

## Stack
- Next.js (App Router)
- Supabase (Auth + Postgres)
- Resend (email)

## Project location
- Build inside existing project: `F:\Sano\01-Site` (formerly `F:\Sano\Sano-site`)
- Do not create a separate portal app
- Portal lives inside existing site as `/portal` routes

## Primary goal
- Replace manual quoting/invoicing system
- Make everything faster, simpler, and harder to get wrong

## Key users
- Non-technical staff
- Contractors using mobile devices

## UX rules
- Full-page forms
- Clear sections
- Large labels
- Minimal clutter
- Obvious actions
- Prefer dropdowns over typing
- Avoid modals where possible
- Keep everything simple and guided

---

## Current system status (April 2026)

The portal is now a functional end-to-end operations system including:

- Clients management
- Quotes (create, send, print)
- Invoices (create, send, mark paid)
- Jobs (create, assign, track lifecycle)
- Contractor portal (restricted, mobile-first)
- Contractor assignment email notifications
- Admin scheduling improvements (filters, sorting, duplicate job)
- Recurring jobs (manual generation, duplicate prevention)
- Calendar view (day + week)
- Finance dashboard (revenue, cost, margin)
- People/compliance layer (worker type + documents)
- Training/compliance system (assignments + tracking)
- Labour & Margin save feedback improvements for actual hours
- Address autocomplete for client, quote, and job address entry
- Quotes: `valid_until` auto-populates to 30 days from issue date on creation; also filled on send and on edit if currently empty (manual values never overwritten)
- Contractors: insurance tracking (provider / policy / expiry) with expiry status chip and warning banner
- Jobs: assignment blocked when contractor's insurance is missing or expired (create, update, quick-assign)

---

## Data structure

### clients
- name
- company_name
- email
- phone
- service_address
- billing_address
- billing_same_as_service
- notes

### quotes
- quote_number
- client_id
- status (draft, sent, accepted, declined)
- date_issued
- valid_until
- property_category
- type_of_clean
- service_type
- frequency
- scope_size
- service_address
- scheduled_clean_date
- notes
- base_price
- discount
- gst_included
- payment_type

### invoices
- invoice_number
- quote_id
- client_id
- status (draft, sent, paid, overdue, cancelled)
- service_address
- scheduled_clean_date
- notes
- base_price
- discount
- gst_included
- date_issued
- due_date
- date_paid
- payment_type

### jobs
- job_number
- client_id
- quote_id (nullable)
- invoice_id (nullable)
- recurring_job_id (nullable)
- status (draft, assigned, in_progress, completed, invoiced)
- title
- description
- address
- scheduled_date
- scheduled_time
- duration_estimate
- assigned_to (display only)
- contractor_id
- contractor_price
- job_price
- started_at
- completed_at
- internal_notes
- contractor_notes

### job_workers
- job_id
- contractor_id
- actual_hours

### contractors
- full_name
- email
- phone
- hourly_rate
- worker_type (contractor, casual, part_time, full_time)
- status (active, inactive)
- auth_user_id
- notes

### recurring_jobs
- client_id
- title
- description
- address
- scheduled_time
- duration_estimate
- contractor_id
- assigned_to
- contractor_price
- frequency (weekly, fortnightly, monthly)
- start_date
- end_date
- status (active, paused)
- last_generated_date
- next_due_date

### worker_documents
- contractor_id
- document_type
- title
- file_path
- uploaded_at
- notes

### training_modules
- title
- category
- description
- content
- status
- requires_acknowledgement
- requires_completion
- sort_order

### worker_training_assignments
- contractor_id
- training_module_id
- assigned_at
- due_date
- status (assigned, in_progress, completed, overdue)
- completed_at
- acknowledged_at

---

## Logic rules

### Financial
- `total = base_price + items - discount`
- values stored as dollars

### Labour & margin logic
- actual hours are stored per worker in `job_workers.actual_hours`
- actual labour cost, margin, and profit are calculated dynamically from saved actual hours and worker rates
- actual labour cost and margin are not separately stored unless a future change explicitly requires it

### Invoice rules
- sending → status = `sent`
- marking paid → status = `paid` + `date_paid` set

### Payment timing
- `cash_sale` → `due_date` = 1 day before job
- `on_account` → `due_date` = 14 days after issue

### Overdue
- `status = sent` AND `due_date < today`

---

## Contractor system

### Role logic (critical)
- Contractor = user where `contractors.auth_user_id = auth.uid()`
- Staff = authenticated user with no contractor record

No role column used for access control.

### Middleware access

`/portal/*`
- contractor → redirect to `/contractor/jobs`
- staff → allowed

`/contractor/*`
- contractor → allowed
- staff → redirect to `/portal`

### Contractor restrictions
Contractors must NEVER see:
- `job_price`
- invoice totals
- quote values
- margin
- `internal_notes`
- other contractors' jobs

Contractors may see:
- job details
- schedule
- address
- `contractor_notes`
- their own `contractor_price`

---

## Contractor portal

Features:
- Login
- View assigned jobs
- Job detail page
- Start job
- Complete job
- Add notes
- Training/compliance area

Status flow:
`draft/assigned → in_progress → completed → invoiced`

---

## Contractor notifications

Triggered when:
- job is assigned
- `contractor_id` changes

Not triggered when:
- contractor unchanged
- contractor removed

Email includes:
- job number
- title
- address
- schedule
- link to job

---

## Admin scheduling improvements

Includes:
- job filters (status, contractor, date)
- quick views (today, tomorrow, unassigned)
- sorting
- search
- duplicate job function

---

## Recurring jobs

- weekly / fortnightly / monthly
- manual generation
- duplicate prevention
- tracks `last_generated_date` and `next_due_date`
- generated jobs behave as normal jobs

---

## Calendar view

- day view
- week view
- filter by contractor/status
- navigation (prev/next/today)

---

## Finance dashboard

Shows:
- total invoiced revenue
- total paid revenue
- unpaid revenue
- contractor cost
- estimated margin
- monthly breakdown

Admin only.

---

## People / compliance layer

Includes:
- worker_type classification
- contractor profiles
- document storage:
  - contracts
  - health & safety
  - onboarding docs

Admin only.

---

## Training / compliance system

Admin:
- create training modules
- assign to workers
- track completion

Contractor:
- view assigned training
- acknowledge items
- mark complete

---

## Address autocomplete

Internal portal address entry supports Mapbox address autocomplete (NZ-biased).

Scope:
- client service address
- client billing address
- new quote service address
- new quote billing address
- edit quote address fields where applicable
- job address

Rules:
- keep storing addresses as plain strings in the existing columns
- no database schema change required
- if the Mapbox token is missing, fields must still behave as normal text inputs with no errors
- users must still be able to manually edit an address after selecting an autocomplete result

Implementation notes:
- reusable component: `src/app/portal/_components/AddressField.tsx`
- dropdown styling handled inline with Tailwind classes inside `AddressField.tsx`
- required env var:
  - `NEXT_PUBLIC_MAPBOX_TOKEN`

---

## Labour & Margin UX

Actual hours entry in Labour & Margin must have clear save feedback.

Rules:
- actual hours save to `job_workers.actual_hours`
- save state should be obvious to staff
- support visible states such as idle, dirty, saving, saved, and error
- allow retry if save fails
- avoid changing the underlying labour calculation logic
- no schema change required

Implementation note:
- component: `src/app/portal/jobs/[id]/_components/ActualHoursEditor.tsx`

---

## Security rules

- All contractor routes validate:
  - authenticated user
  - contractor record via `auth_user_id`
  - ownership via `contractor_id`

- Admin data never exposed to contractor portal
- Middleware enforces route separation
- Server-side validation required for all actions

---

## Specs created

- `docs/superpowers/specs/2026-04-18-labour-margin-save-feedback-design.md`
- `docs/superpowers/specs/2026-04-18-address-autocomplete-design.md`

---

## Next priorities

### 1. System hardening
- testing across all features
- edge case handling
- UI polish
- confirm Mapbox env setup in local and Netlify
- verify address autocomplete across client, quote, and job flows
- verify Labour & Margin save states behave correctly under success and failure cases

### 2. Communications / reminders
- job reminders
- overdue invoice reminders
- training/compliance reminders
- admin alerts

### 3. Reporting improvements
- deeper financial insights
- contractor performance
- job trends

### 4. UX improvements
- faster workflows
- better dashboards
- minor automation

---

## Contractor onboarding — planned scope (phased)

### Phase 1 (approved scope, not yet live)
- business identity (trading / company name, business structure, NZBN)
- GST (registered flag, GST number)
- payment (bank account name + number, payment terms days)
- extended insurance (public liability cover amount)
- compliance dates (contract signed date, right-to-work required flag, right-to-work expiry)
- operational flags (service areas, approved services, vehicle, own equipment, key holding, alarm access, pet-friendly, availability notes)
- document types for insurance and right-to-work
- ContractorForm restructured with clear contractor-only / employee-only / shared sections
- No new enforcement beyond the existing insurance-expiry assignment block

### Phase 2 (approved scope, not yet live)
- work capability (experience level, `can_lead_jobs`, `can_work_solo`, `can_supervise_others`)
- portal access tracking (invite sent, portal access active/inactive, auth linked derived from `auth_user_id`)
- `contractor_incidents` table + list/add UI on contractor detail page
- derived compliance status summary (compliant / expiring_soon / missing / expired / inactive) surfaced as a badge on the contractor detail page and via a Compliance Alerts section on `/portal/alerts`
- hard validation on GST number when GST registered
- Email reminders for compliance expiries deferred to Phase 3

### Phase 3 (later / optional)
- structured availability (JSONB day-of-week schedule)
- broader compliance-based assignment blocking (configurable per field)
- contractor self-service profile editing
- email reminders for compliance and document expiries

---

## Quote wording system — planned scope

Structured quote builder (approved scope, not yet live):
- Taxonomy: `service_category` (residential / property_management / airbnb / commercial) and `service_type_code` (14 fixed service types across the four categories)
- Structured inputs: `property_type`, `bedrooms`, `bathrooms`, `site_type`, `frequency` (`one_off` / `weekly` / `fortnightly` / `x_per_week`), `areas_included[]`, `condition_tags[]` (max 2), `addons_wording[]`, optional `support_line`
- Pure wording engine at `src/lib/quote-wording.ts` with fixed wording blocks (verbatim from approved spec) and a `generateQuoteScope()` pure function covering all 8 sections (summary, core description, optional recurring sentence, areas, condition/focus, add-ons, expectation line, differentiation block)
- QuoteBuilder client component: chips + numeric inputs + live preview textarea; auto-regeneration on selection change until the user edits manually; manual edit locks auto-regen until user clicks "Regenerate from selections"
- `NewQuoteForm` and `EditQuoteForm` replace the legacy Property / Clean-type / Service-type / Scope-size dropdowns with the new builder; legacy columns remain on old quotes untouched; print + share pages prefer `generated_scope` over the legacy `buildServiceDescription`
- Generated scope is persisted on create and update so historical quotes retain their wording even if later wording logic changes
- Snapshot tests cover residential, commercial, PM end-of-tenancy override, airbnb turnover, and empty-input cases
- Not included: any rewrite of invoice wording (invoices continue to use legacy fields); admin UI to edit wording blocks at runtime (future option if needed)

---

## Future roadmap

- Contractor training expansion (structured modules)
- Compliance tracking dashboards
- Contractor performance tracking
- Advanced reporting
- Automation workflows
- Potential payroll layer (separate from current system)


## Commercial quote engine — planned scope (phased)

### Phase 0 — Foundation (shipped on `feat/commercial-quote-foundation`)
- New tables: `commercial_quote_details` (1:1 with quotes, universal commercial fields as columns + `sector_fields` JSONB for sector packs) and `commercial_scope_items` (1:N, structured area/task/frequency/quantity/time rows).
- `quotes.deleted_at` + `quotes.deleted_by`: soft-delete columns with partial index on active quotes. Physical delete never exposed via the app.
- `commercial_calculations.quote_id` FK: links pricing snapshots to the quote they were taken against.
- Commercial margin tiers as configurable ranges: `win_the_work` 15–20%, `standard` 22–28%, `premium` 30–38%, `specialist` 35%+. Exported from `src/lib/commercialQuote.ts`.
- Sector categories supported: office, education, medical, industrial, mixed_use, custom. Sector-specific field packs config-driven (no hardcoded JSX) via `SECTOR_FIELD_PACKS`.
- Server actions in `src/app/portal/quotes/_actions-commercial.ts`: `saveCommercialDetails`, `saveCommercialScope`, `softDeleteQuote`. Admin-only soft-delete gated on `user.email === 'michael@sano.nz'` with block+confirm pattern for quotes linked to invoices/jobs, and full `record_snapshots` + `audit_log` trail.
- RLS: staff full access via `NOT public.is_contractor()`; contractor portal never sees commercial quote data.
- Prerequisite audit infra (`is_contractor()`, `audit_log`, `record_snapshots`) bundled idempotently into the foundation migration.

### Phase 1 — Commercial quote form UI (shipped on `feat/commercial-quote-phase-1`, stacks on Phase 0)
- Three new components under `src/app/portal/quotes/_components/commercial/`:
  - `CommercialDetailsSection.tsx` — controlled container with Commercial overview, Site & Building profile, Sector pack delegation, and Assumptions/Exclusions/Compliance.
  - `SectorFieldPack.tsx` — config-driven field renderer over `SECTOR_FIELD_PACKS`, supports text / textarea / number / integer / boolean / select / chips.
  - `CommercialScopeBuilder.tsx` — add / remove / move-up / move-down / included-toggle rows for structured scope items.
- `NewQuoteForm` and `EditQuoteForm` both render the commercial section only when `service_category === 'commercial'`; residential flows unchanged.
- `createQuote` server action extended with optional `commercial_details` + `commercial_scope` — saves inline after the quote row insert, before redirect.
- `/portal/quotes/[id]/page.tsx` parallel-loads `commercial_quote_details` + `commercial_scope_items` and passes them to `EditQuoteForm` for hydration.
- `EditQuoteForm` orchestrates commercial saves client-side after a successful `updateQuote`; locked quotes (sent/accepted) render the commercial section disabled, matching the existing lock behaviour.
- Scope reordering is arrow-button this pass; drag-and-drop is a later improvement.

 ### Phase 2 — Pricing preview + admin soft-delete UI (shipped on `feat/commercial-quote-phase-2`, stacks on Phase 1)
  - Pure pricing function `computeCommercialPreview(details, scope)` in `src/lib/commercialQuote.ts` produces estimated per-visit / weekly / monthly hours, monthly labour cost, and monthly / weekly / per-visit
   sell price from structured scope rows + sector / traffic multipliers + margin-tier midpoint.
  - Priority rule for scope hours: `unit_minutes` (quantity × mins) is preferred when set; otherwise `quantity / production_rate × 60`. `per_visit` frequency multiplies by visits_per_week (derived from
  `service_days` length, default 1). `as_required` rows contribute zero.
  - New `CommercialPricingPreview` component renders inside the commercial section on both New and Edit forms; shows hours, labour cost, sell price, multipliers used, and warnings for incomplete scope rows.
  Includes an "Apply to base price" button that copies the estimated monthly sell price into the quote's `base_price` — the existing manual-override flow is untouched.
  - `CommercialDetailsSection` gains a Labour cost basis ($/hr) field (default $45) next to the margin tier picker.
  - Computed hours (`estimated_service_hours`, `estimated_weekly_hours`, `estimated_monthly_hours`) and `labour_cost_basis` are persisted via `saveCommercialDetails` / `createQuote`'s inline commercial branch.
   No migration required — the columns exist from Phase 0.
  - New `CommercialDeleteButton` component wraps `softDeleteQuote`: two-step confirm, surfaces linked invoice / job IDs when the quote is referenced, exposes a secondary "Delete anyway" that sets
  `confirm_linked=true`. Only renders for admin (`user.email === 'michael@sano.nz'`). On commercial quote detail pages it replaces the generic `DeleteButton`; non-commercial quotes retain the existing button.
  - The deprecated standalone `/portal/commercial-calculator` page is left in place but no longer referenced from the commercial quote flow; can be removed in a later tidy pass.

 ### Phase 3 — Commercial tender / proposal pack (shipped on `feat/commercial-quote-phase-3`, stacks on Phase 2)
  - New `CommercialProposalTemplate` server component (`src/app/portal/quotes/_components/commercial/proposal/`) renders a polished client-facing commercial cleaning proposal from the structured Phase 0/1/2
  data: Cover · Parties · Executive summary · Site & service profile · Scope of works · Assumptions / Exclusions / Compliance · Pricing summary (recurring fee + indicative annualised) · Why Sano · Acceptance &
   next steps.
  - New pure helpers `commercial-proposal-mapping.ts`: scope grouping by area, client-friendly frequency labels, auto-generated executive summary sentence, multi-line text → bullets/paragraph, pricing roll-up.
  - Same routes used as the legacy print/share flows: `/portal/quotes/[id]/print` and `/share/quote/[token]` branch on `service_category === 'commercial'`. When commercial, parallel-load
  `commercial_quote_details` + `commercial_scope_items` and render the proposal template; otherwise render the existing legacy quote template byte-identically (residential output unchanged).
  - The public share route slots the existing `AcceptQuote` component into the proposal's Acceptance section when `status !== 'accepted'`. The accept flow is unchanged.
  - Internal-only fields are excluded from the client-facing proposal: `labour_cost_basis`, `selected_margin_tier`, `estimated_*_hours`, override math, `pricing_breakdown`, `commercial_calc_id`. Only the
  operator-set base price, add-ons, GST, and an indicative × 12 annualised value surface in the pricing summary.
  - Print CSS extends the existing sage / Inter family with richer hierarchy, `break-inside: avoid` on sections / scope areas / acceptance, and A4 print sizing.
  - No migration. No change to residential print or share output.