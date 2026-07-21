# Spec — Contractor payment statements (period grouping + confirmation)

**Date:** 2026-07-21 · **Status:** Approved for planning (decisions locked) · **Owner:** Mike

> A **contractor payment statement** is a per-contractor, per-period **grouping and
> confirmation layer** over the existing canonical flow
> (`contractor_invoices` → `contractor_remittances`). It is **not** a third
> payment system. Statement lines are `contractor_invoices`; the event history is
> `audit_log`; the final immutable payment snapshot is `contractor_remittances`.

## 0. Locked decisions

| # | Decision |
|---|---|
| Payment basis | Staff-set **allocated hours** (`job_workers.hours_allocated`) + **approved extra hours** (`extra_hours`, existing approve/reject workflow). **No** contractor-entered actual-hours figure that auto-changes payable hours. |
| Completion flow | Contractor can **see allocated hours** and, at completion, request extra time: *additional time required? · extra hours requested · reason · completion notes · optional photos*. Extra hours continue through the existing approve/reject flow before becoming payable. |
| Periods | Fixed twice-monthly: **1st–15th** and **16th–final calendar day**. |
| Generation | Cron **auto-prepares drafts** after each cutoff; staff **review + issue**. Never auto-issue. |
| Service-period basis | **Job completion date** (`completed_at`, NZ local). |
| Late approval | Approved after the period's statement is issued → **carried into the next statement**, line labelled **"carried from prior period"**, retaining the original completion date. |
| No-response | Reminders at **+2d** and **+4d**; **staff-confirm-on-behalf** available at **+5d**. Open queries **block** the affected statement/line. No-response + no-query may be **Sano-confirmed with a clear audit record**. Record contractor-confirmed vs Sano-confirmed. |
| GST | Informational split from **Stage 1** for GST-registered contractors (3/23 of the GST-inclusive amount). Label: **"Contractor payment statement — this is not a tax invoice."** GST-registered: show ex-GST / GST included / total. Non-registered: no GST component. Formal BCTSI = Stage 3 (accountant approval). |
| Recurring | Support **both** fixed-contract and hourly/allocated-hours contractor payments. Fix the missing `job_workers` + rate-snapshot behaviour in **Stage 0**. |
| Duplicate prevention | Add a **DB-level unique constraint**: one active (non-void) `contractor_invoices` row per (`job_id`, `contractor_id`). |
| Data model | Reuse `contractor_invoices` (lines), `audit_log` (events), `contractor_remittances` (final snapshot). **No** separate statement-line / statement-event / version / adjustment tables unless a later requirement genuinely can't be met by existing entities. |
| Audit | Fill existing gaps: manual CI create/approve/mark-paid, remittance send, and all statement lifecycle actions. |

## 1. Agreed workflow

```
Contractor completes job (sees allocated hours; may request extra time +
  reason + notes + optional photos)                       jobs.status='completed'
        │  extra-time request → existing extra_hours approve/reject
        ▼
Staff approves pay  →  approveContractorPay()              contractor_invoices status='approved'
        │  freezes amount, pay_basis, pay_hours, GST snapshot   (supply date = completed_at)
        ▼
Period cutoff (15th / EOM). CRON builds DRAFT statements   contractor_statements status='draft'
        │  grouping this contractor's approved, un-statemented CIs   (regenerable while draft)
        ▼
Staff reviews drafts on exception dashboard → ISSUE        status='issued'  (CIs.statement_id locked)
        │  email (+ optional SMS): "ready — raise a query by [deadline]"
        ▼
Contractor opens (viewed_at) → CONFIRM or QUERY
   ├─ CONFIRM  → status='confirmed', confirmed_source='contractor'
   ├─ QUERY    → contractor_statement_queries(row); statement/line blocked
   └─ no action → reminders +2d/+4d → staff-confirm +5d
        │                              (confirmed_source='sano', confirmed_by=staff)
        ▼
Staff resolves any query: accept (edit/void CI, add adjustment CI),
   reject (reason), defer (unlink CI → next period)        → re-issue / confirm
        ▼
Confirmed statement → createContractorRemittance(its CIs)  contractor_remittances (existing)
        ▼
mark paid + send remittance advice (existing)             CIs → 'paid'; statement → 'paid'
```

**Actors / locks:** Contractor completes (status flip) and confirms/queries — never edits
amounts/hours. Staff (admin) approves pay (freezes CI), issues drafts, resolves queries,
creates remittance, marks paid. **Issue** locks CIs to the statement; **confirm** locks the
statement; **remittance snapshot** locks everything (existing void guard). Open queries block
confirmation of the affected statement/line.

## 2. Final status model (deliberately lean)

- **Job** (`jobs.status`) — unchanged: `draft → assigned → in_progress → completed → invoiced`.
  No pay states here. UI may derive an "awaiting pay review" chip from *completed + no CI yet*.
- **Payment item** (`contractor_invoices.status`) — unchanged: `pending → approved → paid → void`.
- **Statement** (`contractor_statements.status`) — `draft → issued → confirmed → paid`, plus
  **`queried`** (sub-state of issued while ≥1 query is open) and **`superseded`** (re-generated
  after issue).
- **Query** (`contractor_statement_queries.status`) — `open → accepted | rejected | deferred`.
- **Remittance / pay runs** — unchanged. (Dead `job_workers.pay_status='approved'` branch to be
  documented/cleaned separately; not part of this feature's runtime.)

## 3. Proposed schema changes (for a later migration PR — not now)

### 3.1 New table `contractor_statements`
```
id                uuid pk
statement_number  text unique           -- STMT-#### via DB default/trigger
contractor_id     uuid  → contractors
period_start      date
period_end        date
status            text  -- draft|issued|queried|confirmed|superseded|paid
subtotal          numeric(12,2)         -- sum of line amounts (GST-inclusive)
gst_total         numeric(12,2)         -- informational (registered contractors)
total_payable     numeric(12,2)
issued_at         timestamptz
issued_by         uuid
viewed_at         timestamptz           -- first contractor view
confirmed_at      timestamptz
confirmed_source  text  -- 'contractor' | 'sano'
confirmed_by      uuid                  -- staff user when confirmed_source='sano'
remittance_id     uuid  → contractor_remittances (nullable)
created_at        timestamptz default now()
created_by        uuid
```
Constraint: at most one **active** (status not in `superseded`) statement per
(`contractor_id`, `period_start`, `period_end`).

### 3.2 New table `contractor_statement_queries`
```
id                    uuid pk
statement_id          uuid → contractor_statements
contractor_invoice_id uuid → contractor_invoices (nullable = whole-statement query)
reason                text  -- missing_job|incorrect_hours|incorrect_rate|
                            --   missing_extra_work|incorrect_gst|other
note                  text
status                text  -- open|accepted|rejected|deferred
resolution_note       text
created_at            timestamptz default now()
resolved_at           timestamptz
resolved_by           uuid
```

### 3.3 Extend `contractor_invoices` (the statement lines)
```
statement_id   uuid → contractor_statements (nullable)
gst_applied    boolean not null default false   -- registered + on/after gst_effective_date at supply date
gst_amount     numeric(12,2) not null default 0 -- 3/23 of amount when gst_applied
is_adjustment  boolean not null default false   -- travel/materials/corrections (may be negative)
```
Unique index (closes the app-only dup hole):
```
create unique index contractor_invoices_job_contractor_active_uq
  on contractor_invoices (job_id, contractor_id)
  where status <> 'void' and job_id is not null;
```
(Fixed-contract CIs have `job_id = null` and are intentionally excluded.)

### 3.4 No new tables for lines / events / versions / adjustments
- **Lines** = `contractor_invoices` (via `statement_id`).
- **Events** = `audit_log` (new `action` strings, §6).
- **Versions / immutability** = statement `status='superseded'` + a fresh statement; the
  underlying CI amounts are already frozen at approval and, once remitted, snapshotted into
  `contractor_remittance_items`.
- **Adjustments** = `contractor_invoices` rows with `is_adjustment=true` (may be negative).

## 4. Permission & privacy rules

- **Identity:** `contractors.auth_user_id = auth.uid()` via `getContractor()`.
- **Contractor may read** only their own `contractor_statements` and `contractor_statement_queries`
  (and create queries on their own issued statements; set `viewed_at`; confirm their own statement).
  RLS scoped to their `contractor_id`; financial reads continue via service-role with a **hard
  `contractor_id` filter** (the existing pattern in `contractor-pay-data.ts`).
- **Never exposed to contractors:** client price / `job_price` / margin / `internal_notes` /
  other contractors / other contractors' lines. Multi-contractor jobs produce **separate
  per-contractor statements** — no co-worker leakage.
- **Staff (admin only):** issue drafts, resolve queries, confirm-on-behalf, create remittance,
  mark paid. Draft build runs service-role via cron.

## 5. Exact cutoff & carry-forward logic

**Period membership** (which period a job belongs to):
- `completed_at` converted to **NZ local date**; day 1–15 → Period 1; day 16–EOM → Period 2.

**A CI lands on Period P's statement iff:**
1. Linked job `completed_at` (NZ) falls in P, **and**
2. CI `status='approved'`, **and**
3. `CI.statement_id is null`, **and**
4. Approved **before** staff *issues* P's statement.

**Carry-forward** (completed in P, approved after P issued):
- Flows to the **next** statement. Line labelled **"carried from prior period"**; the original
  completion date is retained (`date_submitted = completed_at`, unchanged). No back-dating of the
  amount.

**Adjustments** (`is_adjustment=true`): grouped into the **current open** period's statement.

**GST per line:** evaluated at the job's **`completed_at`** (supply date) via
`contractorGstOnPayment(profile, amount, completed_at)`. Registration starting mid-period → early
lines show no GST, later lines show 3/23, **on the same statement**.

**Edge cases:** multi-day → period by final `completed_at`; reassigned mid-job → CI belongs to the
`job_workers` holder at approval (snapshot protects it); partial/cancelled → no approval → no CI;
recurring fixed-contract → `payment_type='fixed_contract'` CI with `period_label`; recurring hourly
→ requires the Stage 0 `job_workers` fix; disputed → query → defer → unlink → next period.

## 6. Audit trail (all via `audit_log`)

New/filled `action` strings (each with `actor_role`, `entity_table`, `entity_id`, `before`/`after`):
- `contractor_invoice.created`, `contractor_invoice.approved`, `contractor_invoice.marked_paid`
  (fill existing gaps for the manual path)
- `contractor_remittance.sent` (fill existing gap)
- `contractor_statement.drafted` (cron), `.issued`, `.viewed`, `.confirmed`,
  `.confirmed_by_sano`, `.superseded`, `.remitted`, `.paid`
- `contractor_statement_query.raised`, `.accepted`, `.rejected`, `.deferred`

Recorded facts satisfy the audit requirements: who submitted extra-hours (existing
`extra_hours_*`), who approved the job (`contractor_pay.approved`), when the amount was calculated
(CI insert), who issued (`issued_by`), when viewed (`viewed_at`), confirmed/queried (source + by),
who resolved a query (`resolved_by`), entry into the payment run (`contractor_remittance.created`),
and payment (`marked_paid`).

## 7. Notification timing (minimum useful)

Statement emails via **Resend** (the notifications framework is SMS-only today; log to
`notification_logs`, which already has email columns). Model on `sendContractorRemittance`.

| Trigger | When | Channel | To |
|---|---|---|---|
| Statement **issued** | On staff issue | Email (+ optional SMS) | Contractor — "ready; raise a query by [deadline]" |
| Reminder 1 | +2 days, not confirmed/queried | Email or SMS | Contractor |
| Reminder 2 | +4 days | Email or SMS | Contractor |
| (Staff-confirm becomes available) | +5 days | — | Staff dashboard |
| **Query resolved** | On resolution | Email | Contractor |
| **Remittance advice** | On send (existing) | Email + PDF | Contractor |
| Pre-cutoff nudge (optional) | Day before cutoff | SMS | Contractor with unsubmitted notes/photos |

Deliberately omitted: per-job "approved" pings; statement-confirmed staff pings (dashboard covers).
Cron hosts the reminders, NZ-date gated. Target ≈ 2 emails per contractor per period.

## 8. Staff-confirm-on-behalf behaviour

- Available only **≥5 days** after issue, **no open queries**, and no contractor confirmation yet.
- Sets `confirmed_at`, `confirmed_source='sano'`, `confirmed_by = staff user`;
  audit `contractor_statement.confirmed_by_sano`.
- **Open queries block** Sano-confirm (and contractor-confirm) of the affected statement/line.
- Contractor confirmation sets `confirmed_source='contractor'` (audit `contractor_statement.confirmed`).
- The issued-statement email must state that the contractor should **raise a query by the review
  deadline** if anything is incorrect, and that absent a query Sano may confirm on their behalf.

## 9. Stage 0 → Stage 3 PR plan

### Stage 0 — Foundations / bug-fix hardening (do first; no contractor-facing UX)
- **Scope:**
  1. `updateJob` — stop the destructive `delete + reinsert` of `job_workers`; upsert/diff instead,
     preserving `pay_rate`, hours, approvals.
  2. Snapshot `pay_rate` on **every** worker-creation path (`createJob`, `updateJob`,
     `addJobWorker`), matching `assignJob` (snapshot `contractors.hourly_rate`, preserve if set).
  3. **Recurring jobs create `job_workers` rows** (with `pay_rate` snapshot) for the assigned
     contractor; support fixed-contract **and** hourly/allocated recurring pay.
  4. **Wire `gst.ts`** into `approveContractorPay`: compute `gst_applied` / `gst_amount` from the
     contractor's GST profile at the job's `completed_at`; store on the CI.
  5. **DB unique constraint** on active CI per (`job_id`, `contractor_id`).
  6. **Fill audit gaps** (manual CI create/approve/mark-paid, remittance send).
- **Affected:** `jobs/_actions.ts`, `jobs/[id]/_actions-workers.ts`, `recurring-jobs/_actions-phase-f.ts`,
  `contractor-invoices/_actions*.ts`, `lib/payroll/gst.ts` consumers, `lib/contractor-pay.ts`.
- **Migrations:** CI columns (`gst_applied`, `gst_amount`, `is_adjustment`, `statement_id`), the
  unique index. Mike-run, MCP-verified.
- **Tests:** GST-at-approval (registered/non-registered/pre-effective-date); dup-constraint;
  rate-snapshot on all paths; `updateJob` non-destructive; recurring creates `job_workers`.
- **Accountant:** confirm 3/23 informational display + "not a tax invoice" wording.
- **Decisions needed:** none blocking.

### Stage 1 — Period statements (the main objective)
- **Scope:** `contractor_statements` table + `statement_id` on CI; cron draft-builder
  (1–15 / 16–EOM, NZ dates); staff review/issue; contractor confirm; feed confirmed → existing
  `createContractorRemittance`; contractor pay view gains statement buckets + GST split; label
  "not a tax invoice"; improved completion flow (see allocated hours + request extra time).
- **Affected:** `contractor-invoices/*`, `contractor/payroll` + `_views`, `contractor/jobs/[id]`
  (completion flow), cron route, new statement actions.
- **Migrations:** `contractor_statements` + statement-number sequence.
- **Tests:** period bucketing; cutoff + carry-forward; confirm → remittance; GST split totals;
  Sano-confirm gating; privacy scoping.
- **Dependencies:** Stage 0. **Decisions:** none new (all locked). **Accountant:** statement wording.

### Stage 2 — Exceptions, queries & reminders
- **Scope:** `contractor_statement_queries`; staff exception dashboard (extend `/portal/alerts` +
  `attention-rules.ts`); reminders +2d/+4d; staff-confirm +5d; missing-data warnings.
- **Migrations:** queries table.
- **Tests:** query lifecycle (open/accept/reject/defer); defer-to-next-period; reminder cadence
  (dedup via `notification_logs`); staff-confirm audit + query-block.
- **Dependencies:** Stage 1.

### Stage 3 — Formal GST document (blocked on accountant)
- **Scope:** buyer-created taxable supply information (BCTSI); document numbering; supplier details;
  PDF; storage; accounting export.
- **Accountant/legal:** **required and blocking.**
- **Migrations:** as required.

## 10. Testing requirements (summary)

- Pure/unit: period assignment from `completed_at` (NZ), carry-forward selection, GST split
  (3/23, registered vs not, mid-period effective date), statement totals (subtotal/gst/total).
- Workflow: draft build idempotence + regeneration while draft; issue locks CIs; confirm →
  remittance; Sano-confirm only ≥5d + no open queries; open-query blocks confirm; defer unlinks
  to next period.
- Guards: dup-constraint rejects a second active CI; a CI can appear on only one statement.
- Privacy: contractor sees only own statements/queries; no `job_price`/margin/co-worker leakage;
  staff preview parity.
- Regression: gauntlet green (tsc · lint · tests at documented baseline).

## 11. Accountant decisions still outstanding

1. Can a contractor-confirmed statement serve as **buyer-created taxable supply information
   (BCTSI)**, and what **written agreement** is required (both GST-registered; supplier agrees not
   to issue their own)? → gates Stage 3.
2. For **non-GST contractors**, is a plain confirmed statement an acceptable payment record without
   any invoice?
3. Does treating the statement as the contractor's **payment claim** create any
   schedular-payment/withholding exposure given `tax_treatment`?
4. Confirm the **3/23 inclusive split** + required wording so the Stage-1 statement is clearly
   **not** a tax invoice.

## 12. Existing bugs / structural weaknesses Stage 0 corrects

1. **Destructive `job_workers` update:** `updateJob` does `delete().eq('job_id')` then re-insert,
   **wiping `pay_rate` snapshots + recorded hours/approvals** — the exact hazard
   `_actions-workers.ts` was built to avoid.
2. **Missing rate snapshots:** only `assignJob` snapshots `job_workers.pay_rate`.
   `createJob`, `updateJob`, `addJobWorker` leave it `null` → historical amounts silently track the
   **live** `contractors.hourly_rate` until a payable is approved.
3. **Recurring-job worker gap:** recurring generation copies `jobs.contractor_id` but **creates no
   `job_workers` row**, so recurring jobs have no pay basis/rate snapshot until re-assigned —
   incomplete statements for hourly recurring work.
4. **Audit gaps:** `createContractorInvoice`, `approveContractorInvoice`,
   `markContractorInvoicePaid`, and `sendContractorRemittance` write **no** `audit_log` row (the
   job-derived approve path is audited; the manual path and send are not).
5. **GST not consumed:** `lib/payroll/gst.ts` (`splitGstInclusive`, `contractorGstOnPayment`, 3/23)
   is unit-tested but **called nowhere** in the pay/remittance path.
6. **Application-only duplicate prevention:** no DB unique constraint on
   `contractor_invoices(job_id, contractor_id)`; the only guard is an app-level check in
   `approveContractorPay`.
7. **(Documented, not fixed here) legacy dead track:** `job_workers.approved_hours/at/by` +
   `pay_status='approved'` are written by nothing (the approver is a retired no-op) yet still read
   by `job-reconciliation.ts` / `finance-attention-data.ts`. Flagged for a separate cleanup so the
   stale-pay warning branch can't mislead.

## 13. Rollout notes

Spec-only at this point — **no code, no migrations.** Implementation proceeds Stage 0 → 3 with
each stage as one or more focused PRs, migrations Mike-run + MCP-verified before merge, gauntlet
green, and accountant sign-off gating the GST wording (Stage 1) and BCTSI (Stage 3).
