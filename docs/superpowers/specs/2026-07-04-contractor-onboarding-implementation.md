# Spec — Contractor onboarding: connect & complete the existing system

> Status: **implementation spec (revised).** Supersedes the planning spec
> 2026-07-04-online-contractor-onboarding.md. **No coding** until approved.
> Date: 2026-07-04
> Principle (Mike): improve and connect the EXISTING systems — do not build a
> second onboarding flow. Reuse `contractors`, `contractor_onboarding`,
> `worker_documents` + `worker-documents` bucket, `training_modules` +
> `worker_training_assignments`, the trial/capability fields, and
> `contractor-compliance.ts`.

## 0. The five states every item must be classifiable as
1. **Supplied by contractor** — data typed on the sign form.
2. **Uploaded by contractor** — a file the contractor attaches.
3. **Acknowledged by contractor** — a training module they acknowledge/complete.
4. **Verified by Sano** — staff-only confirmation an upload/fact is valid.
5. **Competency confirmed by Sano** — staff-only sign-off they can do the work.

Every checklist item and field below is tagged with one of these.

---

## 1. Final proposed onboarding checklist (contractor)

Seeded into `contractor_onboarding`. `who` = who completes it; `auto` = set by the
system, never a manual tick. Required/optional stays driven by
`workforce_settings.contractor_required_items` (+ the `right_to_work_required`
flag gating the RTW rows).

| section | item_key | label | who | auto? |
|---|---|---|---|---|
| Personal Details | `confirm_details` | Personal details confirmed | contractor (supplied) | ✅ on sign |
| Payment Details | `bank_details` | Bank account details provided | contractor (supplied) | ✅ on sign |
| Documents | `contract_signed` | Agreement signed | contractor (supplied) | ✅ on sign |
| Compliance | `insurance_uploaded` | Insurance certificate uploaded | contractor (uploaded) | ✅ on upload |
| Compliance | `insurance_verified` | Insurance verified | **Sano (verified)** | manual |
| Compliance | `id_uploaded` | Photo ID uploaded | contractor (uploaded) | ✅ on upload |
| Compliance | `id_verified` | ID verified | **Sano (verified)** | manual |
| Compliance | `right_to_work_uploaded` | Right-to-work evidence uploaded (if required) | contractor (uploaded) | ✅ on upload |
| Compliance | `right_to_work_verified` | Right-to-work verified (if required) | **Sano (verified)** | manual |
| Compliance | `tax_review` | Tax treatment reviewed (IR330C) | **Sano (verified)** | manual |
| Induction | `induction_completed` | Induction & policy modules completed | contractor (acknowledged) | ✅ when all required auto-assigned contractor modules acknowledged+completed |
| Competency | `competency_confirmed` | Competency confirmed | **Sano (competency)** | manual |

Notes:
- `id_verified`, `insurance_verified`, `right_to_work_verified`, `tax_review`,
  `competency_confirmed` are **verification/competency** items — never
  auto-completed, staff-only (the checklist UI is already admin-gated; the server
  action will additionally refuse to auto-set these).
- The old generic `onboarding_training` item is replaced by `induction_completed`
  (module-driven). `ird_provided`/`kiwisaver` remain employee-only, unchanged.
- Company-evidence upload is optional and only relevant for company/partnership/
  trust structures; no separate checklist row (surfaced in Documents + tax_review).

## 2. Contractor-facing flow (the secure `/agreement/[token]` journey)

1. **Read** the agreement (branded document).
2. **Supply details** (existing sign form) + **new: business structure block** —
   How do you invoice? (Sole trader · New Zealand limited company · Partnership ·
   Trust · Other) + company/trading name + NZBN/company number where relevant.
3. **Upload evidence** (new, reusing `worker_documents`): public liability
   insurance certificate, photo ID, right-to-work evidence (only if the agreement
   is flagged RTW-required), company/NZBN evidence (only if not sole trader).
   Contractor sees only their own upload widget — **no staff document controls**
   (no list of others, no delete/verify).
4. **Acknowledge & complete induction modules** — the auto-assigned contractor
   modules (H&S, security, privacy/conduct, equipment/chemicals) via the existing
   `/contractor/training` acknowledge/complete flow. (Can be done at sign time or
   from the contractor portal after invite — spec allows both; induction item
   completes when all required ones are done.)
5. **Sign** (typed-name e-signature). On signing: contractor/employee record
   created or updated (existing), the three `auto on sign` checklist items
   complete, uploaded docs attach to the contractor, structure + derived tax
   status stored, confirmation email + signed PDF (existing).

## 3. Staff verification flow (`/portal/contractors/[id]`)

Onboarding panel (existing) now shows the split checklist. Staff:
- Review each uploaded document (existing Documents section) and tick the matching
  **_verified** item.
- Confirm **tax_review** (IR330C required / not required-company / manual review —
  see §4), recording the outcome.
- Confirm **competency_confirmed** (see §6) — records assessor + date + trial
  outcome + capability.
- Activation (`markContractorActive`) stays **blocked** until all *required*
  verification, induction and competency items are complete (+ trial passed where
  required) — existing gate, extended to the new required items.

## 4. Trading structure & tax review

- **Captured from contractor:** `business_structure` (values: `sole_trader`,
  `company` → relabel "New Zealand limited company", `partnership`, `trust`, and
  **new** `other`), `company_name`, `nzbn`.
- **Derived staff review status** (new column `contractors.ir330c_status`), set at
  capture, confirmed by staff — NOT auto-deciding tax:
  - `sole_trader`/`other` (individual) → `review_required` ("IR330C review required")
  - `company` → `likely_not_required` ("generally no IR330C, confirm")
  - `partnership`/`trust` → `manual_review`
  - staff-confirmable to `confirmed_required` / `confirmed_not_required`.
- Agreement wording stays **conditional** (clause 5 already handles this). **No
  employee tax-code (ND/45%) logic on contractors.** Existing `ir330_received`
  boolean stays for "IR330C on file" where applicable.
- The `tax_review` checklist item reflects staff confirmation of this status.

## 5. H&S induction & policy acknowledgement (via training modules)

Seed four **contractor** modules (idempotent by a new stable `key`), each with a
`version`, `requires_acknowledgement=true`, `requires_completion` where
appropriate, `applies_to='contractor'`, `auto_assign=true`:
1. `hs_induction` — Sano contractor health & safety induction
2. `security_property` — Security, keys, alarms & client-property requirements
3. `privacy_conduct` — Privacy, confidentiality & professional conduct
4. `equipment_chemicals` — Equipment, chemical & incident-reporting requirements

- **Auto-assigned** on contractor onboarding (in `startContractorOnboarding`, and
  on signing when a contractor is created outside the applicants pipeline).
- Content authored in `training_modules.content` (staff-editable); the agreement
  retains the legal obligations — these modules are the **operational induction
  record**. They appear in the contractor portal (`/contractor/training`) and on
  the staff contractor record (existing Training section).
- `induction_completed` checklist item auto-completes when all required
  auto-assigned contractor modules are acknowledged + (where required) completed.

## 6. Competency sign-off (staff, reuse trial + capability)

New staff-only **"Competency confirmed"** action on the contractor record that
records, in one place:
- `competency_confirmed_by` (assessor), `competency_confirmed_at` (date)
- trial outcome (existing `trial_status`/`trial_outcome_note`)
- `experience_level`, `approved_services`, `can_work_solo`, `can_lead_jobs`,
  `key_holding_approved` (existing fields — surfaced/confirmed here)
- `competency_limitations` (new), `competency_notes` (new)

Completing it sets `competency_confirmed`. Activation stays blocked until all
required verification + induction + competency items complete.

## 7. Renewal notifications (LATER phase, separate approval)

Keep the existing `/portal/alerts` dashboard flags (`contractor-compliance.ts`,
30-day window). Add a cron (extend `api/cron/daily-notifications`) that emails
**Sano staff only** when insurance or right-to-work expiry is within 30 days, or
expired. Reuse `worker_training_assignments.last_reminder_sent_at` pattern for a
per-item `last_reminder_sent_at` so staff aren't spammed daily. **No messages to
contractors** until wording + cadence approved.

---

## 8. Deliverables

### 8a. Database changes (additive; Mike-run migrations)
- `contractors`: `ir330c_status text`, `competency_confirmed_at timestamptz`,
  `competency_confirmed_by uuid`, `competency_limitations text`,
  `competency_notes text`. **Remove** `id_sighted` (see 8c).
- `worker_documents`: `agreement_id uuid` (nullable, links a signer's upload
  before the contractor row exists; backfilled to `contractor_id` on sign),
  optional `verified_at`/`verified_by` (per-doc; primary verification stays the
  checklist).
- `training_modules`: `key text unique`, `version text`, `applies_to text`
  (contractor/employee/both, default 'both'), `auto_assign boolean default false`.
- No new tables. No new buckets.

### 8b. Existing fields/tables/components reused (NOT rebuilt)
- Tables: `contractors` (structure/insurance/RTW/keys/equipment/competency
  fields all already exist), `contractor_onboarding`, `worker_documents`,
  `training_modules`, `worker_training_assignments`, `contractor_incidents`.
- Bucket: `worker-documents`.
- Components: `DocumentUpload`/`DocumentList`, `OnboardingPanel`/
  `OnboardingChecklistItem`, `TrialPanel`, `ContractorForm`, `AssignModule`,
  contractor `/training` acknowledge/complete, `contractor-compliance.ts`,
  `workforce-settings.ts`, `SignAgreementForm`.
- Actions: `assignModuleToContractor`, `setOnboardingItemStatus`,
  `seedContractorChecklist`, `uploadDocument`, `startContractorOnboarding`,
  `signEmploymentAgreement`.

### 8c. Fields proposed for removal
- `id_sighted` (on `contractors`, `employment_agreements`, `employees`) —
  **audited in Phase 1** (see `docs/db/2026-07-16-id-sighted-deprecation.md`):
  no app code, function, view, trigger, report, PDF, or flow reads/writes it, and
  **0 non-null rows** exist anywhere. Semantically redundant with `id_verified`
  (and the new `id_uploaded`/`id_verified` split). **Decision: deprecated now,
  column left in place; drop in a later cleanup migration after the new
  verification flow is live and tested** — NOT dropped in Phase 1.

### 8d. Permissions & RLS
- **Contractor uploads** go through a token-authed server action on the sign flow
  using the service-role client (same trust model as `signEmploymentAgreement`) —
  the contractor never gets a Supabase session. They may upload only against their
  own agreement token; they cannot list, download, delete, or verify.
- `worker-documents` bucket stays **private**; downloads via staff signed URLs
  (existing). RLS on `worker_documents`: staff (non-contractor) read/write;
  contractor-portal read limited to own rows if ever exposed (not in this phase).
- Checklist **_verified / tax_review / competency_confirmed** items: the server
  action rejects setting these except by an admin/staff user, and never
  auto-completes them.
- Every upload, verification, tax-status change, competency sign-off, and
  auto-completion writes an `audit_log` row.

### 8e. Migration & backfill plan (existing contractors)
1. Add columns + seed the 4 modules (idempotent by `key`).
2. For each existing contractor with a `contractor_onboarding` set: insert the new
   split items (idempotent by `contractor_id,item_key`); **auto-complete** the ones
   objectively already satisfied — `contract_signed` if `contract_signed_date` set;
   `insurance_uploaded` if an `insurance` document exists; `id_uploaded` if an
   `id_verification` doc exists; leave all `_verified`/`competency`/`tax_review`
   pending for staff.
3. Auto-assign the 4 modules to existing active/onboarding contractors (so they
   appear), status `assigned`.
4. Derive `ir330c_status` from existing `business_structure` where present; else
   leave null → shows as "needs review".
5. `id_sighted` removal last, after ref-check.

### 8f. Phases & acceptance criteria
- **Phase 1 — Fixes.** Map `insuranceCover`→`insurance_liability_cover` on sign;
  align insurance wording (sign form ↔ agreement ↔ Sano's actual minimum);
  business_structure NZ labels + `other`; remove `id_sighted`.
  *AC:* signing a contractor writes cover amount to the contractor; sign-form
  insurance text matches the agreement; structure dropdown shows the 5 NZ options;
  no `id_sighted` reference remains and column dropped.
- **Phase 2 — Connect + checklist redesign + backfill.** New split template;
  signing auto-completes `confirm_details`/`bank_details`/`contract_signed`;
  verification items staff-only; backfill existing contractors.
  *AC:* a fresh signing ticks exactly the three auto items and nothing else; a
  staff user can tick `_verified` items and a contractor/system cannot; existing
  contractors show the new items with satisfied ones pre-ticked.
- **Phase 3 — Contractor uploads.** Upload insurance/ID/RTW/company on the sign
  flow → `worker_documents` (+ `agreement_id`), attach to contractor on sign,
  visible in staff Documents; `*_uploaded` items auto-complete; type/size
  validation (pdf/jpg/png, ≤10 MB), private storage, audit.
  *AC:* a contractor uploads a cert; it appears in the staff Documents list and
  `insurance_uploaded` is ticked; invalid type/size is rejected; contractor sees
  no staff controls.
- **Phase 4 — Structure & tax review.** Structure/NZBN on the sign form;
  `ir330c_status` derived + staff-confirmable; `tax_review` item.
  *AC:* choosing "Sole trader" yields `review_required`; "New Zealand limited
  company" yields `likely_not_required`; staff can confirm; no contractor tax-code
  logic added.
- **Phase 5 — Induction modules.** Seed + version + auto-assign the 4 modules;
  `induction_completed` reflects them.
  *AC:* onboarding a contractor auto-assigns 4 modules; acknowledging+completing
  all required ones ticks `induction_completed`; modules show in both portals.
- **Phase 6 — Competency sign-off.** Staff action records assessor/date/trial/
  capability/limitations/notes; sets `competency_confirmed`; activation gate.
  *AC:* activation is blocked until required verification + induction + competency
  complete; the sign-off records all listed fields + audit.
- **Phase 7 — Renewal reminders (later, separate approval).** Staff-only email for
  insurance/RTW expiry ≤30 days + expired; per-item throttle; no contractor
  messages.
  *AC:* a contractor with insurance expiring in 20 days triggers one staff email,
  not repeated daily; contractors receive nothing.

## 9. Re-check note
Before each phase, re-verify against the live codebase (field names, existing
required-items settings, the activation gate logic, and the training assign/ack
flow) since this spec builds directly on them.
