# Spec — Link expenses to jobs (job costing)

**Date:** 2026-07-20 · **Status:** Draft (planning) · **Owner:** Mike

## 1. Problem & goal

When a job incurs a **direct cost** — e.g. a $80 tip/dump fee for rubbish disposal
on a shed-clearing job — there's currently no way to attach that cost to the job.
Expenses are recorded standalone, so we can't see the **true margin** of a job
(revenue − contractor pay − direct costs).

**Goal:** let staff link an expense to a job, so the cost rolls into that job's
profitability — **without ever appearing on the customer's invoice.**

This is the internal-cost counterpart to the customer-facing line item (which
already exists via the invoice "Edit pricing & line items" panel). The two are
deliberately separate: the **$300 shed-clearing charge** goes on the invoice; the
**$80 disposal cost** is internal only.

## 2. User stories

- As an admin, when I record a rubbish-disposal expense, I can **link it to the job**
  it belongs to, so the job's cost is accurate.
- As an admin, on a **job page** I can see the **direct costs** attached to that job
  and its **margin** (revenue − contractor pay − direct costs).
- The customer **never** sees these costs — they're absent from the invoice, PDF and
  share page.

## 3. Current state

- `expenses` table exists (category incl. the new **"Rubbish removal / disposal"**),
  with optional receipt attachment. **No link to a job.**
- Job revenue lives on `jobs.job_price` (+ any invoice line items).
- The finance page (`/portal/finance`) already computes **per-job labour**
  (contractor price). Direct costs are the missing input to a true margin.
- Invoices already support add-on line items (`invoice_items`) for the **customer**
  side — out of scope here.

## 4. Design

### 4.1 Data model
Add a nullable job link to expenses:
```sql
alter table public.expenses
  add column if not exists job_id uuid references public.jobs(id) on delete set null;
create index if not exists expenses_job_idx on public.expenses(job_id);
```
- Nullable — most expenses aren't job-specific (insurance, software, etc.).
- `on delete set null` — deleting a job keeps the expense (finance history intact),
  it just unlinks.

### 4.2 Linking an expense to a job — two entry points
1. **From the expense form** (`ExpenseForm`): an optional **"Link to job"** field — a
   searchable job picker (job number · client · address), defaulting to none.
2. **From the job page**: an **"Add cost"** action that opens the expense form
   pre-linked to that job (fastest path at the point the cost is known). Reuses the
   existing `createExpense` action + receipt upload.

### 4.3 Job page — costs & margin
On the job detail page, add a small **"Costs"** panel (admin-only), showing:
- Each linked expense: date · category · vendor · amount · 📎 (if receipt).
- A **margin summary**: `Revenue (job_price + invoice line items) − contractor pay −
  direct costs = margin` (with a $ and %).
- An **"Add cost"** button.

### 4.4 Finance / P&L impact
- The finance per-job view gains **direct costs** alongside labour, so job margin is
  complete.
- Linked expenses still appear in the normal Expenses list + P&L (they're real
  expenses); the job link is additive context, not a reclassification.

### 4.5 Hard rule — never customer-facing
- Linked expenses must **not** render on the invoice, invoice PDF, or `/share/*`.
- No code path from `expenses` into any invoice/quote render. (Verify by grep at
  build: invoice/share renderers never read `expenses`.)

## 5. Edge cases
- Expense linked to a job that's later archived/deleted → unlinks (`set null`),
  expense remains.
- One expense = one job (1:1 link). A cost spanning multiple jobs → record separate
  expenses, or leave unlinked (out of scope: splitting).
- GST: expenses keep their own `gst_inclusive`; margin math uses the recorded amount
  as-is (same as the finance page today). No new GST logic.
- Permissions: linking + the costs panel are **admin-only** (finance-sensitive).

## 6. Out of scope / future
- **Job-level "additional charges"** that auto-flow to the invoice (the phase-2
  customer-side nicety). Separate spec if wanted.
- Splitting one expense across multiple jobs.
- Contractor-entered job costs.

## 7. Migration (paste-ready)
```sql
-- Link expenses to jobs (job costing) — 2026-07-20
alter table public.expenses
  add column if not exists job_id uuid references public.jobs(id) on delete set null;
create index if not exists expenses_job_idx on public.expenses(job_id);
```

## 8. Acceptance
- [ ] An expense can be linked to a job (from the expense form **and** the job page).
- [ ] The job page shows linked costs + a margin (revenue − contractor pay − costs).
- [ ] Linking a disposal cost to a job does **not** change the invoice in any way.
- [ ] Deleting a job unlinks its expenses without deleting them.
- [ ] Gauntlet green (tsc · lint · tests at baseline).

## 9. Rollout
Small: 1 migration (Mike-run, verified via MCP before merge) + form field + job
costs panel + finance tie-in. One or two focused PRs. Reversible (revert PRs; the
`job_id` column can stay harmlessly if a PR is reverted).
