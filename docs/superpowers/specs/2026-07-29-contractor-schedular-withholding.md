# Contractor setup, master agreement, service schedules, tax/GST & schedular withholding — design

> **Status:** DESIGN FOR REVIEW — PR 1 to follow (staff-led setup + missing-info
> workflow + master agreement + service schedules + commercial-term capture; **no
> tax money movement**).
> **Guardrails:** Do NOT alter Myrtle's production record, send her an agreement,
> change historical payments, or begin remediation. Migrations are Mike-run.
> Nothing about Myrtle is hard-coded — she is entered through the same generic flow.

---

## 0. What this replaces / why

Trigger: Myrtle's commercial cleaning at Pukekohe Golf Club is a **schedular-payment
activity** (IR330C lists commercial cleaning). Sano's hard-coded "cleaning isn't
schedular" (`gst.ts:2-7`) is wrong. But the fix is bigger than withholding: Sano needs
a **flexible, staff-led setup platform** — enter what's known, mark the rest "contractor
to confirm", email a secure link, the contractor completes only what's missing, staff
review critical changes, and the agreement + service schedules generate from structured
data. No per-contractor code.

### Confirmed current gaps this design must close
- No contractor withholding calc / liability / payday-filing.
- IR330C = one boolean + untyped upload.
- Contractor tax & GST overwrite with no history.
- `tax_treatment` and `tax_review_status` disconnected.
- Agreement fields not structure-aware; entity/bank details unvalidated free text.
- GST effective date not mandatory when registered.
- Remittance snapshots persist no GST/withholding.
- Historical CIs may be `not_assessed`.
- Contractor remittance wording wrongly says all contractors handle their own tax.

---

## 1. Core principle — staff-led draft → secure link → contractor completes → staff review

1. Staff create the contractor and enter known commercial details.
2. Uncertain fields marked **contractor to confirm** (never "verified").
3. Contractor gets an **emailed secure link** (token, no portal login — reuse the
   `agreement/[token]` pattern).
4. Contractor completes/confirms **only** missing/unverified/expired/structure-required/
   treatment-required/schedule-required sections.
5. Staff review critical changes + evidence; **critical fields require staff acceptance**
   (never silent overwrite).
6. Agreement + service schedules generate from the structured data.
7. **Payment stays blocked** where required tax info is unresolved.

### Per-field/section status (ownership + verification)
`confirmed_by_sano · contractor_to_confirm · contractor_to_complete · sano_review_required ·
verified · not_applicable`. An *expected* structure/GST status is **never** `verified`.

---

## 2. Master agreement vs service schedules (the key separation)

One **master contractor agreement** per contractor + **many** work arrangements
("service schedules"), current & historical. No universal contractor rate.

**Master** covers: contracting identity/entity, independent-contractor status, tax & GST
declarations, bank details, insurance arrangement, H&S, confidentiality, keys/alarms/
access, equipment & products, invoicing & payment process, statutory deductions,
variations, termination, general responsibilities, and the **obligation to notify Sano**
of entity/tax/GST/bank/insurance changes.

**Each service schedule** is effective-dated and independent (fields in §4.2). Adding a
future arrangement never re-onboards the contractor. The system decides whether the
contractor must: accept only a new schedule · reconfirm tax/GST · provide different
insurance · complete extra competency · sign a replacement master agreement.

---

## 3. Payment model — two orthogonal axes + methods

**`payment_method`** (per schedule): `hourly · fixed_per_clean · fixed_weekly ·
fixed_fortnightly · fixed_monthly · project · custom`.

**`payment_basis`** (separate): `gross_fee · guaranteed_net`.
**`rate_basis`** (separate): `gst_inclusive · gst_exclusive`.

### 3.1 Canonical calculation (pure engine, per schedule, at supply date)

```
GROSS_FEE basis:
  gross_ex_gst = (rate_basis=exclusive) ? agreed_amount
                                        : agreed_amount − gst_of_inclusive
  gst          = gst_applies ? (exclusive ? gross_ex_gst×0.15 : agreed_amount×3/23) : 0
  wht          = schedular ? gross_ex_gst × wht_rate : 0        # GST-EXCLUSIVE base
  net_bank     = gross_ex_gst + gst − wht

GUARANTEED_NET basis (system grosses up; Sano bears the cost):
  gross_ex_gst = guaranteed_net ÷ (1 − wht_rate)                # exact canonical formula
  wht          = gross_ex_gst × wht_rate
  net_bank     = gross_ex_gst − wht            (== guaranteed_net)
  gst          = gst_applies ? gross_ex_gst×0.15 : 0            # separate; NEVER in wht base
  sano_cost    = gross_ex_gst + gst
```
No double counting: withholding always on `gross_ex_gst`; GST never withheld on.
Exemption → `wht_rate=0`. Rate **pending** → preview shows amounts known, rate/cost
"pending tax declaration"; **never guess the rate**.

### 3.2 Myrtle Schedule A (guaranteed_net $1,500/mo, GST-exclusive, not registered, 20% once verified)
| Component | Amount |
|---|---|
| Myrtle receives (net) | $1,500.00 |
| Gross contractor fee (1500 ÷ 0.80) | $1,875.00 |
| Withholding to IRD (1875 × 0.20) | $375.00 |
| GST | $0.00 |
| **Total monthly Sano cost** | **$1,875.00** |

20% is **not** hard-coded — the gross recomputes from whatever verified rate is entered
(e.g. 10% → gross $1,666.67, wht $166.67; 30% → gross $2,142.86, wht $642.86).

---

## 4. Schema (additive, idempotent, Mike-run)

### 4.1 `contractor_service_schedules` (NEW)
```
id uuid pk · contractor_id uuid not null → contractors
schedule_ref text (SCH-xxxx) · name text
customer_client_id uuid → clients · site_id uuid → sites · service_address text
classification text ('residential'|'commercial') · service_type text · work_description text
start_date date · end_date date · term text ('ongoing'|'fixed')
frequency text · expected_units text · work_variability text ('fixed'|'variable')
payment_method text · payment_basis text ('gross_fee'|'guaranteed_net')
rate_basis text ('gst_inclusive'|'gst_exclusive') · agreed_amount numeric
payment_frequency text · tax_treatment_override text
equipment_products text · additional_work_approval text · closure_treatment text
missed_clean_treatment text · rework_responsibility text · expenses_treatment text
travel_mileage text · notice_period text · price_review_date date
payment_reference text · cost_centre text
linked_quote_id uuid → quotes · linked_recurring_job_id uuid → recurring_jobs
insurance_override_ref text
status text ('draft'|'active'|'paused'|'ended'|'superseded')
effective_from date · superseded_at · superseded_by uuid · created_by · approved_by · created_at
```
Effective-dated + superseding (§9). Existing single-rate contractors keep working; a
schedule is added, not required retroactively.

### 4.2 `contractor_tax_declarations` (NEW — immutable, superseding; mirrors employee IR330)
entity type, contracting legal name, **contracting-entity IRD**, NZBN/company number,
IR330C activity, `treatment` (`standard_rate·chosen_rate·tailored_rate·exemption·
no_notification·pending`), `wht_rate` (chosen ≥0.10), tailored ref+expiry, exemption
ref+expiry, declaration_date, effective_date, signed_name/at, declaration_text,
acknowledged, evidence_ref, status(`current·superseded`), supersedes/superseded_by,
verified_at/by. Append-only trigger; one `current` per contractor.

### 4.3 `contractor_gst_history` (NEW — immutable, effective-dated)
gst_registered, gst_number, effective_date, end_date, evidence_ref, status, supersedes,
recorded_at/by. Never infer from turnover; no GST before verified effective date.
`contractors.gst_*` becomes a derived cache of the current row.

### 4.4 `contractor_insurance_arrangement` (NEW — multi-row, scoped, effective-dated)
```
contractor_id · scope ('contractor_default'|'schedule_override') · service_schedule_id
mode ('own_required'|'covered_by_sano'|'not_required'|'pending_review')
-- own_required: required_type, min_cover, insurer, policy_number, effective, expiry,
--   certificate_ref, verification_status, block_config
-- covered_by_sano: sano_policy_ref, insurer, policy_number, cover_type, limit,
--   confirmed_by, confirmed_at, internal_evidence_ref  (NEVER exposed to contractor)
-- effective_from · status ('current'|'superseded') · supersedes_id · superseded_at
```
**Multiple effective-dated rows per contractor** — a `contractor_default` fallback plus
optional `schedule_override` rows for individual schedules. Integrity: partial unique
`(contractor_id) where scope='contractor_default' and status='current'` (one current
default per contractor); partial unique `(service_schedule_id) where
scope='schedule_override' and status='current'` (one current override per schedule);
composite FK `(service_schedule_id, contractor_id) → contractor_service_schedules(id,
contractor_id)` (an override's schedule must belong to the same contractor). Changes
**supersede** (status flips, new current row) — never overwrite. `covered_by_sano` →
no upload step, no "insurance missing", no block; records the internal policy reference
+ who confirmed. The token route never queries this table, so policy details are
structurally unreachable by the contractor. Effective insurance for a schedule =
its current override else the contractor default.

### 4.5 `contractor_setup` (NEW — the staff draft + secure-link workflow)
```
contractor_id · token (secure link) · overall_status (§7)
section_status jsonb  -- per-section: confirmed_by_sano|contractor_to_confirm|...
proposed_changes jsonb -- contractor submissions pending staff acceptance (old→new)
sent_at · submitted_at · reviewed_at · created_by
```

### 4.6 Extensions
- `contractor_invoices`: `service_schedule_id`, `rate_basis`, `payment_basis`,
  `gross_ex_gst`, `wht_rate`, `wht_amount`, `net_payable`, `tax_declaration_id`
  (default `rate_basis='gst_inclusive'` → existing behaviour unchanged).
- `contractor_remittance_items`: `gross_ex_gst`, `gst_amount`, `wht_rate`, `wht_amount`,
  `net_paid`, `tax_declaration_id`, `supply_date`.
- `ird_liability_lines`: `schedular_wht`, `source ('employee'|'contractor')`; include in
  `total_payable`; allow contractor-sourced lines.
- `employment_agreements`: `contracting_entity_type`, `authorised_signatory_name`,
  `authorised_signatory_capacity`; render entity + schedules into the PDF.

---

## 5. Conditional logic (structure- and treatment-aware)

- **Structure** (`sole_trader·company·partnership·trust·other`) shows only relevant
  fields: sole trader → legal name, trading (opt), personal IRD, NZBN (opt), address;
  company → company legal name, trading, company number, NZBN, company IRD, registered
  address, authorised signatory + capacity; partnership/trust → their supported fields.
- **GST** (`not_registered·registered·registration_pending·not_confirmed`): registered →
  number, effective date, end date (opt), evidence; notify-before-change confirmation.
- **Tax** (`ordinary_trade_creditor·schedular_payment·certificate_of_exemption·
  pending_review`): schedular → full IR330C block (§4.2).
- **Insurance** drives whether an upload step even appears (§4.4).
- **Contractor link shows only** missing/unverified/expired/to-confirm/structure-required/
  treatment-required/schedule-required sections — never re-asks current verified data.

---

## 6. Agreement output (PDF)

Master agreement + identity/entity + authorised signatory (where relevant) + tax & GST
declarations + insurance arrangement + **all active service schedules with per-schedule
payment terms** + signing records + declaration/document snapshots + version + supersession
history. Schedules clearly distinguished:
```
Schedule A — Pukekohe Golf Club commercial cleaning — Guaranteed net $1,500 monthly
Schedule B — Residential cleaning services — Hourly rate $[entered by Sano]
```

---

## 7. Statuses

**Agreement/workflow:** `Draft · Ready to send · Awaiting contractor · Contractor
submitted · Sano review required · Changes requested · Ready to sign · Signed · Active ·
Expired · Superseded`. Signing ≠ tax/bank/insurance/compliance verified.

**Staff acceptance required** for changes to: legal name, structure, entity name, IRD,
GST status, GST effective date, bank account, withholding rate, exemption details,
authorised signatory, guaranteed-net/gross-fee terms. Contractor may **flag** an
incorrect commercial term (returns to Sano) but never silently edits rates/customer terms.

---

## 8. Payment controls (hard gates)

- Agreement may be created/sent/signed while tax info is collected.
- **Schedular payment BLOCKED** until a valid IR330C / tailored rate / exemption is
  **verified**. Message: *"Payment blocked: valid contractor tax declaration required."*
  **Do NOT auto-apply the statutory no-notification rate in the first implementation.**
- GST not added until registration + effective date verified.
- Expired exemption/tailored certs block payment.
- Expired insurance → the configured operational/payment block.
- Gate applies to **all** schedular-classified contractors; **never** to genuine
  ordinary trade creditors.
- Every blocker states what's missing + who must complete it.

**Live preview** before sending (gross-fee and guaranteed-net variants per §3), with
monthly & annual totals; pending rate → "final Sano cost: pending tax declaration".

---

## 9. History (no overwrite)

Rate/arrangement changes end/supersede the prior schedule version, create a new
effective-dated version, record who created/approved + whether contractor acceptance is
needed, preserve historical invoices/calculations, and emit a revised schedule/variation.
Master tax/GST/entity records move to effective-dated superseding history (§4.2–4.3).

---

## 10. Affected files (by PR)

Setup flow: NEW `src/lib/contractor-setup.ts`, `src/app/portal/contractors/[id]/setup/**`,
secure `src/app/contractor-setup/[token]/**` (mirrors `agreement/[token]`), email via Resend.
Schedules: NEW `src/lib/contractor-service-schedule.ts`, portal CRUD under
`contractors/[id]/schedules/**`. Agreement/PDF: `employment-agreement-content.ts`,
`agreement/[token]/_actions.ts`, `EmploymentAgreementDocument.tsx`. Tax decl:
`contractor-tax-declaration.ts` (+ panel). GST history: `contractor-gst-history.ts`;
refactor `contractor-gst-snapshot.ts`. Insurance: `contractor-insurance.ts`. Calc:
NEW `src/lib/payroll/contractor-payment-calc.ts` (pure + exhaustive tests). IRD:
`ird-liability-ledger.ts`, `ird-liability.ts`, contractor-run UI. Snapshots:
`_actions-remittance-batch.ts`, `contractor-remittance-data.ts`,
`contractor-statement-snapshot.ts`. Remediation: NEW `contractor-remediation.ts` (read-only).

---

## 11. Migration order (each Mike-run, additive, idempotent, preflight+verify+rollback)

1. `contractor_setup` + `contractor_service_schedules` (PR 1)
2. `employment_agreements` entity/signatory cols + schedule linkage (PR 2–3)
3. `contractor_tax_declarations` (PR 4)
4. `contractor_gst_history` + seeded current row per contractor (PR 5)
5. `contractor_invoices` snapshot cols (default inclusive) (PR 7)
6. `contractor_remittance_items` snapshot cols (PR 9)
7. `ird_liability_lines.schedular_wht` + `source` (PR 8)
8. `contractor_insurance_arrangement` (PR 1/2 — needed for Myrtle's "covered by Sano")

---

## 12. Test plan

- Pure calc engine: gross_fee × {inclusive,exclusive} × {GST, no GST} × {schedular, none,
  exemption}; guaranteed_net gross-up at 10/20/30% (exact reconstitution: net back to
  guaranteed); GST never in wht base; pending-rate → no number invented; rounding.
- Schedule effective-dating: overlapping/superseding; historical preservation.
- Conditional field logic per structure/treatment/insurance mode.
- Payment gate: schedular unresolved → blocked; ordinary creditor → not blocked; expired
  cert/insurance → blocked; message correctness.
- Staff-acceptance: critical field change never silently overwrites.
- Insurance `covered_by_sano`: no upload step, no "missing", no block.

---

## 13. Deployment safeguards

Additive/idempotent migrations, Mike-run, with rollback. `rate_basis` & `payment_basis`
default to today's behaviour → zero change for existing contractors. Withholding fires
only on a schedular snapshot. Pure calc lands tested before wiring. Gauntlet per PR;
Netlify preview before merge. No production financial data altered; historical rows
reported, never rewritten. **PR 1 implements NO tax money movement.**

---

## 14. PR sequence
1. **Staff-led setup flow + contractor missing-info workflow + master-agreement structure
   + service schedules + commercial-term capture** *(this PR — no tax money movement)*
2. Master agreement + multiple service schedules on the signed agreement
3. Structure-aware agreement generation + PDF
4. Structured immutable contractor IR330C declarations
5. Effective-dated contractor GST history
6. Pure payment + gross-up calculation engine
7. Invoice/payable tax snapshots
8. Contractor schedular withholding liability + filing workflow
9. Remittance + statement snapshots
10. Historical remediation reporting (read-only)
11. Operational hard gates + correction workflows

---

## 15. Myrtle worked example (staff-entered, NOT hard-coded)

**Contractor:** sole trader · not GST registered · commercial cleaning · tax_treatment
`schedular_payment` · IR330C required · wht_rate pending · insurance `covered_by_sano`
(own not required, no upload).

**Schedule A — Pukekohe Golf Club commercial cleaning:** customer Pukekohe Golf Club ·
commercial · ongoing · `fixed_monthly` · `guaranteed_net` $1,500 · `gst_exclusive` · not
registered · schedular · rate pending → preview (once 20% verified): receives $1,500,
gross $1,875, wht $375, GST $0, Sano cost $1,875.

**Schedule B — Residential cleaning:** `hourly`, rate entered by Sano, payment_basis &
rate_basis chosen independently, tax treatment confirmed for that work, linked to
customer/job. The hourly rate never touches Schedule A's fixed monthly amount.

Future commercial/Airbnb/EOT/temp-cover/project work → new schedules, no re-onboarding.
</content>
