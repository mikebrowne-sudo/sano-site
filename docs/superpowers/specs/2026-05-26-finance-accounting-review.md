# Sano finance / accounting / job-costing — current state + future plan

> Spec type: review + roadmap
> Status: planning (no implementation yet)
> Created: 2026-05-26
> Companion plan: [`2026-05-26-job-financials-foundation-plan.md`](2026-05-26-job-financials-foundation-plan.md) — the practical Phase G plan that sits on top of this review.
> Scope: finance, accounting, contractor pay, job costing, expenses, reporting. No customer-facing change. No PDF / share-page / Stripe / email change.

---

## Executive summary

The portal already has most of the **operational** pieces (quotes, jobs, invoices, contractor hours, employee + contractor pay runs, audit log, soft-delete, RLS). The **financial** layer on top has three structural problems:

1. **Two parallel contractor-payment systems coexist.** The existing `/portal/contractor-invoices` area (table `contractor_invoices`, with a variance display Mike currently relies on) and the newer Phase E/E.1 `/portal/payroll/contractor-runs` pipeline (tables `pay_runs.kind='contractor'` + `pay_run_items`) are not cross-linked. The right future direction is to **evolve the contractor-invoices area into Contractor Payables / Contractor Pay Runs** — not retire it. Sano has two real contractor-payment scenarios that both need a home: contractors who invoice Sano, and contractors who don't (where Sano generates the internal payable from approved job hours).
2. **Per-job profit is calculated from three different sources** depending on the surface. The finance dashboard reads a denormalised number on `jobs.contractor_price`; the job detail page reads `job_workers` rates and approved/actual hours through `src/lib/labour-calc.ts`; the contractor-invoice view reads its own `amount` column. The numbers disagree.
3. **No expense layer, no payment-record table, no period locking, no GST / accountant reports, and the largest single audit gap is invoice→paid via Stripe webhook.**

All three are fixable without touching customer-facing surfaces. The recommended first build phase is consolidating contractor cost source of truth — once labour cost has a single canonical formula, every downstream phase (expenses, profit, reports, exports) lands on trustworthy data.

---

## 1. Current state map (financial surfaces)

| Surface | Path | What it does | Reads | Writes |
|---|---|---|---|---|
| Quotes | `/portal/quotes` | Build, version, send, accept | `quotes`, `quote_items`, `commercial_*`, `proposal_settings` | `quotes`, `quote_items` |
| Invoices | `/portal/invoices` | Create, send, mark paid, archive | `invoices`, `invoice_items`, `clients` | `invoices`, `invoice_items` (no audit on status flips) |
| Jobs | `/portal/jobs/[id]` | Assign, track, review; Labour & Margin panel | `jobs`, `job_workers`, `contractors`, settings | `jobs`, `job_workers` |
| Contractor invoices (evolving → Contractor Payables) | `/portal/contractor-invoices` | Per-job/contractor payment record with variance. Active surface; future direction is to become the Contractor Payables / Contractor Pay Runs home for both contractor-supplied invoices and Sano-generated internal payables. | `contractor_invoices`, `jobs`, `contractors`, `job_workers` | `contractor_invoices` |
| Payroll — employees | `/portal/payroll`, `/new`, `/[id]` | Auto-build pay-run lines via `nz-paye`; email payslip HTML | `pay_runs`, `pay_run_lines`, `payslips`, employee `contractors` | All three (no audit) |
| Payroll — contractor pending | `/portal/payroll/contractor-pending` | Queue of approved hours awaiting bundling | `job_workers` (`pay_status='approved'`) | n/a |
| Payroll — contractor runs | `/portal/payroll/contractor-runs` | Draft → approved → paid bundles + CSV export | `pay_runs` (`kind='contractor'`), `pay_run_items`, `job_workers` | All three (audited) |
| Finance dashboard | `/portal/finance` | Revenue / paid / unpaid / contractor cost / est. margin + monthly breakdown + overdue list | `invoices`, `invoice_items`, `jobs.contractor_price` | n/a |
| Expenses | `#` (nav placeholder) | Nothing — `nav-config.ts:64` `placeholder: true` | n/a | n/a |
| Reports / exports | only `/portal/payroll/contractor-runs/[id]/csv` | One CSV for contractor pay runs | `pay_runs` + `pay_run_items` + `contractors` | n/a |

---

## 2. Current data flow (plain English)

1. Quote built: `quotes.base_price` + items + `estimated_hours` + commercial scope where applicable.
2. Quote accepted: status flips. Audited on both share and portal paths.
3. Conversion: Create Job, Create Invoice, or Create Job + Invoice. `jobs.allowed_hours` is copied from `quote.estimated_hours`; `jobs.scope_snapshot` is the agreed scope.
4. Assignment: a `job_workers` row is upserted with `hours_allocated`.
5. Execution: either contractor (via `/contractor/jobs/[id]`) or staff hits Start/Complete. The action writes `actual_start_time`, `actual_end_time`, and a computed `actual_hours` onto the `job_workers` row. Staff can override `actual_hours` later via `ActualHoursEditor`.
6. Review: admin clicks Mark Reviewed; sets `reviewed_at`. Audit row.
7. Hours approval: admin uses `ApproveHoursButton` on the job page. Snapshots `contractors.hourly_rate` → `job_workers.pay_rate`, writes `approved_hours`, `pay_type='hourly'`, `pay_status='approved'`. Audit row.
8. Pay run bundling: admin opens `/portal/payroll/contractor-runs/new`, picks a period. The action grabs every `job_workers` row with `pay_status='approved'` and `approved_at` inside the window (non-archived jobs only), inserts a `pay_runs` row (`kind='contractor', status='draft'`), bulk-inserts `pay_run_items`, flips `pay_status='included_in_pay_run'`. Audit row.
9. Pay run approve → paid: status transitions are audited. Marking paid cascades to `pay_run_items.status='paid'` and `job_workers.pay_status='paid'`.
10. Invoice send: `sendInvoiceEmail` flips invoice to `sent`, attaches PDF, also flips linked job `payment_status='invoice_sent'`. **No audit row.**
11. Invoice paid: either manual (`markInvoicePaid`) or Stripe webhook flips to `paid`. Job `payment_status='paid'`. **No audit row on either path.**
12. Finance dashboard: reads `invoices` and `jobs`; computes margin from `jobs.contractor_price`.

### Parallel path — the existing "contractor invoice" surface

A separate `/portal/contractor-invoices` flow lets the admin create a row in `contractor_invoices`, set an `amount`, and see a variance against `hourly_rate × allowed_hours`. Status lifecycle pending → approved → paid. This flow does not write to `job_workers`, `pay_runs`, or `pay_run_items`. It is functionally an alternative ledger that Mike has been using to approve and pay contractors, parallel to the Phase E pipeline.

This area is **not legacy in the sense of "to be removed"**. It fills a real operational need — recording payments to contractors who don't invoice Sano — and the future direction is to evolve it into the Contractor Payables / Contractor Pay Runs home. See §10 ("Recommended future direction") and §11.5 ("Contractor Payables / Pay Runs — supported workflows") for the target model.

---

## 3. Existing finance / accounting surfaces — strengths and gaps

### Strengths

- **Audit log + `record_snapshots` + RLS** are well-built and reused across quotes, invoices, jobs, contractor pay runs.
- **Soft-delete with restore** works for quotes, invoices, and jobs.
- **`pay_rate` is snapshotted at hours-approval time.** Historical pay never drifts when contractor rates change.
- **`scope_snapshot` on jobs** does the same for scope vs evolving quotes.
- **`src/lib/labour-calc.ts`** is a pure, well-tested calculator for per-worker cost (base pay, holiday loading, employer KiwiSaver, ACC).
- **Phase E + E.1 contractor pay-run lifecycle** is rigorous: status enums, audit at every transition, rollback on failure, idempotent operations.
- **`nz-paye`** actually computes real PAYE / student loan / KiwiSaver brackets — not stubs.
- **`/portal/finance` period selector** (this month / last month / last 3 / YTD / custom) and overdue list are working.

### Gaps

- **Two contractor-pay systems** with no cross-linking. Variance only on the older one.
- **`jobs.contractor_price`** is a stale denormalisation. Nothing keeps it in sync with `job_workers`.
- **Stripe webhook flips invoice→paid with no audit row.** Single largest audit gap.
- **Manual `markInvoicePaid` writes no audit row.**
- **Job status transitions (start / complete / etc.) are not audited** — only `job.reviewed` and `job.schedule_changed`.
- **ACC referenced in `labour-calc.ts` but never stored** on payslip rows.
- **Employee pay runs are not audited** (contractor pay runs are).
- **No payment-record table.** "Paid" is a status flag, not a row with amount / method / reference.
- **No period close, no FY/quarter selector, no inflow/outflow ledger.**
- **No expense model.** Nav placeholder only.
- **No CSV exports except contractor pay runs.** No invoice register, no expense register, no GST101 prep.

---

## 4. Existing tables and logic

### Existing tables that matter for finance

`quotes`, `quote_items`, `invoices`, `invoice_items`, `jobs`, `job_workers`, `contractors`, `contractor_invoices` (evolving into Contractor Payables), `pay_runs`, `pay_run_lines`, `payslips`, `pay_run_items`, `audit_log`, `record_snapshots`, `notification_logs`, `job_settings`, `proposal_settings`, `commercial_quote_details`, `commercial_scope_items`, `recurring_jobs`, `recurring_contract_reminders`.

### Existing logic that matters

- `src/lib/labour-calc.ts` — pure calculator for `calculateLabour`, `calculateActualLabour`, `calculateVariance`. Used only by the job detail page.
- `src/lib/nz-paye.ts` — NZ tax math for employee pay-run lines.
- `src/lib/invoice-dates.ts` — canonical `computeInvoiceDueDate` / `resolveServiceDate`.
- `src/lib/quote-status.ts` — single source of truth for quote status labels and gate helpers.
- `src/lib/is-admin.ts` — `isAdminEmail`, `isAdminUser` (migration from inline checks ongoing).
- `src/app/portal/payroll/contractor-runs/_actions.ts` — contractor pay-run lifecycle (create, approve, mark paid). All audited.
- `src/app/portal/jobs/[id]/_actions-approve-hours.ts` — hours approval, snapshots pay_rate, audited.
- `src/app/api/stripe/webhook/route.ts` — flips invoice paid status (audit gap).

### Source-of-truth table (today)

| Figure | Source |
|---|---|
| Quoted revenue | `quotes.base_price + Σ quote_items.price − quotes.discount` (live calc) |
| Invoiced revenue | `invoices.base_price + Σ invoice_items.price − invoices.discount` via `calcInvoiceTotal` |
| Paid revenue | Same calc, filtered on `invoices.status='paid'`. No actual payment-record table. |
| Job labour allowance | `jobs.allowed_hours` |
| Actual labour hours | `job_workers.actual_hours` |
| Approved payable hours | `job_workers.approved_hours` |
| Contractor pay rate | `job_workers.pay_rate` (snapshotted at approval) |
| Contractor cost (per job) | **3 sources disagree:** (a) `job_workers.pay_rate × approved_hours` (job page, when approved); (b) `contractors.hourly_rate × actual_hours` (job page, before approval); (c) `jobs.contractor_price` (finance dashboard) |
| Payroll / staff cost | `pay_run_lines.gross_pay / paye / kiwisaver_* / net_pay` (employee only; ACC referenced but not stored) |
| Expenses | Does not exist anywhere |
| Profit | `job_price − calculated labour cost`, live in `labour-calc.ts`; only the job page uses it. Finance dashboard uses its own `contractor_price`-based margin. No expense input anywhere. |

---

## 5. Current contractor invoice vs payroll contractor run issue

There are two parallel contractor-pay surfaces. They are not cross-linked.

### Existing — `/portal/contractor-invoices` (evolving into Contractor Payables)

- Table: `contractor_invoices`
- Per-job/contractor payment record
- Status: pending → approved → paid
- **Variance display:** `ci.amount − (contractor.hourly_rate × job.allowed_hours)`, coloured red/emerald
- This is what Mike refers to when he says "contractor invoices are currently being used as a way to approve jobs / contractor payments"

### Newer — `/portal/payroll/contractor-pending` + `/portal/payroll/contractor-runs`

- Tables: `pay_runs` (`kind='contractor'`) + `pay_run_items`
- Bundle multiple approved-hours rows into a single pay run
- Status: draft → approved → paid
- Fully audited
- **No variance display** on the contractor pay-run detail view, even though the data (allowed vs actual vs approved hours) is already present on `job_workers`

### The structural problem

If both systems are used, the same job can have a paid `contractor_invoices` row and a `pay_run_items` row — and neither system tells the other. The variance formula used today also reads `hourly_rate × allowed_hours`, which can disagree with the snapshotted `pay_rate × approved_hours` formula used by the newer system.

### Recommended direction (Phase G + Phase G.2/G.3 progression)

The goal is **convergence, not removal**. Approved job hours become the single source of truth for what Sano owes a contractor; the contractor-invoices / payables surface becomes the place where Mike records *how Sano pays it* (either by matching a contractor-supplied invoice or by generating a Sano internal payable).

- Keep `contractor_invoices` data visible and **fully active**. Do not migrate, delete, or hide it.
- **No hard "legacy / read-only" banner.** Optional softer transition guidance can be added once the converged model is clearer — see §11.5 below.
- Move the variance UX onto the contractor pay-run detail view too (data already lives on `job_workers`); existing variance on `/portal/contractor-invoices` stays.
- Make `job_workers.pay_rate × COALESCE(approved_hours, actual_hours)` the single canonical contractor cost formula across the system.
- In a later phase, evolve the surface into Contractor Payables / Contractor Pay Runs that automatically groups approved job rows by contractor and pay period (see §11.5).

---

## 6. Current job cost / profit inconsistency

### Three sources of truth for per-job contractor cost

| Surface | Formula | Where |
|---|---|---|
| Job detail page (post-approval) | `job_workers.pay_rate × approved_hours` | via `src/lib/labour-calc.ts` |
| Job detail page (pre-approval) | `contractors.hourly_rate × actual_hours` (live) | via `src/lib/labour-calc.ts` |
| Finance dashboard | `jobs.contractor_price` (denormalised single number) | `/portal/finance/page.tsx` |
| Existing contractor invoice variance | `contractors.hourly_rate × allowed_hours` | `/portal/contractor-invoices/*` |

### Why this is fragile

- `jobs.contractor_price` is written at some points (job creation, assignment, manual edits) but not kept in sync with `job_workers` mutations. It can drift silently.
- The job detail page uses live `hourly_rate` for pre-approval cost — if a contractor's rate changes between job completion and hours approval, the displayed cost shifts.
- The existing contractor-invoices variance formula uses `hourly_rate × allowed_hours`, which doesn't reflect any actual or approved hours and ignores the snapshotted pay rate.

### Profit calculation

There is no stored `profit` column on any table. The job detail page live-computes profit per render using `calculateVariance(job_price, allowed_hours, workers)`. The finance dashboard live-computes margin from `invoices` + `jobs.contractor_price`. The two numbers can — and do — disagree for the same job.

Neither calculation includes expenses (there is no expense model).

---

## 7. Current expenses gap

- **No `expenses` table.** `grep` for `.from('expense'` returns zero matches.
- **No `/portal/expenses` route folder.**
- **Single nav placeholder** at `src/app/portal/_components/nav-config.ts:64`: `{ href: '#', label: 'Expenses', icon: Wallet2, placeholder: true }`.
- **No expense settings** under `/portal/settings/*`.

This is greenfield. No data to migrate, no existing surface to honour.

---

## 8. Current reporting / export gaps

- **No `/portal/reports` route.** "Profit / reports" nav item points at `/portal/finance`.
- **CSV exports outside payroll:** none. Only `src/app/portal/payroll/contractor-runs/[id]/csv/route.ts` exists.
- **Tax / Xero / MYOB / IRD / GST101 / GST return:** zero matches in src/. No accounting integration layer of any kind.
- **GST handling today:** GST number `141-577-062` hardcoded in `QuoteDocument.tsx`, `InvoiceDocument.tsx`, commercial proposal template. `gst_included` boolean on quote/invoice forms. Commercial pricing splits `subtotal_ex_gst` / `gst_amount` / `total_inc_gst`. No GST period rollup, no GST101 export.
- **No invoice register, expense register, contractor pay summary CSV, employee pay summary CSV.**
- **No period close** — anything can be edited retroactively without warning.

---

## 9. Risks and hard stops

These constraints apply to every phase below.

### Things to not break

- **PDF / share-page rendering** — touch nothing in `src/components/document`, `src/app/share/**`, `src/app/api/**/pdf`, `render-pdf.ts`.
- **Stripe payment flow** — webhook handler can be *extended* (add `invoice_payments` row + audit row); the redirect / amount / metadata path must not change.
- **Pay-rate snapshotting** — every new surface reads `job_workers.pay_rate` for historical data; never `contractors.hourly_rate`.
- **Existing audit log payloads** — append new action verbs; do not rename existing ones (timeline rendering depends on them).
- **`nz-paye.ts`** — pure math. Leave it alone. ACC persistence is additive.
- **`labour-calc.ts`** — current job page + variance code depends on it. Extend, do not reshape the interface.
- **Quote → Job/Invoice conversion gates** — leave the `job_settings` wiring intact (`require_review_before_invoicing`, `allow_job_before_payment`, etc.).
- **Share-token behaviour** — none of these phases touch tokens.
- **GST display in document templates** — the GST number, the `gst_included` boolean, and the totals math in `QuoteDocument` / `InvoiceDocument` stay exactly as they are. Reports compute their own GST view from invoice rows; the document is the contract with the customer.
- **`contractor_invoices` existing data** — never delete. The page stays active throughout; the data remains queryable and editable. Convergence with Contractor Payables happens via additive evolution, not removal.

### Compliance / audit risks the future model must avoid

- **Don't lose payment provenance.** Stripe webhook must write an audit row (and ideally an `invoice_payments` row).
- **Don't recompute historical pay.** Always read the snapshotted `pay_rate`.
- **Don't allow retro-edit of closed periods** once that phase lands.
- **Store GST per line where it matters for reporting,** so the report view doesn't depend on math drifting.
- **Soft-deletes must respect closed periods** — archiving a job that belongs to a closed period must not blank financial history.

---

## 10. Recommended future direction

### Single source of truth principles

| Concept | Future source |
|---|---|
| Revenue | `invoices` + `invoice_items` + `discount` (existing math, unchanged) |
| Money received | `invoice_payments` (NEW — append-only, per payment) |
| Invoice status `paid` | Derived: `Σ invoice_payments.amount >= invoice.total` |
| Job labour allowance | `jobs.allowed_hours` |
| Actual labour | `job_workers.actual_hours` |
| Approved payable labour | `job_workers.approved_hours` |
| Contractor pay rate | `job_workers.pay_rate` (snapshotted) |
| Contractor labour cost (per job) | `job_workers.pay_rate × COALESCE(job_workers.approved_hours, job_workers.actual_hours)` |
| Final contractor payable | `job_workers.approved_hours × job_workers.pay_rate` |
| Job expenses | `expenses` rows where `attached_job_id IS NOT NULL` (NEW) |
| Business overhead expenses | `expenses` rows where `attached_job_id IS NULL` (NEW) |
| Per-job profit | `job_price − labour cost − attached expenses` (view) |
| Period profit | `Σ invoiced revenue − Σ labour − Σ all expenses` (view) |
| GST output tax | Derived from invoice rows in period |
| GST input tax | Derived from expense rows in period |

### Architecture principles

- **Extend, don't replace.** Every existing table stays. New tables (`expenses`, `expense_categories`, `invoice_payments`, `accounting_periods`) sit alongside.
- **Audit every financial mutation.** Invoice status, invoice price/discount changes, expense create/edit/delete, job status transitions.
- **Profit is derived, not stored.** A `job_costs` view (materialised only if reads are slow) computes profit from the row data on demand.
- **Period close is a hard gate** when it lands. Pre-close, anything is editable. Post-close, edits need admin override + audit.
- **Don't try to be Xero.** Be the source that feeds Xero cleanly.

### Future data model sketch

```
quotes ───────────────► invoices ───────────────► invoice_payments (NEW)
   │                        │                            │
   │                        │   (status sync, audited)   │
   ▼                        ▼                            │
  jobs ──────► job_workers ─────► pay_run_items ─► pay_runs (contractor)
   │                                                     │
   │                                                     └──► employee:
   │                                                            pay_run_lines
   │                                                            payslips
   │
   ├──► expenses (NEW) ─── expense_categories (NEW)
   │
   ▼
job_costs (VIEW)
   │
   ▼
finance_period_summary (VIEW)        accounting_periods (NEW)
```

---

## 11. Phased roadmap

| Phase | Title | Outcome | Risk |
|---|---|---|---|
| **G** | Job financials and contractor cost foundation | Job detail page becomes the centre of financial truth. Contractor rate auto-populates on assignment. One canonical labour-cost formula used everywhere. Variance visible on the job page and on contractor pay runs. Finance dashboard aligned. Contractor-invoices area stays active; transition guidance can land later as Contractor Payables direction firms up. Cleanup/reconciliation flags planned but most are surfaced later. | Low — internal data plumbing. No customer surfaces. |
| **G.2** | Job-page Ready-to-invoice panel + cleanup widget + pay-run variance + Contractor Payables transition guidance | Job page gains a Ready-to-invoice ✓ / ⚠ / ✗ panel. "Jobs needing attention" widget on `/portal/finance`. Contractor pay-run detail gains allowed/actual/variance columns. **Contractor-invoices area gets soft transition guidance (no hard "legacy" banner)** explaining the future Contractor Payables direction. | Low — additive UI. |
| **G.3 / Contractor Payables** | Evolve `/portal/contractor-invoices` into Contractor Payables / Contractor Pay Runs | Approved job rows feed a contractor-and-period grouped payable. Two supported workflows: (a) match a contractor-supplied invoice against the expected payable; (b) generate a Sano internal payable directly from approved hours. See §11.5. | Medium — touches an active surface; data preservation required. |
| **H** | Audit + payment-record hardening | Stripe webhook + manual `markInvoicePaid` + job status transitions all audit. New `invoice_payments` table records every payment with method + reference. `invoices.status='paid'` becomes derived. | Medium — touches Stripe webhook path. Heavily testable; share-page UX unchanged. |
| **I** | Expenses foundation | `expenses` + `expense_categories` tables. `/portal/expenses` CRUD with receipt upload (Supabase Storage later). Per-job expense attachment optional. Settings page for categories + GST defaults. | Low — greenfield. |
| **J** | Job profitability rollup | `job_costs` view combining `job_workers` labour + `expenses` linked to job. Job page profit reads this. Finance dashboard uses the same view. | Low — read-side view; no writes. |
| **K** | Reports + exports | `/portal/reports` with monthly / quarterly / FY views. CSV exports: invoice register, expense register, contractor pay summary, employee pay summary, GST101 prep. Period selector + lock indicator. | Low — read-only routes. |
| **L** | Accounting periods + close | `accounting_periods` table + close-period action. Edits in closed periods blocked unless admin overrides + audited. UI shows lock indicator. | Medium — adds friction; needs an admin override pattern that's audited but not user-hostile. |
| **M** | Payroll polish | Employee pay-run audit log. ACC actually stored. Email payslips (PDF). Contractor payslip surface separate from `contractor_invoices`. | Low — incremental on existing payroll. |
| **N** | Accountant integration (optional, much later) | Xero-shaped CSV exports or direct API; if direct API, isolate behind an integration adapter. | High — external dependencies. |

The detailed practical plan for **Phase G** lives in [`2026-05-26-job-financials-foundation-plan.md`](2026-05-26-job-financials-foundation-plan.md).

### 11.5 Contractor Payables / Pay Runs — supported workflows

Sano currently pays contractors in two distinct ways. The future Contractor Payables surface must support both natively, both grounded in the same **canonical source of truth: approved job hours × snapshotted job pay rate**.

#### Workflow A — Contractor-supplied invoice

1. Contractor sends Sano a real invoice (PDF or paper).
2. Portal shows the **expected payable** for that contractor + period, derived from approved job rows.
3. Admin records the contractor invoice number, date, amount, and optional attachment.
4. Portal **compares** the contractor invoice amount against the expected payable.
5. Variance is surfaced if they disagree.
6. Admin approves (or investigates / amends) and marks paid.

#### Workflow B — Sano-generated internal payable

1. Contractor does not invoice Sano.
2. Portal **generates** a simple internal payable from approved job rows for the contractor + period.
3. No duplicate manual entry of job lines.
4. Admin reviews the pay-period summary.
5. Admin approves and marks paid.

#### Contractor Payable summary format

When a contractor completes multiple jobs in a period, the portal shows one contractor-level payable summary. The format stays simple — a clean total Mike can pay against, with a one-line breakdown per included job. Nothing else.

```
Contractor Payable
Fabiane
Pay period: 1 June 2026 to 15 June 2026

JOB-0047 · Barfoot & Thompson · 4.5 hrs × $45 = $202.50
JOB-0048 · Vicky Rao        · 3.0 hrs × $45 = $135.00
JOB-0051 · Move-out clean   · 5.0 hrs × $45 = $225.00

Total approved hours: 12.5
Total payable: $562.50
```

No optional extras under each line. No clutter. The payable summary is a payment instruction, not a job audit.

#### Source-of-truth discipline

- **Payable amount = `Σ approved_hours × job_workers.pay_rate`.**
- The contractor invoice / internal payable is the *payment document*, not the source of truth for labour cost.
- Finance reporting **always** reads the job-approved labour cost regardless of whether the payable has been paid yet.
- Admin never re-enters job lines that are already captured via approved hours.

#### Naming

For now, **no route renames**. Routes stay at `/portal/contractor-invoices` until a later phase formally approves a move. Docs and product language describe the future concept as:

| Term | Meaning |
|---|---|
| Contractor Payables | The broader concept — what Sano owes contractors. |
| Contractor Pay Run | The period-based grouping. |
| Contractor-supplied invoice | Invoice received from a contractor. |
| Sano-generated internal payable | Internal payable generated from approved job hours. |

---

## 12. Open questions to resolve before Phase G ships

- For new jobs assigned to contractors whose hourly rate is null, what is the desired fallback — block assignment, prompt, or silently leave the job rate null until set? *(Resolved in Phase G.1: hard-block with a clear error pointing to the contractor profile.)*
- Should the job detail page's "estimated pay" line use approved hours when present, then actual, then allowed — or always show all three rows?
- Should the cleanup/reconciliation view be a dashboard widget, a dedicated `/portal/reconcile` page, or a filter on the existing jobs list?
- Should staff (non-contractor employees) appear in `job_workers` and feed into the same labour calc, or stay only in employee payroll (`pay_run_lines`)?
- When Workflow A and Workflow B coexist in the same pay period, should a single Contractor Pay Run encompass both, or should each contractor's payment style be set on the contractor profile and respected per row?
- How should staff cost on a job (where the worker is a salaried employee rather than an hourly contractor) be attributed for profit purposes?
