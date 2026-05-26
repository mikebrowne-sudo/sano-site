# Phase G — Job financials and contractor cost foundation implementation spec

> Spec type: implementation plan (Phase G)
> Status: planning (no implementation yet)
> Created: 2026-05-26
> Companion review: [`2026-05-26-finance-accounting-review.md`](2026-05-26-finance-accounting-review.md)
> Companion foundation plan: [`2026-05-26-job-financials-foundation-plan.md`](2026-05-26-job-financials-foundation-plan.md)
> Scope: smallest safe internal refactor to make job financials clear and contractor labour cost consistent. No customer-facing change. No PDF / share-page / Stripe / email change. No migrations expected.

---

## 1. Executive summary

Today, three different surfaces compute contractor labour cost three different ways, and `/portal/finance` reads a denormalised number (`jobs.contractor_price`) that nothing keeps in sync with the underlying hours-and-rate data on `job_workers`. The job page already uses the correct source via `src/lib/labour-calc.ts`, but only the job page does.

Phase G makes the job detail page the single place an admin needs to look to understand a job financially, makes contractor labour cost calculate from one canonical formula everywhere, and snapshots the contractor's hourly rate onto `job_workers.pay_rate` at assignment time so the rate is explicit from the moment a contractor is on the job. It adds a small "Ready to invoice" panel on the job page to catch obviously messy jobs (soft warnings, hard blocks only where data would otherwise break), and aligns the finance dashboard to read from the same canonical source.

Phase G does not build expenses, GST reports, payment records, period locking, accountant exports, or any new payroll workflow. Those are later phases. Phase G is deliberately the smallest delivery that makes everything downstream trustworthy.

**Canonical formula introduced:**

```
contractor labour cost (per job_workers row) =
  job_workers.pay_rate × COALESCE(job_workers.approved_hours, job_workers.actual_hours)
```

**Fallback for live "estimated pay" display only:**

```
estimated pay (display) =
  COALESCE(job_workers.approved_hours, job_workers.actual_hours, job_workers.hours_allocated)
  × COALESCE(job_workers.pay_rate, contractors.hourly_rate, 0)
```

The fallback never feeds reporting or persisted figures — only the live UI estimate before approval.

---

## 2. Current-state technical map

### 2.1 Labour calculator — `src/lib/labour-calc.ts`

Pure functions. Inputs: `WorkerInput` with `hourly_rate`, `hours_allocated`, `actual_hours`, plus employee-specific holiday/KS/ACC fields. Outputs `LabourSummary` and `VarianceSummary`. Used in **one place only** — `src/app/portal/jobs/[id]/page.tsx`.

The input shape carries `hourly_rate` as the rate, not `pay_rate`. The job page resolves this at the SQL layer by joining `job_workers` to `contractors` and reading `contractors.hourly_rate` into the `hourly_rate` field. **This means the job page also reads live `contractors.hourly_rate` for pre-approval cost** — the snapshotted `pay_rate` is read separately by the Pay Approvals row, not by the variance calc.

Implication: the labour calc must be extended to prefer `job_workers.pay_rate` over `contractors.hourly_rate` when present, with the live `hourly_rate` only as a fallback before assignment snapshot is in place.

### 2.2 Job detail page — `src/app/portal/jobs/[id]/page.tsx`

The Labour & Margin section lives inline on this page (lines ~407–565). It renders:
- a top Estimated vs Actual table (Job value, Hours, Labour cost, Employer KS, ACC, Gross margin)
- a per-worker breakdown table (Worker, Type, Est. hrs, Actual hrs editor, Rate, Est. cost, Actual cost, Variance)
- a Pay approvals row (admin-only on completed/invoiced jobs) using `ApproveHoursButton`

All margin/profit values are live-computed on every render. Only `actual_hours`, `approved_hours`, `pay_rate`, `pay_status` are persisted to `job_workers`. There is no extracted `LabourMarginSection` component; everything is inline.

### 2.3 Contractor assignment flow — `src/app/portal/jobs/[id]/_actions.ts:307-456`

`assignJob` accepts contractor + schedule + allowed_hours + access + notes. Reads `contractors` for the readiness gate (status / onboarding_status / trial_required / trial_status / worker_type / insurance_expiry). Upserts `job_workers` (line 451) with **only** `{ job_id, contractor_id, hours_allocated }`.

**`pay_rate` is NOT written on assignment.** It is written later by `approveJobWorkerHours` in `_actions-approve-hours.ts` (snapshotting `contractors.hourly_rate` to `job_workers.pay_rate` at approval time). The hardware to snapshot exists — Phase G just needs to also snapshot at assignment time.

### 2.4 Hours approval — `src/app/portal/jobs/[id]/_actions-approve-hours.ts`

Admin-only. Gates on job status ∈ {completed, invoiced}, contractor having an `hourly_rate`, and (when on) `require_review_before_invoicing`. Writes `pay_rate`, `pay_type='hourly'`, `approved_hours`, `approved_at`, `approved_by`, `pay_status='approved'`. Audited via `audit_log` action `job_worker.hours_approved`.

### 2.5 Finance dashboard — `src/app/portal/finance/page.tsx`

Reads `jobs` table for cost: `select('id, job_number, title, scheduled_date, status, contractor_price, assigned_to, invoice_id')` filtered by `contractor_price IS NOT NULL AND > 0`. Computes `contractorPrice: j.contractor_price ?? 0`.

There is no join to `job_workers`, no read of `approved_hours / actual_hours / pay_rate`. The dashboard's labour cost is whatever happens to be on `jobs.contractor_price`. This is the largest single inconsistency in the financial layer.

### 2.6 Where else `jobs.contractor_price` is read or written

13 files reference `contractor_price`. By group:

- **Writes / forms:** `src/app/portal/jobs/_components/JobForm.tsx`, `src/app/portal/jobs/_actions.ts`, `src/app/portal/jobs/[id]/edit/page.tsx`, `src/app/portal/quotes/[id]/_components/JobSetupWizard.tsx`, `src/app/portal/quotes/[id]/_actions-job-setup.ts`, `src/app/portal/quotes/[id]/_lib-job-setup.ts`, `src/app/portal/recurring-jobs/[id]/edit/page.tsx`, `src/app/portal/recurring-jobs/_actions.ts`, `src/app/portal/recurring-jobs/_components/RecurringJobForm.tsx`
- **Reads (display + calc):** `src/app/portal/jobs/[id]/page.tsx`, `src/app/portal/finance/page.tsx`, `src/app/contractor/jobs/[id]/page.tsx`, `src/app/portal/recurring-jobs/[id]/page.tsx`

The column has both operational uses (job form, recurring jobs template) and financial uses (finance dashboard). Phase G does not delete the column. It stops trusting it as the canonical contractor labour cost for finance, while leaving the form-level operational pre-fill intact for now.

### 2.7 Contractor invoice variance — `src/app/portal/contractor-invoices/page.tsx` + `[id]/page.tsx`

List page computes inline: `ci.amount − (contractor.hourly_rate × job.allowed_hours)`. Detail page falls back to summing `job_workers.hours_allocated × contractors.hourly_rate` when present. Either way, the formula ignores actual / approved hours and uses live `hourly_rate`, not the snapshotted `pay_rate`.

The table is `contractor_invoices` (separate from `pay_runs` / `pay_run_items`). This area is **not legacy / not to be retired**. It serves a real operational need — recording payments to contractors who don't invoice Sano — and the future direction is to evolve it into Contractor Payables / Contractor Pay Runs that supports both contractor-supplied invoices and Sano-generated internal payables. Phase G.1 changes nothing here. Phase G.2 may add **soft transition guidance**, not a hard "read-only" banner. The full evolution lands in a later Contractor Payables phase. See `2026-05-26-finance-accounting-review.md` §11.5.

### 2.8 Contractor pay run logic — `src/app/portal/payroll/contractor-runs/_actions.ts`

`createContractorPayRun` reads `job_workers` rows with `pay_status='approved'` and `approved_at` inside the period window, then inserts `pay_runs` (`kind='contractor', status='draft'`) and bulk-inserts `pay_run_items` with `amount = approved_hours × pay_rate` (snapshotted at approval). `approveContractorPayRun` and `markContractorPayRunPaid` cascade status. All audited.

The detail view at `/portal/payroll/contractor-runs/[id]/page.tsx` displays Approved hours / Pay rate / Amount per row but **does not display allowed-vs-actual variance** even though the data is on the linked `job_workers`. Phase G can add this without touching the action.

### 2.9 Existing tests

`grep -l 'labour-calc\|labour_cost\|approve-hours\|finance/page\|contractor-invoices' src/__tests__` returns **zero files**. There are currently no unit tests for any of: labour calc, hours approval, finance dashboard cost, or contractor invoice variance. Phase G's test additions are also Phase G's first tests for these surfaces.

---

## 3. Proposed Phase G scope

The smallest safe build that delivers the foundation. In priority order:

### 3.1 Canonical labour-cost helper

A new file `src/lib/job-cost.ts` exporting pure functions:

- `getWorkerPayableHours(jw) → number | null` — `COALESCE(approved_hours, actual_hours)`.
- `getWorkerEstimatedHours(jw) → number | null` — `COALESCE(approved_hours, actual_hours, hours_allocated)`.
- `getWorkerRate(jw, fallbackHourlyRate?) → number | null` — `COALESCE(pay_rate, fallbackHourlyRate)`. The fallback is for the live display case where a worker was assigned before Phase G's snapshot landed; persisted reporting never uses it.
- `getWorkerLabourCost(jw) → number` — `pay_rate × COALESCE(approved_hours, actual_hours) ?? 0`. Returns 0 when either side is null (no fabricated cost).
- `getJobLabourCost(jobWorkers[]) → number` — sum of `getWorkerLabourCost` over the array.
- `getWorkerVariance(jw) → { hoursVariance, costVariance } | null` — `(actual − allowed)` and `(actual × pay_rate − allowed × pay_rate)`. Returns null when allowed_hours is null.

These functions accept lightweight row shapes (typed inline) so they can be reused by the finance dashboard's job query without dragging in employee-specific holiday/KS/ACC fields.

### 3.2 Snapshot `pay_rate` on assignment

Extend `assignJob` (`src/app/portal/jobs/[id]/_actions.ts:307`) so the `job_workers` upsert also writes `pay_rate` and `pay_type='hourly'` when:

- the contractor has a non-null `hourly_rate`, AND
- the existing `job_workers` row (if any) has a null `pay_rate` (do not overwrite a previously-snapshotted rate or an admin override).

Approval-time snapshot in `_actions-approve-hours.ts` stays as a safety net for rows that pre-date the assignment-time snapshot.

### 3.3 Block assigning a contractor with no rate (soft direction)

The user direction is: do not silently assign a contractor with no rate and create messy financial data.

Recommended smallest safe approach:
- `assignJob` already returns clear error strings (`return { error: '…' }`). Add one: when `contractor.hourly_rate IS NULL OR contractor.hourly_rate <= 0`, return `{ error: 'Cannot assign — {name} has no hourly rate on file. Set the contractor's rate first.' }`. This matches the existing pattern for insurance expiry, status, onboarding.
- Surface a link in the error message UI to the contractor edit page where the rate is set.
- Admin override path: optional `force_no_rate: true` on `AssignJobInput`, matched by an "Assign without rate (admin)" secondary action in the modal. Writes a `job_worker.rate_missing_override` audit row when used. Defer this override path to a follow-up if it adds complexity — the default Phase G behaviour is hard-block.

### 3.4 Job page financial summary expansion

The Labour & Margin section already shows most of the right data. Phase G:

- replaces the per-worker `rate` column read from `contractors.hourly_rate` with `job_workers.pay_rate` (falling back to live rate only when null and with a small "snapshot pending" indicator)
- adds a clearly-labelled **Approved payable** column showing `approved_hours × pay_rate` with a visually-strong style (the "final/payable figure")
- adds **variance in hours** and **variance in dollars** as explicit row entries, not just inferred from columns
- adds the per-worker pay status badge already in the Pay approvals row, but inlined into the breakdown so it's visible without scrolling
- adds the Ready-to-invoice panel (section 3.7)

### 3.5 Finance dashboard alignment

Change `/portal/finance/page.tsx` to compute contractor cost from `job_workers` via `getJobLabourCost`. Concretely:

- replace the `select(...contractor_price, assigned_to, invoice_id)` for the per-job table with a query that joins `job_workers` and computes the sum (either with a subquery, a view, or a JS-side aggregation after a second `job_workers` query keyed by the same job IDs)
- summary cards' "Contractor cost" total switches to the new figure
- monthly breakdown's cost column switches to the new figure
- per-job table replaces `contractorPrice` with the new figure, derived from `job_workers` rather than `jobs.contractor_price`

`jobs.contractor_price` continues to exist; it just stops being the canonical read.

### 3.6 Variance display on contractor pay run detail

`/portal/payroll/contractor-runs/[id]/page.tsx` already lists pay-run items grouped by contractor. Add three columns to each row:

- Allowed hours (from the joined `job_workers.hours_allocated` or `jobs.allowed_hours`)
- Actual hours (from `job_workers.actual_hours`)
- Hours variance (actual − allowed), styled red for over and emerald for under

This is read-only — no writes, no action changes.

### 3.7 Ready-to-invoice panel (new component on the job page)

A compact panel near the Labour & Margin section. Two states per check: ✓ (green) or ⚠ (amber soft warning) or ✗ (red hard block).

**Hard blocks (must clear or be admin-overridden with reason):**
- No client linked (`jobs.client_id IS NULL`)
- No service scope (`jobs.description IS NULL` AND `jobs.scope_snapshot IS NULL`)
- No job price (`jobs.job_price IS NULL OR <= 0`)
- Contractor assigned but no job-specific pay rate (`job_workers.pay_rate IS NULL` on any assigned row)

**Soft warnings (do not block; surface for awareness):**
- Actual hours missing on any assigned worker
- Approved hours missing on any assigned worker
- Actual or approved hours exceed allowed hours by > 20% (configurable in a later phase; hard-coded 20% in Phase G)
- Contractor pay not yet approved (`pay_status != 'approved'` on completed jobs)
- Completed job not yet invoiced
- Invoice total differs from job_price (when an invoice exists)
- Estimated margin < 10% or negative

**Actions on each line:**
- "Fix" link that scrolls to the section that resolves the issue (e.g. the per-worker row, the Edit Job page, the Assign modal)
- For hard blocks only: an "Admin override" button that opens a small modal asking for a reason. The override is audited via `audit_log` action `job.ready_to_invoice_override`. The override unlocks Convert-to-Invoice for the current session only; reloading re-checks.

This panel is **read-only output of computed checks** — it does not change any existing invoice / quote / job conversion behaviour. The Phase D `createInvoiceFromJob` gates already exist; Phase G adds nothing to those gates other than the soft check display. Hard blocks here are an additional layer on top of existing gates; if an existing gate already blocks, this panel just shows the same reason in the same surface.

### 3.8 Contractor Payables — transition guidance (Phase G.2, not G.1)

**Important correction:** the contractor-invoices area is **not legacy**. It supports a real workflow Sano still relies on — recording payments to contractors who don't issue invoices. The Phase G plan must not characterise it as deprecated or retire-bound.

Phase G.1 makes **no change** to `/portal/contractor-invoices`. Phase G.2 may add **soft transition guidance**, not a hard "read-only" banner. Suggested copy if/when it lands:

> "This area tracks contractor payable records. Some are based on contractor-supplied invoices, and some may be generated internally from approved job hours. Future updates will connect this area more directly to job approvals and contractor pay runs."

The full evolution into Contractor Payables / Contractor Pay Runs — including grouping approved job rows by contractor + pay period, matching contractor-supplied invoices against expected payables, and generating Sano internal payables from approved hours — is a later phase (G.3 / Contractor Payables). It is **not** part of Phase G.1 or Phase G.2.

#### What Phase G.2 explicitly does NOT do here

- Does not call the area "legacy".
- Does not mark it read-only.
- Does not disable create / approve / mark-paid actions.
- Does not remove or hide it from nav.
- Does not migrate or delete `contractor_invoices` rows.
- Does not introduce route renames.

#### Two supported workflows (future Contractor Payables direction)

| Workflow | Description |
|---|---|
| A — Contractor-supplied invoice | Portal shows expected payable from approved hours; admin records the contractor's invoice number + amount + attachment; portal surfaces variance against the expected total; admin approves and marks paid. |
| B — Sano-generated internal payable | Portal generates a simple internal payable from approved hours (no manual re-entry); admin reviews, approves, and marks paid. |

Both paths share the same source of truth: `approved_hours × job_workers.pay_rate`.

### 3.9 Cleanup flags — minimal Phase G version

A "Jobs needing attention" widget on `/portal/finance` (or as a compact panel on the portal dashboard, decision in implementation review). Phase G ships these flag queries only — no dedicated `/portal/reconcile` page:

- contractor assigned but no pay rate
- actual hours entered but no approved payable hours
- approved hours exist but no pay-run item yet (older than N days, default 14)
- actual or approved hours exceed allowed hours by > 20%
- completed job not invoiced (older than N days, default 7)
- contractor invoice exists alongside pay-run data for the same `(job_id, contractor_id)` — convergence flag, not an error

Each flag is a pure helper in `src/lib/job-reconciliation.ts` returning `{ jobId, flag, severity }[]`. The widget renders a small table. Click-through goes to the job page.

If the widget UI adds too much surface area for one phase, ship the helpers only and defer the widget to Phase G.2.

---

## 4. Out of scope for Phase G

Explicitly NOT included:

- expenses CRUD, expense_categories table, receipt uploads
- GST reports, GST101 prep, accountant-shaped exports
- `invoice_payments` table, payment-record storage
- Stripe webhook changes (zero touches to `src/app/api/stripe/webhook/route.ts`)
- invoice revisions, credit notes
- accounting period locks, `accounting_periods` table
- Xero / MYOB CSV exports or integration
- full payroll rebuild
- staff payroll / PAYE / KiwiSaver / employee leave changes
- public website / customer-facing pages
- PDF rendering, share-page interactive panels, email sending
- contractor login / contractor portal pages
- auth / role / RLS schema changes
- `jobs.contractor_price` column removal (left in place; just stop trusting it)
- dedicated `/portal/reconcile` page (deferred to a later phase)
- override-with-reason modal sophistication beyond a simple reason field
- variance threshold configurability via settings (hard-coded 20% in Phase G)

---

## 5. Proposed file-touch list

Files that will need to be changed. No edits to anything not on this list.

### 5.1 Job detail UI

- `src/app/portal/jobs/[id]/page.tsx` — Labour & Margin expansion (pay_rate column, Approved payable column, variance rows, inline pay status badges); mount Ready-to-invoice panel.
- `src/app/portal/jobs/[id]/_components/ReadyToInvoicePanel.tsx` — **new**. Pure presentational; takes computed check results from a server-side helper.
- `src/app/portal/jobs/[id]/_components/AssignJobButton.tsx` — show the rate-missing error inline; optional secondary "Assign without rate (admin)" path if scope allows.
- `src/app/portal/jobs/[id]/_components/ApproveHoursButton.tsx` — minor copy update to clarify the snapshot is now also persisted at assignment.

### 5.2 Contractor assignment server action

- `src/app/portal/jobs/[id]/_actions.ts` — extend `assignJob` to (a) reject when contractor has no hourly_rate (unless `force_no_rate` admin override), (b) include `pay_rate` + `pay_type` in the `job_workers` upsert when first assigning.

### 5.3 Shared calculation helpers

- `src/lib/job-cost.ts` — **new**. Canonical per-worker and per-job labour cost helpers (section 3.1).
- `src/lib/job-reconciliation.ts` — **new**. Cleanup-flag helpers (section 3.9).
- `src/lib/labour-calc.ts` — **edit**. `WorkerInput` gains an optional `pay_rate?: number | null` field; `calcWorkerCost` prefers `pay_rate` over `hourly_rate` when present. Backward compatible.

### 5.4 Finance dashboard

- `src/app/portal/finance/page.tsx` — switch contractor-cost reads from `jobs.contractor_price` to `getJobLabourCost(jobWorkers)`.
- `src/app/portal/finance/_components/PeriodFilter.tsx` — no change.
- `src/app/portal/finance/_lib/periods.ts` — no change.

### 5.5 Contractor pay run display

- `src/app/portal/payroll/contractor-runs/[id]/page.tsx` — add Allowed / Actual / Variance columns to the per-item rows.

### 5.6 Contractor Payables transition guidance (Phase G.2 optional)

- `src/app/portal/contractor-invoices/page.tsx` — optional soft transition-guidance banner (see §3.8 copy). Not a "legacy / read-only" banner.
- `src/app/portal/contractor-invoices/[id]/page.tsx` — same.

No action buttons disabled. No data hidden. No route renamed.

### 5.7 Tests

- `src/__tests__/lib/job-cost.test.ts` — **new**. Unit tests for the canonical helpers and fallback rules.
- `src/__tests__/lib/job-reconciliation.test.ts` — **new**. Unit tests for cleanup flag helpers.
- `src/__tests__/actions/assign-job.test.ts` — **new**. Tests rate-missing rejection and pay_rate snapshot-on-assignment.
- `src/__tests__/lib/labour-calc.test.ts` — **new**. Tests pay_rate precedence over hourly_rate and the no-fabricated-cost guarantee.
- `src/__tests__/pages/finance-cost-consistency.test.ts` — **new**. Snapshot/integration-style test asserting finance dashboard cost matches `getJobLabourCost` for a representative job fixture.

### 5.8 Docs

- `docs/PORTAL.md` — small addition under "Current Active Work" once Phase G ships (deferred to end of implementation, not part of the spec).
- `docs/AI/DECISIONS.md` — append the canonical formula decision and the Contractor Payables evolution direction (note: contractor-invoices area stays active, evolves into Contractor Payables / Contractor Pay Runs in a later phase).
- `docs/superpowers/specs/2026-05-26-phase-g-implementation.md` — this file.

---

## 6. Data model impact

**No database migrations required.** Every column used is already in the schema:

| Column | Status |
|---|---|
| `job_workers.pay_rate` | Exists (Phase E migration). Phase G writes it at assignment as well as approval. |
| `job_workers.pay_type` | Exists. Defaults to `'hourly'`. |
| `job_workers.approved_hours` | Exists. |
| `job_workers.actual_hours` | Exists. |
| `job_workers.hours_allocated` | Exists. |
| `job_workers.pay_status` | Exists with CHECK. |
| `jobs.allowed_hours` | Exists. |
| `jobs.job_price` | Exists. |
| `jobs.contractor_price` | Exists. Phase G stops reading it for finance; keeps it for form pre-fill. |
| `contractors.hourly_rate` | Exists. Used as default rate at assignment and as a live fallback when `pay_rate` is null on rows that pre-date the assignment-time snapshot. |
| `audit_log` | Exists. Phase G adds new action verbs only. |

New audit action verbs added (no schema change — the `action` column is text):
- `job_worker.pay_rate_set_on_assignment`
- `job_worker.pay_rate_override` (when admin overrides snapshot pre-approval)
- `job.ready_to_invoice_override`

No new tables, no column additions. If a future review surfaces a need for `pay_rate_override_reason` or `pay_rate_override_at`, that's an additive migration in a follow-up — not Phase G.

---

## 7. UX proposal — job page financial summary

The job detail page financial section answers these questions at a glance:

| Question | Where it lives on the page |
|---|---|
| What did we quote / charge? | Header summary row: Quote total · Invoice total (when present) |
| What hours did we allow? | Labour & Margin top row: Allowed hours |
| What hours actually happened? | Labour & Margin top row: Actual hours; per-worker breakdown shows the split |
| What hours are approved for pay? | Per-worker row: Approved column |
| What is the contractor rate? | Per-worker row: Rate column (snapshotted `pay_rate`) |
| What do we owe the contractor? | Per-worker row: Approved payable cell (bold, large) + grand total row |
| Are we over or under allowed hours? | Per-worker row: Variance (hours) + Variance ($) columns |
| What is the estimated / final profit impact? | Labour & Margin bottom summary: Gross margin estimate vs actual |
| Does this job need attention before invoicing or pay run? | Ready-to-invoice panel below the summary |

Visual treatment:
- Approved payable amount is the largest financial cell on the row and uses the sage-500 brand colour.
- Variance > 20% renders in a warning amber colour.
- Variance < 0 (under) renders in muted emerald.
- The Ready-to-invoice panel uses simple ✓ / ⚠ / ✗ glyphs. Total height of the panel should not exceed one viewport scroll.

Operational discipline:
- The page must remain fast (no new N+1 queries; reuse existing `job_workers` join).
- No new modal flows beyond Admin Override on hard blocks.
- Inline editors (`ActualHoursEditor`, `ApproveHoursButton`) already in place stay where they are.

---

## 8. Cleanup / reconciliation proposal

Minimum Phase G version: helper functions + a small panel.

### 8.1 Flag helpers — `src/lib/job-reconciliation.ts`

Each helper is a pure function over a fetched job + workers row set; the page-level loader does one query and feeds many helpers. No new tables.

- `flagContractorWithoutPayRate(job, workers)` — severity: hard
- `flagActualWithoutApproved(job, workers)` — severity: soft
- `flagApprovedWithoutPayRun(job, workers, days = 14)` — severity: soft
- `flagOverAllowedThreshold(job, workers, pct = 0.2)` — severity: soft
- `flagCompletedWithoutInvoice(job, days = 7)` — severity: soft
- `flagContractorInvoiceAndPayRunBoth(job, contractorInvoiceRows, payRunItemRows)` — severity: soft. Surfaces when both a `contractor_invoices` row and a `pay_run_items` row exist for the same `(job_id, contractor_id)`. This is a convergence flag, not an error — it signals a job where both payment paths happened so Mike can confirm one ledger is canonical for the period.

### 8.2 Panel placement

Two options for the panel; implementation review chooses:

- **Option A:** small widget on `/portal/finance` titled "Jobs needing attention" — limited to top N (e.g. 25) with click-through to job detail.
- **Option B:** small widget on the portal dashboard (`/portal`) under the existing counts.

Recommended: Option A. The finance surface is where Mike will already be looking when reconciling.

### 8.3 If too large for one phase

Ship the helpers only. Add the widget in a small Phase G.2 follow-up. The Ready-to-invoice panel covers the per-job version of these checks regardless.

---

## 9. Test plan

All new tests; no replacement of existing tests.

### 9.1 Unit tests — labour cost calculation

`src/__tests__/lib/job-cost.test.ts`:

- `getWorkerPayableHours` returns `approved_hours` when present, else `actual_hours`, else null
- `getWorkerEstimatedHours` returns first non-null of approved / actual / allocated
- `getWorkerRate` returns `pay_rate` when present, else the fallback
- `getWorkerLabourCost` returns `pay_rate × payable_hours`, returns 0 when either is null
- `getWorkerLabourCost` never silently uses `contractors.hourly_rate` (no fallback hidden in this function)
- `getJobLabourCost` sums across an array of workers
- `getWorkerVariance` returns null when allowed_hours is null

### 9.2 Unit tests — pay_rate snapshot on assignment

`src/__tests__/actions/assign-job.test.ts`:

- assignJob with contractor having `hourly_rate=50` and no prior `job_workers` row → upsert writes `pay_rate=50`
- assignJob with contractor having `hourly_rate=NULL` → returns `{ error: 'no hourly rate' }` and no `job_workers` write
- assignJob over an existing `job_workers` row where `pay_rate` already set → does NOT overwrite the existing `pay_rate`
- assignJob with the `force_no_rate` flag set + contractor having no rate → succeeds, writes `pay_rate=null`, writes the override audit row (only if this path is included in the build)

### 9.3 Unit tests — fallback display logic

Already covered by `getWorkerEstimatedHours` and `getWorkerRate` tests in 9.1. Plus a presentational test:

- The job page rendered with approved=null, actual=4.5, allowed=4 displays "Estimated pay: 4.5 × $X = …" with a clear "estimate" label.

### 9.4 Cross-surface consistency test

`src/__tests__/pages/finance-cost-consistency.test.ts`:

- Set up a job with two `job_workers` rows, varying approved/actual/pay_rate combos
- Compute the per-job cost via the canonical helper
- Render the finance dashboard for the period containing the job's `scheduled_date`
- Assert the dashboard's per-job cost cell matches the helper output to the cent

### 9.5 Missing-rate guard

Covered in 9.2 plus a UI-layer test:

- AssignJobButton receives the error returned by `assignJob` and surfaces it clearly, with a link to the contractor edit page.

### 9.6 Regression tests — must remain green

These existing flows must continue to work end-to-end without modification:

- Quote → accept → conversion → invoice send → Stripe pay → status flips (no change to any of these paths)
- PDF rendering on portal print + share routes
- Share-page Accept Quote checkbox + Stripe Pay flow
- Pre-existing Jest baseline (3 failing suites: `submit-application`, `services`, `Header`)
- Pre-existing tests for `send-quote-email`, `send-invoice-email`, share-token routing — must remain green

No customer-facing surface gets a new test; this phase explicitly does not touch those.

---

## 10. Rollout order

Smallest-blast-radius order, designed to keep each step green and revertable.

1. **Add shared labour-cost helpers** — `src/lib/job-cost.ts` + tests. Pure functions, no callers yet. Land as a self-contained PR.
2. **Switch labour-calc.ts to prefer `pay_rate`** — backward compatible (when `pay_rate` is missing, falls back to `hourly_rate`). Add tests. No call-site change beyond the input shape gaining an optional field.
3. **Snapshot `pay_rate` on assignment** — `assignJob` writes `pay_rate` + `pay_type` on first upsert; reject when contractor has no rate. Add tests. Audit row added.
4. **Job page financial summary expansion** — Labour & Margin reads from new helpers; per-worker columns updated; pay status inlined. No new logic, just clearer presentation.
5. **Finance dashboard alignment** — replace `jobs.contractor_price` read with `getJobLabourCost(jobWorkers)`. Add cross-surface consistency test.
6. **Variance display on contractor pay-run detail** — read-only column add.
7. **Ready-to-invoice panel** — checks-only display first; admin-override action follows.
8. **Cleanup flag helpers + small widget** — flag library; widget on `/portal/finance`. If widget UI grows, defer to G.2.
9. **Contractor Payables transition guidance** *(Phase G.2 optional)* — soft informational banner only, no read-only or deprecation framing. Phase G.1 does not touch `/portal/contractor-invoices`.
10. **Run the gauntlet** — `npm test`, `npx tsc --noEmit`, `npx next lint`, optional `npm run build` (Netlify is authoritative on Linux).

Each step is a separate commit or PR. Steps 1, 2, 5, 6, 9 are all individually shippable on their own.

---

## 11. Rollback strategy

Phase G is structured to be reversible at each step:

- **Steps 1–2** (helpers + labour-calc tweak): backward compatible. Rollback = revert the commits; existing code paths still read `contractors.hourly_rate` as before.
- **Step 3** (snapshot on assignment): rollback = revert. Rows that received a snapshot during the brief window remain valid; the snapshot is additive and accurate. No backfill needed.
- **Step 4** (job page presentation): rollback = revert; the underlying data on `job_workers` is unchanged.
- **Step 5** (finance dashboard): rollback = revert; the dashboard falls back to reading `jobs.contractor_price`. No data corrupted.
- **Step 6** (pay-run variance columns): rollback = revert; pay-run rows unchanged.
- **Step 7** (Ready-to-invoice panel): rollback = revert. The override audit verb stays present in `audit_log` but is harmless if no surface emits it.
- **Steps 8–9** (cleanup widget, contractor-payables transition guidance): rollback = revert; pure UI removals. The contractor-invoices area remains active before and after.

Database safety:
- No migrations to roll back.
- New audit-log action verbs are append-only text values — no schema impact, no need to clean up.
- `job_workers.pay_rate` rows written by the assignment snapshot are identical to what would have been written at approval time; even if Phase G is fully reverted, the data is still correct and usable by the pre-Phase-G Pay Approvals row.

A fully reverted Phase G leaves the codebase exactly as it is today, plus some accurate `pay_rate` rows on `job_workers`. No data loss, no orphaned rows, no broken flows.

---

## 12. Acceptance criteria

Phase G is complete only when **all** of the following are true:

1. Contractor pay is **auto-calculated** from snapshotted `pay_rate × approved payable hours` on the job page, the contractor pay-run detail, and the finance dashboard.
2. Allowed, actual, and approved hours are clearly labelled and visible on every job page.
3. Labour variance is visible in **hours and dollars** on the job page and on the contractor pay-run detail.
4. Job page and finance dashboard use the **same labour-cost logic** — proved by `finance-cost-consistency.test.ts`.
5. Assigning a contractor with **no hourly rate** is handled clearly — either hard-blocked with a helpful error pointing to the contractor edit page, or admin-overridden with audit. Never silent.
6. The **contractor-invoices area is untouched in Phase G.1** — list / detail / create / approve / mark paid all behave identically. (Phase G.2 may add a soft transition-guidance note; it must not disable any action or apply "legacy / read-only" framing.)
7. **No customer-facing change** — quote, invoice, share, PDF, Stripe, accept-quote, send-email flows all behave identically.
8. **Existing tests pass** at the documented baseline (3 failing suites: `submit-application`, `services`, `Header`). New Phase G tests pass.
9. **`npx tsc --noEmit`** is clean.
10. **`npx next lint`** has zero `Error:` lines.
11. **`npm run build`** passes on Netlify deploy preview (Windows local build is known to fail with the Next.js EISDIR/readlink quirk on `node_modules/next/dist/pages/_app.js`; Netlify is authoritative).
12. The Ready-to-invoice panel exists on the job page and:
    - shows ✓ for clean jobs,
    - shows ⚠ for soft warnings without blocking,
    - shows ✗ + admin-override path for hard blocks,
    - does not slow down day-to-day operations.

Bonus / nice-to-have:
- Cleanup widget visible on `/portal/finance` showing the top N jobs needing attention with click-through. If deferred to G.2, the helpers are still present and tested.
- Variance threshold is documented as a constant in code with a `// TODO: surface in settings (Phase L+)` comment.

---

## 13. Open questions before implementation

After the repo inspection captured above, only a handful of decisions remain.

1. **Admin override for no-rate assignment** — include in Phase G or defer?
   - **Recommendation:** include the `force_no_rate` flag and the override audit verb, but skip the modal UI. Default workflow is hard-block. Admin override is an opt-in path called only from a small secondary button on the Assign modal that asks for a reason. Estimated cost: low.

2. **Pay-rate override pre-approval — UI surface?**
   - The Phase G data design allows admin to edit `job_workers.pay_rate` between assignment and approval. The implementation question is whether to expose an inline rate-edit cell on the per-worker breakdown or only via a small "Override rate" button. **Recommendation:** small button with reason field, mirroring the no-rate override pattern. Inline edit is a polish item for a later phase.

3. **Cleanup widget placement — finance vs dashboard?**
   - **Recommendation:** finance, per section 8.2 Option A.

4. **Pay-run variance source — `job_workers.hours_allocated` or `jobs.allowed_hours`?**
   - These can disagree if `hours_allocated` was set on assignment to a per-worker split. **Recommendation:** prefer `job_workers.hours_allocated` for per-worker variance; fall back to `jobs.allowed_hours / worker_count` when null. Document this decision in the helper.

5. **Should the Ready-to-invoice panel block the existing Convert-to-Invoice flow?**
   - **Recommendation:** no. Phase D's gates already handle the hard-stop behaviour. The panel is informational; it displays the same hard-block reasons the existing flow would surface anyway. This keeps Phase G off the production path of conversions.

6. **`jobs.contractor_price` — leave the write path, or stop writing it?**
   - **Recommendation:** leave the write path for now. Existing forms (`JobForm.tsx`, recurring-jobs forms) still populate it as a pre-fill for the contractor cost expected on a new job. The change in Phase G is purely on the *read* path for finance/profit. Phase J or later can decide to drop the column entirely.

7. **Contractor-invoices area transition guidance — what wording, and when?**
   - **Recommendation:** Phase G.1 does nothing. Phase G.2 optionally adds the soft note from §3.8 above. The full Contractor Payables evolution (workflows A + B + pay-run grouping + matching) is a later phase. No "legacy", no "read-only", no disabled actions, no route renames.

8. **Per-contractor payment style — set on contractor profile, or per pay run?**
   - When Workflow A (contractor-supplied invoice) and Workflow B (Sano-generated internal payable) coexist, should each contractor's preferred style be a profile flag (e.g. `contractors.invoices_sano: true|false`), or chosen per pay run? **Recommendation:** profile flag, with a per-pay-run override option. Decide formally in the future Contractor Payables phase spec.

None of these questions block implementation. Each has a default in the recommendation; the implementer can either accept the default or raise the specific question before the corresponding step.

---

## 14. Companion documents

- [`2026-05-26-finance-accounting-review.md`](2026-05-26-finance-accounting-review.md) — current-state map, phased roadmap (G → N), risk register.
- [`2026-05-26-job-financials-foundation-plan.md`](2026-05-26-job-financials-foundation-plan.md) — practical Phase G plan, source-of-truth direction, what not to overcomplicate.
- Future: Phase H implementation spec — payment records + audit hardening.
- Future: Phase I implementation spec — expenses foundation.
