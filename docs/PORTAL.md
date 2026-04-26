# Sano Portal — Master Brief

> Canonical spec for the CRM portal (`/portal`, `/contractor` routes) inside the Sano site.
> Source: migrated from `F:\Sano\Invoices\Sano Portal.txt` on 2026-04-19.
> Update this file when portal architecture changes.

---

## Current Active Work

**Primary focus:** Phase 5.1 — Applicant pipeline polish. Final 9-status pipeline (new → reviewing → phone_screen → approved → onboarding → trial → ready_to_work, plus on_hold / rejected). Stage-action UI, trial scheduling, audit log. Next: 5.2 applicant→contractor conversion.

*Convention: this section reflects the ONE active focus. Each major phase (Notifications, Payroll, Recurring, etc.) supports an "In Flight" subsection below its "shipped" section. Shipped sections remain unchanged; in-flight sections track real-time development state and update only at phase boundaries (push → PR → merge → verified).*

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

### Payroll (Phase E + E.1)

- Existing employee salary path (`pay_runs` + `pay_run_lines` +
  `payslips` via `nz-paye`) untouched — handles holiday pay,
  PAYE, KiwiSaver, ACC for salaried workers.
- New contractor hours-approval path layered on top: admin
  approves actual job hours per worker; rate is snapshotted at
  approval time; rows surface on
  `/portal/payroll/contractor-pending`.
- Contractor pay run lifecycle: bundle approved hours into a
  `pay_runs` row of kind `'contractor'`, list at
  `/portal/payroll/contractor-runs`, approve, mark paid, export
  CSV. Job-worker pay status flows
  `pending → approved → included_in_pay_run → paid`.

### Recurring contracts (Phase F)

- `recurring_jobs` table extended into a contract layer for
  commercial agreements: source quote linkage, scope snapshot,
  contract term + notice period, monthly value, renewal status.
- Renewal reminders 6 / 4 / 2 weeks before contract end_date,
  rendered in-portal with mark-done / dismiss actions.
- Multi-week job generation (Next 1 / 2 / 4 weeks) with
  duplicate prevention by (recurring_job_id, scheduled_date).
- Renew / Extend admin action — sets new end_date + recreates
  pending reminders against the new date.
- "Create Recurring Job" card wired on the Quote Next Step
  panel — accepted commercial quotes pre-fill term, monthly
  value, and reminders.

### Notifications (Phase H)

- Twilio SMS via the central `sendNotification` helper. Admin-
  only settings page at `/portal/settings/notifications` with
  provider config status (env vars present / missing without
  exposing values), channel toggles, type toggles, template
  editor with placeholder hints, and a Test SMS panel that
  POSTs to a route handler.
- TWILIO_MESSAGING_SERVICE_SID is the preferred sender (Sano
  Notifications messaging service); TWILIO_FROM_NUMBER is the
  fallback for direct-from-a-single-number sends. Either one is
  sufficient.
- Every send writes a `notification_logs` row — sent / failed /
  skipped with the gate reason, so all attempts are visible.
- Manual contractor + customer SMS buttons on the staff job
  page when phone numbers are present.
- One automated trigger live: contractor SMS auto-fires on
  Assign + Notify alongside the existing email.
- Default templates seeded: contractor `job_assigned`, customer
  `booking_confirmation`. Both admin-editable.

---

## Data structure

### applicants (Phase 5)
Inbound recruitment funnel rows from the public Join Our Team form (`/api/submit-application`).
- status (CHECK in: new | reviewing | interview | approved | rejected | converted_to_contractor) + status_updated_at + status_updated_by
- staff_notes (internal only)
- first_name / last_name / phone / email / suburb / date_of_birth (optional)
- application_type (CHECK in: contractor | employee)
- has_license / has_vehicle / can_travel
- has_experience / experience_types[] / experience_notes
- has_equipment
- available_days[] / preferred_hours / travel_areas
- independent_work / work_rights_nz / has_insurance / willing_to_get_insurance
- why_join_sano (optional motivation)
- confirm_truth (declaration checkbox)
- converted_contractor_id (FK → contractors, set null on delete) + converted_at
- created_at + updated_at (trigger-managed)

Indexes: status, created_at desc, lower(email), partial on converted_contractor_id is not null. RLS: staff read; admin update/delete; public form INSERT goes via service-role and bypasses RLS.

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
(e.g. `quote.archived`, `quote.converted`, `job.reviewed`,
`job_worker.hours_approved`, `pay_run.created`,
`pay_run.approved`, `pay_run.paid`,
`recurring_contract.renewed`, `recurring_contract_reminder.completed`),
entity_table, entity_id, before (jsonb), after (jsonb),
created_at.

### job_workers (Phase E pay snapshot)
Existing junction (job_id, contractor_id, hours_allocated,
actual_start_time, actual_end_time, actual_hours) extended with:
- pay_rate (numeric — rate at approval; never overwritten)
- pay_type (currently 'hourly')
- approved_hours (numeric — admin-adjustable, defaults to actual)
- approved_at (timestamptz)
- approved_by (uuid → auth.users)
- pay_status text default 'pending', CHECK in (pending,
  approved, included_in_pay_run, paid)

### pay_runs (Phase E.1 lifecycle additions)
Existing employee-payroll table extended with:
- kind text default 'employee', CHECK in (employee, contractor)
- approved_at + approved_by
- paid_at + paid_by

### pay_run_items (Phase E)
Contractor-side pay run lines. One row per (pay_run_id, job_id,
contractor_id) — composite UNIQUE prevents the same worker's
job hours from landing in two pay runs. Columns: pay_run_id,
job_id, contractor_id, approved_hours, pay_rate, amount, status
(CHECK in pending/approved/paid/void), note, created_at. RLS
staff read / admin write.

### recurring_jobs (Phase F contract additions)
Existing manual-generator table extended with:
- quote_id (uuid → quotes, on delete set null)
- service_category, service_days, service_window
- scope_snapshot jsonb (point-in-time copy of the quote scope)
- contract_term_months, notice_period_days, monthly_value
- renewal_status text default 'not_started', CHECK in (
  not_started, review_due, renewal_sent, renewed, ending)
- renewal_notes
- created_by, updated_at

### recurring_contract_reminders (Phase F)
Renewal touchpoints. Columns: id, recurring_job_id (FK cascade),
reminder_type (CHECK: six_weeks | four_weeks | two_weeks),
due_date, status (CHECK: pending | completed | dismissed),
completed_at, completed_by, created_at. RLS staff read / admin
write.

### notification_settings (Phase H, singleton)
Key/value/jsonb. `value.provider`, `value.channels` (contractor_sms,
customer_sms, email, manual, automated), `value.types` (per-
audience-and-type enable map). Staff read; admin write.

### notification_templates (Phase H)
One row per (type, channel, audience). Columns: id, type,
channel (CHECK: sms | email), audience (CHECK: contractor |
customer | staff), subject (nullable, for email), body, enabled,
updated_at, updated_by. Staff read; admin write.

### notification_logs (Phase H, append-only)
Every notification attempt — sent, failed, or skipped — gets a
row. Columns: id, type, channel, audience, recipient_name,
recipient_phone, recipient_email, status (CHECK: pending | sent
| failed | skipped), provider, provider_message_id,
error_message, payload jsonb, related_{job,client,contractor,
invoice}_id, created_at, sent_at. Indexed on created_at desc +
status + related_job_id (partial). Staff read.

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

### 1. Complete the notifications surface
- Customer-side automated triggers: `booking_confirmation` on
  quote acceptance / job creation, `cleaner_on_the_way`,
  `job_completed`, `invoice_sent`, `payment_reminder`. Settings
  + templates exist; only the trigger code is missing.
- Scheduled reminders (`job_reminder_day_before` for both
  contractor + customer). Needs a cron / scheduled function.
- STOP / opt-out keyword handling + Twilio inbound + delivery-
  status webhooks.
- Email-channel notification types (the schema supports it; the
  send path currently only routes `sms`).

### 2. Payroll polish
- Cancel / void a draft contractor pay run (rolls
  job_workers.pay_status back to `approved`).
- Email payslips to contractors for paid pay runs (template
  surface ready via `contractor-email-template.ts`).
- Settings additions: `default_contractor_pay_type`,
  `require_reviewed_job_before_pay`,
  `allow_non_admin_payroll_access`.
- Pay status CHECK on `pay_runs.status` once the employee +
  contractor paths' allowed values are unified.

### 3. Recurring contracts polish
- Auto-generation cron — fill the next 1 week of contractor
  jobs nightly instead of waiting for manual generation.
- Email/SMS renewal reminders on the existing in-portal
  reminder rows (Phase H notification engine has the plumbing).
- Pause / End / Activate quick actions on the contract detail
  page (today still goes through the edit form).
- List-page columns for renewal status, monthly value, end_date.
- Linked-job guard before End (warn when pending future jobs
  exist).

### 4. Admin role + RLS hardening
- Migrate remaining inline `user.email === 'michael@sano.nz'`
  checks to `isAdminEmail()` from `src/lib/is-admin.ts` (still
  scattered across ~10 files).
- Consider `USING (deleted_at IS NULL)` RLS on `jobs` / quotes /
  invoices so archived rows are excluded at the DB level, not
  only via app-level filters.
- Eventually: move admin from hardcoded email to a role claim.

### 5. Wire job_settings into behaviour (carry-over from D.3)
- Phase D.3's wiring branch for the five operational toggles
  (`default_payment_status`, `allow_job_before_payment`,
  `auto_create_job_on_invoice`, `require_review_before_invoicing`,
  `contractor_notification_method`) was prepared but not merged.
  Re-land or rebuild on top of E + F + H.

### 6. System hardening
- testing across all features
- edge case handling
- UI polish
- confirm Mapbox env setup in local and Netlify
- verify Labour & Margin save states behave correctly under
  success and failure cases

### 7. Reporting improvements
- deeper financial insights (revenue, cost, margin trends)
- contractor performance (variance, on-time rate)
- pay run summaries (this period vs last, contractor vs
  contractor)
- job trends

### 8. UX improvements
- faster workflows
- better dashboards
- minor automation
- photos on job completion (requires storage-bucket decision)
- global toast primitive to unify the inline-flash feedback
  across actions

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

---

## Payroll foundation — shipped (Phase E)

`feat/payroll-foundation-phase-e` — adds the contractor hours-
approval layer on top of the existing employee payroll path.
The legacy salary runs (pay_run_lines / payslips via nz-paye)
are untouched.

DB migration — `docs/db/2026-04-25-phase-e-payroll-foundation.sql`
- `job_workers` pay snapshot columns + CHECK on pay_status.
- `pay_runs.kind` text default 'employee' with CHECK in
  ('employee', 'contractor').
- New `pay_run_items` table (composite UNIQUE on pay_run_id +
  job_id + contractor_id; RLS staff read / admin write).

Server action — `approveJobWorkerHours`
- Admin-only; gates on job status in {'completed','invoiced'},
  contractor having an `hourly_rate`, and (when on)
  `require_review_before_invoicing`.
- Snapshots `contractors.hourly_rate` to `job_workers.pay_rate`
  at approval; future rate changes never alter historical pay.
- Audit-logs `job_worker.hours_approved`.

UI
- `ApproveHoursButton` on the staff job page Labour & Margin
  section. Modal shows allowed / actual / variance + rate +
  calculated pay; admin can adjust approved_hours.
- New `/portal/payroll/contractor-pending` admin route lists
  approved-but-unbundled rows grouped by contractor with totals.
- Payroll hub adds a Contractor approvals card with live count.

---

## Contractor pay runs — shipped (Phase E.1)

`feat/contractor-pay-runs-phase-e1` — full pay run lifecycle for
contractor hours.

DB migration — `docs/db/2026-04-25-phase-e1-contractor-pay-runs.sql`
- `pay_runs` adds `approved_at`, `approved_by`, `paid_at`,
  `paid_by` (all nullable).
- `pay_runs_kind_status_idx` for the contractor list query.

Server actions (`src/app/portal/payroll/contractor-runs/_actions.ts`)
- `createContractorPayRun(period_start, period_end, notes?)` —
  picks job_workers with `pay_status='approved'` and
  `approved_at` in the inclusive window (jobs not archived),
  inserts the pay_runs header (kind='contractor', status=
  'draft'), bulk-inserts pay_run_items, flips eligible
  job_workers to 'included_in_pay_run' with race-guarded equality
  check. Rolls the empty header back if items insert fails.
- `approveContractorPayRun(payRunId)` — draft → approved with
  approved_at + approved_by + audit log.
- `markContractorPayRunPaid(payRunId)` — approved → paid; flips
  pay_run_items to 'paid' and linked job_workers to 'paid' +
  audit log.
- `submitNewContractorPayRun(formData)` — FormData wrapper that
  creates + redirects.

Pages
- `/portal/payroll/contractor-runs` — admin list (period · status
  · contractor count · item count · total).
- `/portal/payroll/contractor-runs/new` — form, defaults to last
  Mon–Sun.
- `/portal/payroll/contractor-runs/[id]` — admin detail with
  items grouped by contractor + Approve / Mark Paid buttons +
  CSV export link.

CSV export
- Route handler `/portal/payroll/contractor-runs/[id]/csv` —
  admin-gated, RFC 4180 quoting, columns Contractor name ·
  Email · Job number · Title · Date · Hours · Rate · Amount.
- Filename: `contractor-pay-run-{start}-to-{end}.csv`.

Eligibility rule (documented choice): inclusion is matched on
`approved_at BETWEEN period_start AND period_end` rather than
job.completed_at. approved_at is always set on eligible rows so
the rule is predictable.

---

## Recurring contracts — shipped (Phase F)

`feat/recurring-contracts-phase-f` — extends the existing
`recurring_jobs` (manual single-job generator) into a contract
layer for commercial agreements. Single-job generation +
list/edit pages stay as-is.

DB migration — `docs/db/2026-04-25-phase-f-recurring-contracts.sql`
- 11 new columns on `recurring_jobs` (quote_id, service_category,
  scope_snapshot, service_days/window, contract_term_months,
  notice_period_days, monthly_value, renewal_status with CHECK,
  renewal_notes, created_by, updated_at).
- New `recurring_contract_reminders` table + CHECKs + indexes +
  RLS.
- `recurring_jobs_end_date_idx` partial index.

Server actions (`src/app/portal/recurring-jobs/_actions-phase-f.ts`)
- `createRecurringJobFromQuote(quoteId)` — accepted-latest-version
  guard, pulls quote + commercial scope + commercial details,
  builds scope_snapshot, derives end_date from start + term
  (commercial defaults: 12 months / 30 days notice; residential
  leaves both null), inserts recurring_jobs row + 6/4/2-week
  reminders when end_date is set, marks quote converted, audit
  log, redirect.
- `generateUpcomingRecurringJobs({ recurringJobId, weeks })` —
  walks the schedule from next_due_date in 1/2/4-week (or
  custom) windows, skips dates already inserted (duplicate-
  guard via `.in()` match on scheduled_date), inserts jobs with
  scope_snapshot + default payment_status from job_settings.
  Returns `createdCount` + `skippedCount`.
- `updateRecurringReminder({ reminderId, status })` — completed
  or dismissed + completed_at + completed_by + audit log.
- `extendRecurringContract({ recurringJobId, newEndDate,
  newTermMonths?, notes? })` — admin-only, sets new end_date +
  optional new term, replaces pending reminders with a fresh
  set tied to the new end date; completed/dismissed history
  preserved. Audit log.

UI
- 4th card on the Quote Next Step panel: "Create Recurring Job"
  via `CreateRecurringJobButton`. Grid widened to md:2 / lg:4.
- `/portal/recurring-jobs/[id]` gets a Contract terms section
  (term, notice, monthly value, renewal status, renewal notes)
  and a Renewal reminders section (`RemindersPanel` with mark-
  done / dismiss).
- New action buttons: `GenerateUpcomingButton` (Next 1 / 2 / 4
  weeks menu) alongside the existing single-next-due
  `GenerateJobButton`, plus admin-only `ExtendContractButton`
  modal.

---

## Notifications — shipped (Phase H)

`feat/notifications-twilio-phase-h` + follow-ups: Twilio SMS
foundation with admin gates, templates, log, manual + automated
sends.

DB migration — `docs/db/2026-04-25-phase-h-notifications.sql`
- `notification_settings` (singleton key='default' jsonb).
- `notification_templates` ((type, channel, audience) UNIQUE,
  body, enabled).
- `notification_logs` (append-only, status pending|sent|failed
  |skipped).
- RLS staff read / admin write on settings + templates; logs
  staff read.
- Default templates seeded for `contractor.job_assigned` +
  `customer.booking_confirmation`.

Notifications lib — `src/lib/notifications/`
- `types.ts` — channels + audiences + closed type sets +
  TEMPLATE_PLACEHOLDERS.
- `settings.ts` — DEFAULT + merge + validate + load +
  isTypeEnabled.
- `render-template.ts` — pure renderer with placeholder /
  unknown-token reporting + 160-char single-segment warning.
- `twilio.ts` — `getTwilioConfigStatus()` /
  `isTwilioConfigured()` / `sendTwilioSms()`. Server-only via
  fetch + HTTP basic auth + 15s `AbortSignal.timeout()`. No SDK
  dep. Sender precedence: `TWILIO_MESSAGING_SERVICE_SID`
  preferred → falls back to `TWILIO_FROM_NUMBER`.
- `send.ts` — `sendNotification()` central gate runner. Applies:
  provider configured → SMS enabled globally → audience channel
  enabled → type enabled → manual/automated source enabled →
  template exists & enabled → recipient phone present → Twilio
  send. Writes `notification_logs` for every outcome including
  skipped + the gate reason in `error_message`.

Settings page — `/portal/settings/notifications` (admin-only)
- Provider section shows env-var presence (configured / missing /
  fallback) without revealing values + global SMS enable.
- Channel toggles (contractor SMS, customer SMS, email, manual,
  automated).
- Type toggles for the closed audience+type set.
- Template editor per-(type, channel, audience) with placeholder
  hint chips + char counter + 160-char warning + per-template
  enabled flag.
- Test SMS panel posts to a route handler (see below).

Test SMS via API route
- `src/app/api/notifications/test-sms/route.ts` — admin-gated
  POST. Parses `{ phone, message }` JSON, calls
  `sendNotification(source: 'test')`, returns
  `{ ok, status, reason, logId, sentTo }`. Used by the panel
  via `fetch()` instead of a server action — server-action
  transport was silently failing on the deployed build, the
  route handler is reliable.

Job page — manual SMS
- `JobNotificationsPanel` admin-only on `/portal/jobs/[id]`,
  visible when contractor or client phone is present. Two
  buttons (Send contractor SMS / Send customer SMS). Both call
  the central send path; gating + logging identical to the
  automated trigger.

Automated trigger
- `assignJob` notify branch fires the contractor SMS via
  `sendNotification(source: 'automated', type: 'job_assigned')`
  alongside the existing email. Failures don't block assignment;
  outcome is captured in `notification_logs`.

Required env vars
- `TWILIO_ACCOUNT_SID` (required)
- `TWILIO_AUTH_TOKEN` (required, server-only — never exposed)
- `TWILIO_MESSAGING_SERVICE_SID` (preferred sender)
- `TWILIO_FROM_NUMBER` (fallback sender — set either)

### Customer trigger code + daily cron — shipped (Phase H.1–H.4)

Stacks on the Phase H foundation. Adds the customer-side automated triggers and the scheduled-function cron the foundation always anticipated.

DB seed — `docs/db/2026-04-25-phase-h1-sms-trigger-foundation.sql`
- 5 idempotent `notification_templates` rows, all GSM-7 safe and ≤120 chars: `customer.invoice_sent`, `customer.cleaner_on_the_way`, `customer.job_reminder_day_before`, `contractor.job_reminder_day_before`, `customer.payment_reminder`. `ON CONFLICT (type, channel, audience) DO NOTHING` — safe to re-apply.

H.2 — `customer.invoice_sent` SMS after the invoice email succeeds
- Wired into `sendInvoiceEmail` (`src/app/portal/invoices/[id]/_actions.ts`).
- Fires after the Resend call succeeds and the invoice row is marked `sent`.
- Try/catch wrapped so any SMS-path failure cannot revoke the email-success contract.

H.3 — Contractor "On my way" customer SMS
- Server action `contractorOnTheWaySms(jobId)` (`src/app/contractor/jobs/[id]/_actions-notify.ts`). No mutation of `jobs.status` or `started_at` — distinct from `contractorStartJob`.
- `OnTheWayButton.tsx` renders on the contractor job page when status is `draft`/`assigned`.
- Same-day dedupe: at most one `cleaner_on_the_way` send per job per calendar day.
- Customer phone resolved server-side; contractor never sees it.

H.4 — Daily SMS cron (day-before + overdue payment cadence)
- Route handler `/api/cron/daily-notifications` (`POST`+`GET`), Bearer `CRON_SECRET` auth, service-role Supabase client.
- Netlify scheduled function `netlify/functions/daily-notifications.mts` + matching `netlify.toml` entry. Schedule: `0 21 * * *` UTC = 09:00 NZST / 10:00 NZDT.
- Task A — Day-before reminders. Jobs where `scheduled_date` = tomorrow (NZ-local), status `draft`/`assigned`. Sends `job_reminder_day_before` to client + contractor. Per-job per-audience same-day dedupe via `notification_logs`.
- Task B — Overdue payment cadence. Invoices status=`sent` and `due_date < today` (NZ-local). Cadence: first reminder at `daysOverdue >= 3`; subsequent only when last reminder ≥ 7 days ago; hard cap 3 per invoice. State derived from `notification_logs` — no schema additions.
- Failures in one task don't block the other; per-row errors captured in `summary.errors[]`.

Required env vars (all confirmed set on Netlify, all scopes, 2026-04-26):
- `CRON_SECRET` — Bearer token shared between scheduled function + route handler
- `NEXT_PUBLIC_SITE_URL` — used for invoice share links in `payment_reminder` template

Production state
- Deployed via PR #80 → `main@8818a3d` (2026-04-26).
- Skip-path validation passed: cron manually fired returned `{ ok: true }`; the 3 overdue-invoice attempts and the invoice-send trigger logged `skipped` rows at the customer-channel gate as expected; `notification_logs` writes confirmed.
- Real-SMS end-to-end validation intentionally deferred. `notification_settings.channels.customer_sms_enabled = false` acts as a deliberate safety net while operator opt-out (STOP/HELP) handling is still pending.
- No real customer SMS sent at any point during validation.

### SMS inbound + delivery + compliance — shipped (Phase H.5)

Adds inbound SMS handling, delivery-status callbacks, and an opt-out gate. Deployed via PR #82 → `main@b9077e43` (2026-04-26).

DB migration — `docs/db/2026-04-26-phase-h5-sms-inbound-compliance.sql`
- `clients.opted_out_sms boolean default false`, `opted_out_sms_at timestamptz`, `opted_out_sms_keyword text` + partial index.
- `notification_logs.delivery_status text`, `delivery_updated_at timestamptz` for post-send Twilio callbacks. Internal `status` (sent/failed/skipped) untouched by callbacks.
- New `notification_inbound_messages` table — append-only log of every inbound SMS, with detected keyword, action_taken, matched client, full Twilio payload jsonb. Staff read RLS.

`src/lib/notifications/twilio-validate.ts`
- HMAC-SHA1 signature validator. Validates `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN` using the URL + alphabetised form params, base64-compared in constant time.

`src/lib/notifications/inbound-handler.ts`
- Keyword classifier: `STOP`/`STOPALL`/`UNSUBSCRIBE`/`CANCEL`/`END`/`QUIT` and `HELP`/`INFO`. Exact-token match after trim+upper, so conversational replies don't false-positive.
- Help reply body directs to phone + email (`hello@sano.nz`) — does NOT promote SMS opt-out keywords because reliable inbound replies aren't supported on the current US long-code sender to NZ mobiles. Email is the authoritative opt-out path.

`src/app/api/twilio/inbound-sms/route.ts`
- POST endpoint for the Messaging Service inbound webhook. Validates signature, classifies the body, looks up the client by phone, sets `opted_out_sms=true` on STOP, returns the help reply on HELP, always persists a row in `notification_inbound_messages`. GET → 405.

`src/app/api/twilio/status/route.ts`
- POST endpoint for the Messaging Service status callback. Updates `notification_logs.delivery_status` + `delivery_updated_at` by `provider_message_id`. GET → 405.

`src/lib/notifications/send.ts` — gate 8
- Customer opt-out gate added between recipient phone check and Twilio send. Direct PK lookup by `clientId` (preferred) with phone-based fallback. Skips with reason `"Client opted out (STOP)."` Contractor sends are not gated here. Test-source sends bypass.

Production state — operational use is one-way SMS only
- Twilio webhooks configured 2026-04-26 pointing at `https://sano.nz/api/twilio/inbound-sms` and `https://sano.nz/api/twilio/status`. Routes verified reachable in production (signature-validation 403 / GET 405 as expected).
- Skip-path validation passed (cron returned `{ ok: true }`; overdue + invoice attempts logged `skipped` rows at the customer-channel gate).
- **Reliable inbound replies from NZ mobiles to the current US long-code Twilio sender are not supported.** The inbound webhook code is in place for future sender / provider changes, but real STOP/HELP customer-reply validation is deferred until the sender is upgraded (NZ short code, alphanumeric sender id, or a different provider).
- Current production posture: one-way operational SMS. `customer_sms_enabled` can be turned on for outbound customer SMS without depending on inbound SMS opt-out. Templates direct customers to email/phone for opt-out and questions.

### In Flight (Phase H.x)

*Update only at phase boundaries (push → PR → merge → verified). Items move out of this section into "shipped" only after deployed and verified.*

None currently.

---

## Portal access (Phase 5.5) — IN PROGRESS

End-to-end portal-access system: invite, reset, disable, role-based redirects, mobile-first contractor surface, PWA install. Replaces the manual Supabase-dashboard workflow.

### Architecture
- **Auth source of truth:** Supabase Auth.
- **Email transport:** Resend, branded templates only — Supabase's default templates are bypassed by using `auth.admin.generateLink()` server-side, then sending the link via our own templates.
- **Role-based redirects:** existing middleware (staff → `/portal`, contractor → `/contractor`) extended in 5.5.5 for `/client/*` (future).

### Sub-phases
- **5.5.1 — Auth invite + reset core** (✅ shipped, PR #93 merged to `main@952c174`). Server helpers (`inviteUser`, `requestPasswordReset`, `disableAccess`, `enableAccess`) in `src/lib/auth-invites.ts`; branded transactional email templates added to `src/lib/resend.ts`. Public pages at `/portal/forgot-password` + `/portal/reset-password` with explicit loading / success / expired-link states and role-aware auto-redirect after password set. Login page gains "Forgot password?" link. No DB migration in 5.5.1; no admin UI yet (lands in 5.5.2 / 5.5.3).
- **5.5.2 — Staff table + invite UI** (✅ shipped, PR #94 merged to main). Migration `docs/db/2026-04-26-phase-5-5-2-staff.sql` applied: new `public.staff` table with `id, full_name, email, role (admin|staff), auth_user_id, invite_sent_at, invite_accepted_at, access_disabled_at, access_disabled_reason, created_at, updated_at`. RLS: admin read/write, staff self-read by `auth_user_id = auth.uid()`, contractors blocked. Server actions in `src/app/portal/staff/_actions.ts`: `createStaff`, `updateStaff`, `inviteStaffUser` (uses 5.5.1 `inviteUser` helper), `disableStaffAccess` (with reason), `enableStaffAccess`, `markStaffInviteAccepted` (called from reset-password page). Pages: `/portal/staff` list (card mobile + table desktop), `/portal/staff/new`, `/portal/staff/[id]` (detail with InviteActions + audit timeline), `/portal/staff/[id]/edit`. Status pill computed from lifecycle timestamps: `not_invited` → `invited` → `active`; `disabled` overrides. Disable bans the auth user (8760h ban_duration) and sets `access_disabled_at`/`access_disabled_reason`; re-enable clears both and unbans. Admin cannot disable own access (lockout guard). Staff link in nav (Workforce group) replaces the previous "Coming soon" placeholder. Audit actions: `staff.created`, `staff.updated`, `staff.invite_sent`, `staff.access_disabled`, `staff.access_enabled`.
- **5.5.3 — Contractor portal access + staff tweaks** (in progress, branch `feat/contractor-access-phase-5-5-3`). Migration `docs/db/2026-04-26-phase-5-5-3-contractor-access.sql` applied: `contractors` gains `invite_accepted_at`, `access_disabled_at`, `access_disabled_reason` (mirroring staff); index `contractors_auth_user_idx`. Staff RLS extended with `staff_all_read` so any authenticated staff can read the team list (writes still admin-only). New `_actions-access.ts` server actions: `inviteContractorUser` (gated on `enable_contractor_portal` setting; persists `auth_user_id` from `generateLink` response), `disableContractorAccess` (with reason), `enableContractorAccess`, `markContractorInviteAccepted` (called from reset-password page after the staff fallback). New components `ContractorAccessActions` + `ContractorAccessPanel`: 5-state status pill (`not_invited` / `invited` / `active` / `disabled` / `feature_disabled`), action buttons (Send/Resend invite, Disable with reason modal, Re-enable), 44px tap targets. Contractor detail page: replaces the old read-only Portal access section with the new panel. Contractor list page: adds Access column (desktop) + chip (mobile) computed via `contractorAccessStatus()`. Reset-password form now calls `markContractorInviteAccepted` when the user matches a contractor row. Staff InviteActions gain a "Access is disabled. Contact admin if this is unexpected." callout when status is disabled. Workforce settings extended with `enable_contractor_portal` (default true). Audit actions: `contractor.invite_sent`, `contractor.access_disabled`, `contractor.access_enabled`. Pending: PR + merge.
- **5.5.4 — PWA + mobile UX** (planned). `manifest.json`, app icons, standalone display, install prompt; sticky bottom action bar on `/contractor/jobs/[id]`; card-based mobile job list.
- **5.5.5 — Customer-portal scaffold** (planned). `clients.auth_user_id`, middleware hook for `/client/*`, `enable_customer_portal` setting. No customer UI yet.

### Settings additions (planned, 5.5.2+)
Extend `workforce_settings.value` with: `invite_email_subject`, `invite_email_body_template`, `reset_email_subject`, `reset_email_body_template`, `invite_expiry_days` (default 7), `enable_contractor_portal` (default true), `enable_customer_portal` (default false).

---

## Applicant pipeline (Phase 5)

Inbound recruitment funnel — public Join Our Team submissions land in the `applicants` table; staff triage in `/portal/applicants`.

### In Flight

*Update only at phase boundaries (push → PR → merge → verified). Items move out of this section into "shipped" only after deployed and verified.*

- **Phase 5 — Foundation** — built on `feat/applicant-pipeline-phase-5`. Migration `docs/db/2026-04-26-phase-5-applicants.sql` applied to Supabase. Public form (`/api/submit-application`) now inserts into `applicants` with `status='new'`. Staff portal at `/portal/applicants` (status filter list + detail page with status update + notes). Nav entry added under Workforce. "Convert to contractor" placeholder button on detail. Pending: PR + merge + production validation.
- **Phase 5.1 — Pipeline polish** — built on `feat/applicant-pipeline-polish-phase-5-1`. Migration `docs/db/2026-04-26-phase-5-1-applicants-pipeline.sql` applied. Replaces 6-status enum with the final 9-status pipeline (new / reviewing / phone_screen / approved / onboarding / trial / ready_to_work / on_hold / rejected). Adds `trial_required`, `trial_scheduled_for`, `trial_outcome`, `rejection_reason`, `on_hold_reason`. List view: search, type filter, sort (Needs action default, Newest, Oldest), stale-dot for `new` >7 days, hide-rejected toggle. Detail view: stage-action panel (forward action + Reject + Put-on-hold with reason capture + Reopen), trial section (toggle + schedule + pass/fail outcome buttons), audit-log activity timeline, rejection/on-hold reason display. Every status mutation writes to `audit_log`. Pending: PR + merge + production validation. NOT included: contractor conversion (5.2), onboarding UI (5.3), AI assist (5.6).
- **Phase 5.4 (locked) — 4-status model + workforce_settings + admin override** — extends `feat/workflow-gates-phase-5-4`. New status value `ready` between `onboarding` and `active`: when the required checklist hits 100%, `contractors.status='ready'` (auto) + `ready_at=now()`; admin then clicks Mark ready to work / Activate Worker (`markContractorActive`) to flip `status='active'` + `activated_at=now()`. Auto-activation still available when `require_admin_activation_approval=false` AND trial passes (or not required). Settings table renamed `onboarding_settings` → `workforce_settings`; key `block_assignment_until_onboarding_complete` → `block_assignment_until_ready` (legacy key still tolerated by the loader during transition). `assignJob` gate uses the new key; messages updated to "Worker is not ready for job assignment." New admin override (`adminOverrideActivate`) with a required reason — bypasses both onboarding completion and the trial gate, captured in `admin_override_activation` audit row alongside which gate was bypassed. Detail page status badge tones distinguish active / ready / onboarding; AdminOverrideButton renders for admin while status ≠ active. Contractors list status column reads Onboarding / Ready / Active directly. Migration `docs/db/2026-04-26-phase-5-4-locked-ready-state.sql` applied (idempotent rename + status CHECK extension + ready_at/activated_at columns). Audit log additions: `admin_override_activation`. Pending: PR + merge + production validation.
- **Phase 5.4 — Workflow gates + settings + trial enforcement** — built on `feat/workflow-gates-phase-5-4`. Migration `docs/db/2026-04-26-phase-5-4-workflow-gates.sql` applied: new `onboarding_settings` JSONB singleton (require_admin_activation_approval, block_assignment_until_onboarding_complete, insurance_expiry_warning_days, trial_required_default, contractor_required_items[], employee_required_items[]) with safe defaults; `contractors.trial_status` (CHECK not_required/not_started/scheduled/passed/failed), `trial_scheduled_for`, `trial_outcome_note`. Settings load via `lib/onboarding-settings.ts` with code-defined fallback. Activation gate: `recomputeOnboardingStatus` honours `require_admin_activation_approval` — when true, hits `onboarding_status='complete'` but holds `status='onboarding'`; admin clicks "Mark ready to work" (new `markContractorActive` action) which re-validates onboarding completion + trial gate before flipping `status='active'`. Trial enforcement: new contractor-side server actions (`setContractorTrialRequired`, `scheduleContractorTrial`, `recordContractorTrialOutcome`) drive a full `TrialPanel` component on the detail page (toggle / schedule / pass-fail). Job assignment gate: `assignJob` extended to block when contractor.status != 'active' OR onboarding_status != 'complete' OR (trial_required && trial_status != 'passed'); insurance expiry remains a separate hard-stop. Insurance warning banner on contractor detail surfaces `expired` / `expiring within insurance_expiry_warning_days` / `missing` for `worker_type='contractor'`. Onboarding panel now renders Optional pip on items not in the required-items setting and a "Ready for activation" banner + MarkActiveButton when required checklist hits 100%. Contractors list distinguishes Onboarding / Ready for activation / Active. Audit log gains `contractor.onboarding_completed`, `contractor.activated`, `contractor.trial_required_changed`, `contractor.trial_scheduled`, `contractor.trial_passed`, `contractor.trial_failed`. Pending: PR + merge + production validation. NOT included: settings UI page (deferred to a settings phase), full doc-upload review system (deferred), contractor self-serve onboarding.
- **Phase 5.3 — Onboarding system + worker_type restructure + trial visibility** — built on `feat/onboarding-system-phase-5-3`. Migration `docs/db/2026-04-26-phase-5-3-onboarding-system.sql` applied: `contractors.worker_type` collapsed to {contractor, employee}; new `contractors.employment_type` (CHECK casual/part_time/full_time, nullable) carries the prior sub-classification for employees. Existing rows migrated automatically. New `contractor_onboarding` table seeds a per-worker-type checklist (Personal Details, Payment Details, Compliance, Documents, Training) at conversion time via `lib/onboarding-checklist.ts`. Server actions `setOnboardingItemStatus` + `seedContractorChecklist` toggle items, recompute progress, and auto-advance `contractors.onboarding_status` (pending → in_progress → complete) and flip `contractors.status` to `active` on full completion. Contractor detail page: new Onboarding panel (progress bar, grouped checklist, complete-with-timestamp, optional seed-recovery), worker-type + employment-type chips, trial visibility ("Trial required" / "Trial skipped"). Applicant detail page: at-a-glance trial visibility surfaced near the top. ContractorForm + `contractors._actions` updated to accept the new (worker_type, employment_type) shape. Polish rolled forward: applicant→contractor redirect tightened from 900 ms to 600 ms, consistent border-2 sage-500 selected style across cards, clearer section headers. Pending: PR + merge + production validation. NOT included: trial-gate / `assignJob` block (5.4), settings tables (5.5), AI assist (5.6).
- **Phase 5.2 — Applicant → Contractor conversion + onboarding seed + quote stepper polish (rolled forward)** — built on `feat/applicant-conversion-phase-5-2`. Migration `docs/db/2026-04-26-phase-5-2-applicant-conversion.sql` applied: contractors gains `source_applicant_id`, `onboarding_status` (CHECK not_started/in_progress/complete), `onboarding_started_at`, `onboarding_completed_at`, `trial_required`, `suburb`; `status` CHECK extended with `onboarding`. New server action `startContractorOnboarding(applicantId, workerKind, trialRequired)` creates the contractor row (`status='onboarding'`, `onboarding_status='in_progress'`), updates the applicant (`status='onboarding'`, `converted_contractor_id`, `converted_at`), email-deduplicates, idempotent on retry, audits as `applicant_converted_to_contractor`. Detail page gains Onboarding card with "Start Onboarding" button (only when `status='approved'`) opening a modal: worker-kind radio (Independent contractor → `worker_type='contractor'`, Sano team member → `worker_type='casual'`), "Skip trial (experienced applicant)" toggle. After confirm, redirects to `/portal/contractors/[id]`. Quote stepper polish rolled forward into this PR (subsumes the open `fix/quote-stepper-address-and-cards`): Mapbox address autocomplete with suburb auto-fill + "Suburb auto-filled from address" hint, motion-cards with green border/tint/check-pip + tap-scale, 120 ms auto-advance delay, "Step X of Y · Title" progress label, refreshed confirmation copy. Pending: PR + merge. NOT included: onboarding checklist UI (5.3), trial gates / `assignJob` block (5.4), settings tables (5.5), AI assist (5.6).

### Future phases (planned, not yet started)

- **Interview scheduling** — slot offers, applicant-side accept/decline, calendar integration.
- **Applicant → contractor conversion** — wires `converted_contractor_id` + `converted_at`, copies name/email/phone, creates a contractor row, optionally an auth user.
- **Online contracts / signing** — generate contractor agreement PDF, e-signature flow.
- **Training / compliance assignment** — auto-assign required modules from `training_modules` on conversion.
- **Onboarding checklist** — multi-step task list per converted applicant tracking insurance / right-to-work / training / equipment.
