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

The portal is now a functional end-to-end operations system covering
quoting, proposals, conversion, job execution, contractor payments,
and admin controls. Delivered in order across Phases 0 through D.3
(see the phased scope sections at the end of this document for
commit-level detail).

### Quoting

- Clients management
- Residential quotes: structured builder, AI-assisted generated
  scope, print + share, `valid_until` auto-fill (30 days; also
  filled on send + on edit when empty; manual values preserved)
- Commercial quote engine: structured site + scope + pricing,
  margin tiers, scope input mode lock, tender / compliance fields,
  pricing engine with admin-editable settings, price override
  flow (with reason + admin confirmation), universal billing
  fields (contact / accounts / client reference / PO)
- Quote versioning + archive: every edit after send spawns a new
  version; soft-delete with restore from Settings → Archive
- Full quote lifecycle: `draft → sent → viewed → accepted →
  converted` plus `declined`; status single source of truth in
  `src/lib/quote-status.ts`
- Quote status single-file source of truth: labels, styles, and
  gate helpers (`isQuoteLocked`, `isQuoteConvertible`, etc.)

### Proposals (commercial)

- Reusable proposal template system separate from the quote print
  route: Cover · Executive Summary · Why Sano · Service Overview ·
  Scope · Pricing · Terms & Conditions · Acceptance
- Content-builder engine (`src/lib/proposals/content-builders.ts`):
  pure functions that turn the quote + settings into tailored
  prose (exec summary, service overview, scope intro, pricing
  summary) using formatters like `formatServiceDays`,
  `formatServiceWindow`, `scheduleDescriptor`, `cadencePhrase`,
  `formatScopeFrequency`, `articleFor`.
- Operator-editable proposal settings at `/portal/settings/proposals`
  (persisted in `public.proposal_settings`): executive-summary
  default, terms HTML, cover labels, footer contact, section
  toggles, pricing suffixes, approved terms (locked content).
- Server-rendered PDF via Puppeteer navigating to
  `/proposals/print/[id]` with cookie forwarding. Production
  runtime uses `puppeteer-core` + `@sparticuz/chromium` for Netlify
  Functions / Lambda compatibility; local dev can opt into a
  system Chrome with `PUPPETEER_EXECUTABLE_PATH`.
- Typography locked to Poppins at the proposal scope only
  (portal UI unaffected). Print + PDF colour fidelity via
  `print-color-adjust: exact` and explicit print stylesheet.

### Quote → Job / Invoice

- Quote detail page workflow bar (Phase A+B): five-stage
  indicator Draft → Ready → Sent → Accepted → Next Step, plain-
  language status message, sticky bottom action bar, back-to-top.
- Next Step panel with three conversion paths (Phase D):
  Create Job · Create Invoice · Create Job + Invoice. Recommended
  path highlighted by service category.
- `createJobFromQuote` + `createJobAndInvoiceFromQuote` server
  actions. Jobs created with a `scope_snapshot` jsonb point-in-
  time copy of the agreed work.

### Jobs

- Jobs (create, assign, track lifecycle) with 7-stage visual
  workflow bar over the existing 5-value DB status enum.
- Payment-aware state: `jobs.payment_status` (`on_account`,
  `payment_pending`, `invoice_sent`, `paid`, `not_required`)
  tracks billing alongside workflow. Synced automatically when
  linked invoices are sent / marked paid.
- Review layer: `reviewed_at` + `reviewed_by`; Mark as Reviewed
  surfaces once the job is completed.
- Richer assignment modal: contractor dropdown + scheduled date +
  time / window + allowed hours + access instructions + internal
  notes. Split actions: Assign Only vs Assign + Notify.
- Staff-side start / complete mirror contractor-side writes to
  `job_workers.actual_start_time` / `actual_end_time` /
  `actual_hours` so Allowed/Actual/Variance stays accurate.

### Contractor portal

- `/contractor/login` + `/contractor/jobs` (list) +
  `/contractor/jobs/[id]` (detail).
- Job detail shows allowed hours, access instructions, schedule,
  safe scope summary. No pricing / margin / invoice exposure.
- Contractor Start Job / Complete Job with auto-calculated actual
  hours from the start → finish window.
- Assignment email template extracted to
  `src/lib/contractor-email-template.ts` (configurable surface for
  future admin editing).

### Admin + settings

- `/portal/settings` hub with admin-only cards for Pricing engine,
  Proposal settings, Job settings, Display settings, Archive.
- Job settings (`public.job_settings`): `default_payment_status`,
  `allow_job_before_payment`, `auto_create_job_on_invoice`,
  `require_review_before_invoicing`, `contractor_notification_method`.
  All five now wired into app behaviour with admin bypass.
- Admin-only soft-delete across quotes, invoices, and jobs with
  restore from `/portal/settings/archive`. `record_snapshots` +
  `audit_log` keep the history reversible.
- Central admin helper `src/lib/is-admin.ts` (`ADMIN_EMAIL`,
  `isAdminEmail`, `isAdminUser`); prior inline
  `user.email === 'michael@sano.nz'` checks being migrated.
- Admin scheduling improvements (filters, sorting, duplicate job),
  recurring jobs (manual generation, duplicate prevention),
  calendar view (day + week), finance dashboard (revenue, cost,
  margin), people/compliance layer, training/compliance system.

### Data hygiene

- Address autocomplete (Mapbox, NZ-biased) on client / quote /
  job address entry. Graceful fallback to plain text when no
  token.
- Labour & Margin save feedback with idle / dirty / saving /
  saved / error states.
- Contractors: insurance tracking (provider / policy / expiry)
  with expiry badge + warning banner; assignment blocked on
  missing / expired insurance across create, update, and quick-
  assign paths.

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
- status (draft, sent, viewed, accepted, declined, converted)
- date_issued
- valid_until
- scheduled_clean_date
- accepted_at
- share_token (public accept link)

Scope (residential wording builder):
- service_category (residential / property_management / airbnb / commercial)
- service_type_code
- property_type / bedrooms / bathrooms / site_type / frequency
- areas_included[] / condition_tags[] / addons_wording[]
- generated_scope (persisted per quote) + description_edited flag
- legacy: property_category, type_of_clean, service_type, scope_size, notes

Pricing + override:
- base_price, discount, gst_included, payment_type
- calculated_price (engine output)
- pricing_mode, estimated_hours, pricing_breakdown (jsonb)
- is_price_overridden, override_price, override_reason,
  override_confirmed, override_confirmed_by, override_confirmed_at

Universal billing:
- contact_name / contact_email / contact_phone
- accounts_contact_name / accounts_email
- client_reference / requires_po

Versioning + soft-delete:
- version_number / parent_quote_id / is_latest_version / version_note
- deleted_at / deleted_by

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

Carried over from the source quote (snapshot at conversion):
- is_price_overridden / override_price / override_reason /
  override_confirmed / override_confirmed_by / override_confirmed_at
- calculated_price
- contact_name / contact_email / contact_phone
- accounts_contact_name / accounts_email
- client_reference / requires_po
- deleted_at / deleted_by (soft-delete with restore from Archive)

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
- allowed_hours (from quote.estimated_hours on conversion)
- started_at
- completed_at
- internal_notes
- contractor_notes

Phase C + D additions:
- scope_snapshot jsonb — point-in-time copy of the quote's scope
  at creation (source_quote_id, service_category, frequency,
  residential_items[], commercial_scope[], etc.). Append-only.
- payment_status (not_required, on_account, invoice_sent,
  payment_pending, paid) — operational billing state; does not
  block workflow transitions.
- access_instructions — surfaced to contractor from assignment modal.
- reviewed_at / reviewed_by — admin review layer after completion.
- deleted_at / deleted_by — soft-delete with restore from Archive.

### job_workers
- job_id
- contractor_id
- hours_allocated
- actual_start_time
- actual_end_time
- actual_hours (auto-calculated from start/end window; also
  manually editable via Labour & Margin)

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

### commercial_quote_details (1:1 with quotes)
Per-quote commercial site + pricing metadata. See the Phase 0
scope entry at the end of this document for the full column list;
highlights:
- sector_category (office / education / medical / industrial /
  mixed_use / custom)
- sector_fields (jsonb — driven by `SECTOR_FIELD_PACKS`)
- site + building profile (floor count, square metres, traffic,
  etc.)
- scope input mode
- selected_margin_tier, labour_cost_basis
- estimated_service_hours / estimated_weekly_hours /
  estimated_monthly_hours
- compliance_notes, assumptions, exclusions
- tender fields (tender_required, tender_due_date, etc.)

### commercial_scope_items (1:N with quotes)
Structured scope rows feeding the pricing engine and the proposal.
Columns: area_type, task_name, frequency_label, task_group,
quantity, unit_minutes, production_rate, included, display_order.

### proposal_settings (singleton, key='default')
Key/value/jsonb holding operator-editable proposal content:
executive-summary default, approved terms HTML, cover labels,
footer contact (email / website / phone), pricing suffixes,
acceptance wording, and section toggles (executive summary / terms
/ acceptance). Staff read; admin write.

### job_settings (singleton, key='default')
Key/value/jsonb for operational job toggles: default_payment_status,
allow_job_before_payment, auto_create_job_on_invoice,
require_review_before_invoicing, contractor_notification_method.
Staff read; admin write. All five wired into app behaviour.

### record_snapshots
Append-only snapshot row taken before any destructive / reversible
mutation (archive quote / invoice / job). Columns: entity_table,
entity_id, reason, snapshot (jsonb full-row copy), created_by,
created_at. Used for restore from Archive.

### audit_log
Append-only activity log. Columns: actor_id, actor_role, action
(e.g. `quote.archived`, `quote.converted`, `job.reviewed`),
entity_table, entity_id, before (jsonb), after (jsonb),
created_at.

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

### 1. Complete the quote → job flow
- Wire the third Next Step card: `createRecurringJobFromQuote`
  for ongoing commercial contracts. Currently renders as "This
  option will be available shortly".
- Optional: unify the scope snapshot between `createJobFromQuote`
  and the `auto_create_job_on_invoice` path so the invoice-first
  branch also carries a full snapshot.

### 2. Notifications + reminders
- SMS / portal-notification options for contractor assignment
  (the `contractor_notification_method` setting is wired; only
  `email` is implemented so far).
- Job reminders, overdue invoice reminders, training /
  compliance reminders, admin alerts.
- Global toast primitive to unify the inline-flash feedback
  across actions.

### 3. Admin role + RLS hardening
- Migrate remaining inline `user.email === 'michael@sano.nz'`
  checks to `isAdminEmail()` from `src/lib/is-admin.ts`.
- Consider `USING (deleted_at IS NULL)` RLS on `jobs` (+ quotes,
  invoices) so archived rows are excluded at the DB level, not
  only via app-level filters.
- Eventually: move admin from hardcoded email to a role claim.

### 4. System hardening
- testing across all features
- edge case handling
- UI polish
- confirm Mapbox env setup in local and Netlify
- verify Labour & Margin save states behave correctly under
  success and failure cases

### 5. Reporting improvements
- deeper financial insights
- contractor performance
- job trends

### 6. UX improvements
- faster workflows
- better dashboards
- minor automation
- photos on job completion (requires storage-bucket decision)

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

---

## Proposal template system — shipped (Phases 1 → 4.1 + polish)

Separate reusable proposal renderer under
`src/components/proposals/*` + content engine at
`src/lib/proposals/*`. Distinct from the legacy Phase 3
`CommercialProposalTemplate` (which remains in place for the old
print path). This is the surface used by the "Preview Proposal" +
"Download PDF" buttons on commercial quotes.

### Phase 1 — template scaffolding (`feat/proposal-template-phase-1`)
- `ProposalDocument` composes `CoverPage` · `ExecutiveSummaryPage` ·
  `ServiceOverviewPage` · `ScopeOfWorksPage` · `PricingSummaryPage` ·
  `TermsAndConditionsPage` · `AcceptancePage` through a shared
  `ProposalLayout` (A4-locked; header + footer always rendered).
- `ProposalTemplatePayload` — slim presentation shape. Two sources:
  `proposalFixture()` (static preview data) and
  `fromCommercialProposalPayload()` (adapter from the legacy
  `ProposalPayload` built by `buildProposalPayload`).

### Phase 2 — editable settings (`feat/proposal-settings-phase-2`)
- `public.proposal_settings` (key/value/jsonb, key='default').
  Staff read (`NOT is_contractor()`), admin write
  (`auth.jwt()->>'email' = 'michael@sano.nz'`).
- `/portal/settings/proposals` admin page with form-backed save +
  reset actions; fall back to in-code defaults when row missing.
- Settings surfaces: executive-summary default, pricing note,
  cover labels (prepared-for / site-address / date / reference),
  acceptance wording, approved terms HTML (locked 19-section copy
  in `src/lib/proposals/terms-and-conditions.ts`), footer contact,
  pricing / monthly-fee suffixes, section toggles.

### Phase 2.3 — server-side PDF (`feat/proposal-pdf-phase-2-3`)
- Puppeteer route at `/api/proposals/[id]/pdf` navigates to
  `/proposals/print/[id]` (outside `/portal/*` so no portal
  chrome bleeds in) with cookie forwarding so the print route
  sees the staff session.
- Phase 3.2 switched runtime from full `puppeteer` →
  `puppeteer-core` + `@sparticuz/chromium` for Netlify Functions
  compatibility (the full package's `.cache/puppeteer` path
  isn't writable in the Lambda sandbox).
- Local dev opt-in via `PUPPETEER_EXECUTABLE_PATH` (system
  Chrome path). `next.config.mjs` marks both packages as
  `serverComponentsExternalPackages` so webpack doesn't try to
  bundle the native binary.
- Page config: `format: 'A4'`, `printBackground: true`,
  `preferCSSPageSize: true`, `margin: 0mm` on all sides.

### Phase 3 — content engine (`feat/proposal-content-engine-phase-3` + `3-1`)
- `src/lib/proposals/content-builders.ts` owns tailored prose:
  `buildExecutiveSummary`, `buildServiceOverviewText`,
  `buildScopeIntro`, `buildPricingSummaryText`.
- Formatter library: `formatServiceDays`, `formatServiceWindow`,
  `scheduleDescriptor`, `cadencePhrase`, `formatSiteType`,
  `articleFor` (fixes "a office"), `floorsToWords`,
  `windowDescriptor`, `formatScopeFrequency`.
- `ProposalSiteContext` added to the payload (sector / building
  type / area / floors / traffic / occupancy / contract terms)
  populated from `legacy.site_profile` + settings.
- Phase 3.1 content-lock removed cross-section repetition:
  Exec Summary, Why Sano, Service Overview, Pricing, and
  Acceptance each have a distinct role with no overlap. "Sano
  crew" branding appears exactly once (Why Sano P3).

### Phase 3.2 — typography + print (`feat/proposal-typography-phase-3-2`)
- Proposal font: Poppins via `var(--font-poppins)` (loaded by
  `next/font`). Scoped to `.proposal-document` — portal UI
  unaffected.
- Body sizes +1pt, line-height 1.55–1.6. Terms typography locked
  via `--terms-shrink`.
- Print block: `-webkit-print-color-adjust: exact` +
  `color-adjust: exact` + `break-after: page` so accent colours
  and tinted blocks survive Puppeteer.
- `fix/proposal-pdf-route-deploy`: print route hides portal
  chrome (`aside`, `header:not(.proposal-header)`, `nav`) +
  strips `<main>` padding so Ctrl+P starts on the cover page.

### Phase 4 + 4.1 — polish (`feat/proposal-polish-phase-4`, `-content-lock-phase-4-1`)
- Service Overview field cleanup: Service schedule (prose days) +
  Service window (en-dash range) + Service frequency ("Three
  visits per week") replace the raw-data repetition.
- Why Sano page: dedicated page between Executive Summary and
  Service Overview. Six prose paragraphs (exact wording
  locked); crew image (`/images/Sano-crew-auckland.jpeg`)
  bottom-anchored via flex (`margin-top: auto`) with 6px side
  and 6mm bottom breathing room.
- Acceptance page final close: "Thank you for considering Sano…"
  intro, agreement + validity + close paragraphs, Client Name /
  Company / Position / Signature / Date fields, single-line
  confirmation note anchored at the bottom.
- Pricing positioning line + scope group label normalisation
  (`Workstations`, `Kitchens & Breakout Areas`,
  `Bathrooms & Washrooms`).

---

## Quote workflow UI — shipped (Phase A + B)

Quote detail page turned into a guided workflow surface.

`feat/quote-workflow-ui-phase-a-b`:
- `QuoteWorkflowBar` — 5-stage indicator (Draft → Ready → Sent →
  Accepted → Next Step) derived from `quote.status` + item count.
  "Ready" is a derived UI stage (draft + ≥1 item); no DB change.
- `QuoteStatusMessage` — plain-language line beneath the bar.
- `QuoteActionBar` — sticky bottom action surface. Draft state:
  Preview Proposal · Copy Link · Save Quote → · Send Proposal.
  Sent / Viewed / Declined: View Proposal · Copy Link · Mark as
  Accepted · Send Reminder. Hidden when Accepted / Converted /
  Archived.
- `QuoteNextStepPanel` — full-width panel shown on accepted
  quotes. Three-path billing flow (see Phase D below).
- `QuoteCopyLinkButton` — client clipboard copy with flash.
- `BackToTopButton` — floating control after 400px scroll.

---

## Quote → Job / Invoice workflow — shipped (Phase C + D)

Converts accepted quotes into operational records.

### Phase C (`feat/job-creation-phase-c`)
- `createJobFromQuote(quoteId)` server action
  (`src/app/portal/quotes/[id]/_actions-job.ts`): reads the
  accepted latest-version quote + items + commercial scope,
  snapshots the scope to `jobs.scope_snapshot` (jsonb), inserts
  a fresh job row, marks the quote `converted`, audit-logs
  `quote.converted_to_job`, redirects to `/portal/jobs/[id]`.
- Scope snapshot is point-in-time and append-only. Future quote
  edits don't alter what the job was agreed to deliver.
- `JobWorkflowBar` — 7-stage bar (Draft → Scheduled → Assigned →
  In Progress → Completed → Reviewed → Invoiced) derived from
  existing `jobs.status` + `scheduled_date` + `reviewed_at`. No
  DB enum change.
- DB migration: `jobs.scope_snapshot jsonb`
  (`docs/db/2026-04-25-job-scope-snapshot.sql`).

### Phase D (`feat/payment-aware-jobs-phase-d`)
- Next Step panel becomes three cards: Create Job · Create
  Invoice · Create Job + Invoice. Recommended by service
  category (residential → Invoice; commercial → Job + Invoice).
- `createJobAndInvoiceFromQuote`
  (`src/app/portal/quotes/[id]/_actions-job-and-invoice.ts`):
  creates invoice + copies items, then creates job linked via
  `invoice_id` with `payment_status='payment_pending'`. Single
  audit log entry (`quote.converted_to_job_and_invoice`).
- New columns: `jobs.payment_status`, `jobs.access_instructions`,
  `jobs.reviewed_at`, `jobs.reviewed_by`. Migration at
  `docs/db/2026-04-25-jobs-payment-status-and-review.sql`.
- `markJobReviewed(jobId)` server action + `MarkJobReviewedButton`
  in the job header. Workflow bar advances to Reviewed when
  `reviewed_at` is set.
- Payment status pill rendered alongside the status badge on the
  job page. Operational only; does not block workflow.

---

## Contractor assignment + execution — shipped (Phase D.1)

`feat/contractor-assignment-phase-d1`:
- `AssignJobButton` expanded from dropdown-only to a full modal:
  contractor · scheduled date · time / service window · allowed
  hours · access instructions · internal notes. Action split:
  Assign Only vs Assign + Notify.
- `assignJob` action signature is now `AssignJobInput` object
  (optional fields; backward-compatible defaults). Upserts
  `job_workers` row on assignment so actual-hours tracking has a
  record to write against.
- `src/lib/contractor-email-template.ts` — pure
  `buildContractorAssignmentEmail()` function (subject + HTML).
  `notifyContractorAssigned` becomes a thin wrapper. Email body
  includes allowed hours, scope summary, access instructions, and
  notes when populated.
- Staff-side `startJob` + `completeJob` now sync `job_workers`
  (`actual_start_time` / `actual_end_time`, auto-computed
  `actual_hours`) — parity with `contractorStartJob` /
  `contractorCompleteJob`. Allowed / Actual / Variance stays
  accurate regardless of who closes the job.
- Access instructions surfaced on both `/portal/jobs/[id]` and
  `/contractor/jobs/[id]`. Allowed hours added to contractor
  detail page schedule card.

---

## Settings + archive layer — shipped (Phase D.2)

`feat/settings-admin-archive-phase-d2`:
- `/portal/settings/jobs` admin page + `public.job_settings`
  table. Five keys: `default_payment_status`,
  `allow_job_before_payment`, `auto_create_job_on_invoice`,
  `require_review_before_invoicing`,
  `contractor_notification_method`. Form with save + reset;
  inline "Settings saved successfully" flash.
- Jobs soft-delete: `jobs.deleted_at` + `jobs.deleted_by` +
  partial index. `ArchiveJobButton` (admin only, any status)
  replaces the old hard-delete path. `restoreJob` mirrors the
  quote / invoice restore actions.
- `/portal/settings/archive` extended with a Jobs section beneath
  Quotes + Invoices. All three have row-level Restore buttons.
- All jobs queries filter `.is('deleted_at', null)` — jobs list,
  dashboard counts, archive recovery only.
- Migration: `docs/db/2026-04-25-jobs-soft-delete-and-settings.sql`.

---

## Settings → behaviour wiring — shipped (Phase D.3)

`feat/settings-wiring-phase-d3`:
- `src/lib/is-admin.ts` — `ADMIN_EMAIL`, `isAdminEmail()`,
  `isAdminUser()`. Replacement for the inline
  `user.email === 'michael@sano.nz'` pattern (migration in
  progress; some call sites still inline).
- `getJobSettings()` convenience wrapper added to
  `src/lib/job-settings.ts` — creates its own server Supabase
  client so call sites that don't already have one can
  `await getJobSettings()` in one line.
- **default_payment_status** → read by `createJobFromQuote`.
  `createJobAndInvoiceFromQuote` keeps `payment_pending`
  (invoice-is-created branch).
- **allow_job_before_payment** → `createJobFromQuote` returns a
  clear block when off; `QuoteNextStepPanel` Create Job card
  renders disabled with "Payment required before job creation".
  Admin bypasses.
- **auto_create_job_on_invoice** → `convertToInvoice` spawns a
  minimal linked job (payment_status `payment_pending`) after the
  invoice insert when on AND no job exists for the quote.
  Idempotent.
- **require_review_before_invoicing** → `createInvoiceFromJob`
  guards on `reviewed_at`. Admin bypasses.
- **contractor_notification_method** → `assignJob` notify branch
  gates on `method === 'email'`. Extension point for SMS later.
- Payment status sync on invoice transitions: `sendInvoiceEmail`
  sets linked jobs `payment_status='invoice_sent'`;
  `markInvoicePaid` sets `'paid'`. Scoped to non-archived jobs
  with the invoice_id link.
- Archive filter hardening: contractor job list + detail +
  portal dashboard all now filter `.is('deleted_at', null)`.