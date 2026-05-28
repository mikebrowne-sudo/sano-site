# Sano job financials foundation — workflow, cleanup, and snapshot plan

> Spec type: practical plan (Phase G)
> Status: planning (no implementation yet)
> Created: 2026-05-26
> Companion review: [`2026-05-26-finance-accounting-review.md`](2026-05-26-finance-accounting-review.md) — the current-state map and full phased roadmap.
> Scope: operational job financials, contractor pay flow, cleanup/reconciliation, finance snapshot direction. No customer-facing change. No PDF / share-page / Stripe / email change.

---

## Sano operating model: flexible invoicing, internal costing, and contractor pay

Sano is a small, evolving service business. The portal must stay nimble — it should not assume every job follows a single strict sequence of `complete → approve hours → invoice → pay → contractor pay`. In practice:

- Sano may invoice **before** a job is completed.
- Sano may take **payment** before a job is completed.
- Site conditions, scope, and hours may change after invoicing.
- Contractor payable hours may be approved **after** an invoice has been sent or paid.
- Sano may absorb extra labour cost without charging the client.
- Sano may need to charge a client extra after the original invoice has been sent.
- Customer-facing invoices should remain professional and stable once sent.

### Preferred operating model

| Concept | Role |
|---|---|
| Quote | Expected scope and price |
| Job | Operational work record + internal costing record |
| Invoice | Customer-facing payment document |
| Contractor payable / pay run | What Sano owes the worker |
| Finance | Reconciled view of what actually happened |

### Important rules

1. **Invoice timing is flexible.** Invoice creation must not require the job to be completed. Payment may happen before the job is complete. Ready-to-invoice checks are guidance only, never blockers.
2. **Internal job costing can continue after invoice.** Actual hours can be recorded post-invoice. Approved payable hours can be recorded post-invoice. Contractor pay can be updated post-invoice. Job margin updates naturally as the true labour cost becomes known.
3. **Sent / paid customer invoices stay stable.** Once an invoice is sent or paid, customer-facing financial records should not be silently amended. If the picture changes, Sano follows up explicitly.
4. **Extra charges after invoice are handled simply.** If extra customer charges are needed after an invoice is sent or paid, the simple workflow is to create an **additional invoice**. If Sano absorbs the cost, update internal job cost only. Full invoice-revision / credit-note logic is later scope, not now.
5. **Contractor pay stays hours-first for now.** Approved job-worker hours remain the source of truth. Contractor pay is calculated from `approved_hours × job_workers.pay_rate`. Don't build reverse "invoice amount → implied hours" logic yet — revisit only if staff struggle.
6. **Contractor invoices / payables direction.** Some contractors invoice Sano; some don't. The future Contractor Payables surface should support both contractor-supplied invoices and Sano-generated internal payables. The first version stays hours-first: approved hours → payable amount → pay run / payable summary. Don't let a contractor-supplied invoice amount silently change the captured job hours.

### What this means for the portal today

- The Ready-to-invoice panel on `/portal/jobs/[id]` is informational. It surfaces what's missing or unusual but never blocks `createInvoiceFromJob`.
- The Jobs needing attention widget on `/portal/finance` is informational. Severity labels (Needs fixing / Check / Info) are guidance, not gates.
- Pay-run variance columns on `/portal/payroll/contractor-runs/[id]` are read-only — variance signals a story; it doesn't change the payable.
- Existing Phase D `job_settings` gates (`require_review_before_invoicing`, `allow_job_before_payment`) are admin-configurable and admin-overridable. They exist for operators who want stricter discipline, not as a baseline requirement.

---

## A. Purpose

The first goal is to make every job financially clear and easy to reconcile.

The portal should help admin quickly answer:

- Is this job ready to invoice?
- Did the job go over allowed hours?
- What do we owe the contractor?
- Has the contractor pay been approved?
- Did we charge the client correctly?
- Are there missing hours, missing rates, missing invoice links, or missing cost data?
- Did this job make money?
- Does anything need fixing before month-end / accountant reporting?

These answers should not require digging through multiple pages or stitching together numbers from disagreeing surfaces. The job detail page should be the centre of financial truth — every related figure should be either visible there or one click away.

A second, equally important goal is to make the portal forgiving operationally. Sano is a small evolving service business. Quotes change, jobs change, sites change, scope changes, and Sano sometimes chooses to absorb cost rather than charge a client. The portal must support this without forcing premature accounting rigidity. Tighten only after the invoice is issued; lock only after an accounting period is closed (a later phase).

---

## B. Preferred user experience

The job detail page is the main place to review job financials.

The preferred end-to-end flow:

1. **Quote created** with services, price, and allowed/estimated hours.
2. **Quote can be amended** while in draft or sent status (existing behaviour, kept).
3. **Quote accepted.**
4. **Job created** with scope snapshot, allowed hours, and price (existing behaviour, kept).
5. **Job can still be adjusted** before invoicing if real-life conditions change — scope, hours, contractor, price, add-ons.
6. **Contractor or staff assigned.**
7. **Contractor hourly rate auto-populates** from the contractor profile at assignment time.
8. **Allowed hours auto-populate** from the job (already from `quote.estimated_hours`).
9. **Actual hours are captured** from the job — either by the contractor finishing the job in the contractor portal, or by admin entry / adjustment on the job detail page.
10. **Admin approves payable hours.** Defaults to actual, admin can adjust.
11. **Contractor pay auto-calculates** as approved hours × snapshotted job pay rate.
12. **Extras / adjustments can be added** before invoice — invoice line items, discounts, scope additions, time adjustments.
13. **Invoice issued.**
14. **After invoice is issued, financial changes become admin-only and audited.** Reason required where possible.
15. **Payment and contractor pay status** flow into finance reporting via existing mechanisms (invoice status + pay-run lifecycle).
16. **Job profit updates** from the same single source of truth used by the finance dashboard.

What changes at each stage of the lifecycle:

| Stage | Editable freely | Editable with audit | Editable only with admin override |
|---|---|---|---|
| Quote draft / sent | All quote fields | n/a | n/a |
| Quote accepted, no job yet | Quote (versioned) | n/a | n/a |
| Job created, no invoice | All operational + financial job fields | n/a | n/a |
| Job invoiced (Phase G+) | Operational notes | Financial fields | n/a |
| Job invoiced, period closed (Phase L+) | Operational notes | n/a | Financial fields |

---

## C. Contractor pay calculation direction

Contractor pay should not be manually typed as the normal workflow. The portal should compute it from the same fields that already capture allowed hours, actual hours, approved hours, and the snapshotted job rate.

### Snapshot rule

When a contractor is assigned to a job:

- Read the contractor's current `contractors.hourly_rate`.
- Copy that rate onto the `job_workers` row as `pay_rate` — the job-specific snapshotted rate.
- Use that snapshotted rate for all historical pay calculations on this job, regardless of any later change to `contractors.hourly_rate`.

The Phase E hours-approval flow already does this snapshot at approval time. Phase G extends it to also snapshot at **assignment time**, so the rate is visible and explicit from the moment a contractor is assigned. Approval can refine the rate if needed (admin override below).

### Formula

```
final contractor pay = approved payable hours × job_workers.pay_rate
```

When approved hours are blank, fall back gracefully:

```
estimated contractor pay =
  COALESCE(job_workers.approved_hours, job_workers.actual_hours, job_workers.hours_allocated)
  × job_workers.pay_rate
```

### UI display on the job page

The job detail's Labour & Margin section should clearly show, for each worker:

- contractor name
- worker type (employee / contractor)
- hourly rate (the snapshotted `pay_rate`)
- allowed hours
- estimated pay based on allowed hours
- actual hours
- estimated pay based on actual hours
- approved payable hours
- final approved contractor pay
- variance in hours (actual − allowed)
- variance in dollars (final pay − pay based on allowed)
- pay status (pending / approved / included_in_pay_run / paid)

### Important rules

- **Allowed hours** = what we expected at quote / assignment.
- **Actual hours** = what happened during the job.
- **Approved payable hours** = what admin agrees to pay (defaults to actual).
- **Final contractor pay** = approved payable hours × snapshotted job pay rate.
- If approved payable hours are blank, show **estimated pay** using actual hours when available, otherwise allowed hours.
- Use `job_workers.pay_rate` for all historical pay calculations after the job rate has been snapshotted.
- Do **not** use `contractors.hourly_rate` for old / historical pay after the job rate has been snapshotted.
- Allow admin to **override** the job-specific pay rate before payment approval if needed.
- Any override must be clearly visible on the row and **audited** with reason.

### Override discipline

- Override is allowed pre-approval at any time.
- After approval, override requires explicit admin action + reason + audit.
- After pay-run paid, override is blocked (data is locked by `pay_status='paid'` already).

---

## D. Flexibility rules

### Before invoice is issued

Admin should be able to change, without ceremony:

- service scope (`jobs.scope_snapshot` is point-in-time, but the *job* can carry adjustments alongside)
- price (`jobs.job_price`)
- discounts
- add-ons
- extra charges
- allowed hours (`jobs.allowed_hours`)
- actual hours (`job_workers.actual_hours`)
- approved payable hours (`job_workers.approved_hours`)
- contractor / staff assignment
- job-specific contractor rate (`job_workers.pay_rate`)
- internal notes (`jobs.internal_notes`)
- client-facing notes (`jobs.contractor_notes` — visible to contractor)
- invoice draft details (until invoice is sent)

Why this flexibility matters:

- site conditions change
- clients can be late
- access issues happen
- more time may be needed
- extra work may be requested
- Sano may choose to absorb extra cost or charge the client
- jobs sometimes need cleanup before being invoiced

### After invoice is issued

The distinction here is **customer-facing vs internal-only**:

- **Customer-facing invoice rows** (line items, totals, GST treatment): once an invoice is sent or paid, these should stay stable. Don't silently amend. If extra customer charges are needed, create an **additional invoice** rather than editing the sent one. Full credit-note / invoice-revision flow is later scope.
- **Internal job costing** (actual hours, approved payable hours, contractor pay rate, internal notes): can continue to evolve post-invoice. Sano often invoices before the real hours land; that's expected and the portal must support it. These updates should be admin-only and audited, with a soft warning when they materially change profit, contractor pay, or reporting (e.g. *"This change reduces estimated profit by $X. Continue?"*).
- **Job-level fields that bleed both ways** (job_price, scope_snapshot, allowed_hours): admin-only and audited, with a warning if a sent invoice references them. The warning is the prompt to issue an additional invoice rather than edit the original.

### After a future accounting period is closed / exported (later phase)

- Changes should be **blocked** by default.
- Admin override required and audited.
- This is a future phase (Phase L), not the first build.

---

## E. Financial snapshot direction

The portal should eventually have a finance snapshot/dashboard that shows:

**Revenue and cash**
- revenue this month (invoiced, ex-GST and inc-GST)
- paid invoices in period
- unpaid invoices
- overdue invoices

**Cost**
- contractor labour cost (computed from `job_workers.pay_rate × COALESCE(approved_hours, actual_hours)`)
- approved but unpaid contractor pay (sum of `job_workers` where `pay_status='approved'`)
- staff / payroll cost where available (from `pay_run_lines` for the period)
- job expenses (later, when expense model exists)
- overhead / business expenses (later)

**Profit**
- estimated gross profit (revenue ex-GST − labour − expenses)

**Operational health (the "cleanup" view)**
- jobs with missing cost data
- jobs with labour variance over a threshold
- jobs completed but not invoiced
- jobs invoiced but missing approved hours
- jobs where contractor pay is not included in a pay run
- jobs with negative or low margin
- jobs needing reconciliation

This should feel like a simple **business health snapshot**, not a complex accounting dashboard.

Phase G delivers the data alignment that makes this snapshot trustworthy. The snapshot UI itself is the second half of Phase G or a small Phase G.1.

---

## F. Cleanup and reconciliation direction

A future cleanup / reconciliation view will help admin find jobs that need fixing.

### Suggested cleanup flags

| Flag | Source check |
|---|---|
| Accepted quote but no job | `quotes.status='accepted' AND NOT EXISTS(jobs WHERE quote_id=q.id)` |
| Completed job but no invoice | `jobs.status='completed' AND invoice_id IS NULL` |
| Invoice sent but job not marked invoiced | `invoices.status IN ('sent','paid') AND linked job.status != 'invoiced'` |
| Job has contractor assigned but no pay rate | `job_workers.pay_rate IS NULL` |
| Job has actual hours but no approved payable hours | `job_workers.actual_hours IS NOT NULL AND approved_hours IS NULL` |
| Job has approved hours but no contractor pay run | `pay_status='approved'` and not `included_in_pay_run` for older than N days |
| Contractor pay run exists but job still shows unpaid | `pay_run_items.status='paid'` but linked `job_workers.pay_status != 'paid'` (race-guard mismatch) |
| Job has allowed hours missing | `jobs.allowed_hours IS NULL` |
| Job has actual hours greater than allowed hours by > 25% | variance threshold |
| Job has invoice total different from expected job price | `invoice_total != job_price` outside known add-on amounts |
| Job has low or negative margin | profit < 10% (configurable) |
| Paid invoice with missing payment audit / payment record | until Phase H lands, all Stripe-paid invoices flag this — that flag will go away on Phase H |
| Contractor invoice exists for a job that also has pay-run data | both `contractor_invoices` row and `pay_run_items` row exist for the same `(job_id, contractor_id)` — convergence flag, not an error; surfaces when both payment paths happened |
| Expenses linked to closed / paid jobs that may affect profit | once expenses model lands (Phase I) |

### Goal

Give Mike a clear "things to fix" list before relying on reports. The view should be a simple table with one job per row, the list of flags it tripped, and a click-through to fix.

This view can be a Phase G deliverable in skeletal form (the data alignment makes most of these flags computable), with the full UI in a later phase if needed.

---

## G. Source of truth direction

| Concept | Source |
|---|---|
| Revenue | `quotes` / `invoices` / `invoice_items` totals via existing math (unchanged) |
| Job labour allowance | `jobs.allowed_hours` |
| Actual labour | `job_workers.actual_hours` |
| Approved payable labour | `job_workers.approved_hours` |
| Contractor pay rate | `job_workers.pay_rate` (the snapshotted job rate) |
| Contractor labour cost (per job) | `job_workers.pay_rate × COALESCE(job_workers.approved_hours, job_workers.actual_hours)` |
| Final contractor payable | `job_workers.approved_hours × job_workers.pay_rate` |
| Profit (per job) | revenue ex-GST − approved labour cost − expenses (when expenses land) |
| `contractor_invoices` (the existing surface, evolving into Contractor Payables) | Kept **fully active**. Not legacy in the "to be removed" sense. The future direction is to evolve this surface into Contractor Payables / Contractor Pay Runs that natively supports both (a) matching contractor-supplied invoices against expected payables and (b) generating Sano internal payables directly from approved job hours. No data deletion. No migration. No hard "read-only" banner. See the companion review doc §11.5 for the target model. |

This source-of-truth table is the canonical reference for every subsequent phase. Any future surface that displays one of these figures must compute it from the listed source — no parallel formulas, no second source of contractor cost.

### Contractor Payables — two supported workflows

The existing contractor-invoices area covers two real scenarios Sano needs both of:

**A. Contractor-supplied invoice.** Contractor sends an invoice. Portal shows the expected payable from approved job rows. Admin records the contractor's invoice number / date / amount, the portal compares against expected, surfaces any variance, and admin approves + marks paid.

**B. Sano-generated internal payable.** Contractor does not invoice Sano. Portal generates a simple internal payable from approved job rows (no manual re-entry). Admin reviews, approves, marks paid.

Both paths share the same source of truth: approved hours × snapshotted job pay rate. The contractor invoice or internal payable is the *payment document*, not the source of truth for labour cost. Finance reporting always reads job-approved labour cost regardless of whether the payable has been paid yet.

### Contractor Payable summary format

When a contractor completes multiple jobs in a pay period, the portal eventually shows one contractor-level payable summary grouping the included jobs. The format stays simple — Mike's instruction: "a clean total to pay, with a simple breakdown of included jobs":

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

No optional extras under each line. No clutter. The payable summary is a payment instruction. Building this is later (Phase G.3 / Contractor Payables); it is **not** part of Phase G.1 or Phase G.2.

---

## H. Recommended first build phase

### Phase G — Job financials and contractor cost foundation

(Previously named "Consolidate contractor cost source of truth". Renamed to reflect a broader practical scope.)

#### What Phase G focuses on

- Job page becomes the **financial summary surface** — every figure listed in Section C is visible in one place.
- **Contractor rate auto-populates** on assignment by snapshotting `contractors.hourly_rate` onto `job_workers.pay_rate`.
- **Consistent contractor labour cost calculation** everywhere via the canonical formula `job_workers.pay_rate × COALESCE(approved_hours, actual_hours)`.
- **Approved hours as the payable basis** — `approved_hours × pay_rate` is the final pay figure.
- **Variance display** in hours and dollars on the job page and on the contractor pay-run detail.
- **Finance dashboard alignment** — `/portal/finance` reads the same labour-cost source as the job page. `jobs.contractor_price` becomes derived (or quietly deprecated).
- **Cleanup / reconciliation planning** — the data alignment is delivered; the dedicated UI for the flag list can land in Phase G's tail or a small follow-up.

#### What Phase G explicitly does **not** do

- **No expenses build yet.** Expense model is Phase I.
- **No GST report build yet.** GST reporting is Phase K.
- **No Xero / MYOB integration yet.** Optional, much later.
- **No strict accounting period locking yet.** Period close is Phase L.
- **No payment-record table.** That is Phase H.
- **No employee pay-run audit retrofit.** That is Phase M.
- **No employee payslip PDF.** That is Phase M.

Phase G is deliberately narrow on building, broad on data alignment. Once Phase G ships, every later phase has trustworthy labour-cost data underneath.

---

## I. Future expansion

The plan must remain expandable. Later phases will add:

- **Expenses** — `expenses` and `expense_categories` tables, CRUD UI under `/portal/expenses`, per-job attachment optional.
- **Expense categories** — admin-managed taxonomy with GST treatment and accountant code.
- **Receipt uploads** — Supabase Storage bucket for receipts attached to expenses.
- **Job expenses** — expenses with `attached_job_id` flow into per-job profit.
- **Business overheads** — expenses with `attached_job_id IS NULL` flow into period overhead.
- **Invoice payments / payment records** — `invoice_payments` table; "paid" becomes derived from `Σ payments >= total`.
- **GST / accountant reports** — invoice register, expense register, GST101 prep, contractor pay summary, employee pay summary.
- **Monthly / quarterly / FY exports** — CSV exports from `/portal/reports`.
- **Accounting period close** — `accounting_periods` table + close action + admin override pattern.
- **Payroll polish** — employee pay-run audit, ACC storage, payslip PDFs, contractor payslip surface.
- **Xero / MYOB CSV exports** — Xero-shaped CSV formats.
- **Direct Xero / MYOB integration** — much later; if pursued, behind an integration adapter.
- **More advanced permissions** — finer-grained roles than admin / staff if needed.
- **Invoice revisions / credit notes** — formal credit-note flow if needed (today: edit + re-send).

All of these are **later phases**. None of them are in Phase G.

---

## J. What not to overcomplicate

Explicit guard-rails for every phase, but especially Phase G:

- **Do not make admin jump through too many steps.** Approving hours is one click; bundling into a pay run is one form.
- **Do not force a corporate payroll process too early.** Sano is a small team — withholding-tax workflows, IRD filing, KiwiSaver employer contribution calcs already exist for employees but stay invisible to the contractor flow.
- **Do not require contractor invoices to be manually typed as the main payment workflow.** The new canonical path is hours-approval → pay run.
- **Do not lock job edits too early.** Pre-invoice is freely editable. Audit kicks in post-invoice.
- **Do not make every small operational change feel like formal accounting.** Notes, scope tweaks, hours fixes are routine.
- **Do not build Xero inside Sano.** Feed Xero cleanly; let Xero do the rest.
- **Do not add complexity before the quote → job → invoice → pay flow is easy.** Phase G's measure of success is operational smoothness, not feature count.

---

## K. Recommended Phase G acceptance criteria

Phase G is successful when:

1. A tech-savvy admin can **understand job financials from the job page alone** — every figure listed in Section C is visible or one click away.
2. **Contractor pay auto-calculates** from `job_workers.pay_rate × approved_hours` (or actual / allowed fallback when approved is blank).
3. **Allowed vs actual vs approved hours** are clear and labelled on every relevant surface.
4. **Labour variance is visible in hours and dollars** on the job page and on contractor pay-run detail.
5. **Finance dashboard and job page use the same labour-cost logic.** No more `jobs.contractor_price` reads on the finance dashboard.
6. **Jobs needing cleanup are easier to identify** — at minimum, the data alignment is in place so a future cleanup view can be added without further plumbing.
7. **The contractor-invoices area is not broken.** The page remains fully functional with all action buttons active; existing data is queryable and editable. Phase G.1 changes nothing here; Phase G.2 may only add soft transition guidance.
8. **Existing quote / job / invoice flow still works** end to end without regression.
9. **Nothing customer-facing changes** — share pages, PDFs, emails, Stripe checkout, accept flow all unchanged.
10. **No PDF / share / Stripe flow is affected.**

Bonus criteria (nice to have, not required to ship):

- Reconciliation flag list visible somewhere in the portal (even if it's just a list under the finance dashboard).
- Optional soft transition-guidance banner on `/portal/contractor-invoices` explaining the future Contractor Payables direction. **Not** a "legacy" or "read-only" banner. No actions disabled.
- Variance threshold (e.g. 25%) admin-configurable via settings.

---

## L. Phase G work breakdown (preview)

This is a preview only — the formal execution plan should live in a separate Phase G implementation spec when the work is queued.

1. **Snapshot pay_rate at assignment** — modify `assignJob` action to copy `contractors.hourly_rate` to `job_workers.pay_rate` on insert/upsert. Existing behaviour at approval time stays as a safety net for rows missing the rate.
2. **Canonical labour-cost helper** — extend `src/lib/labour-calc.ts` or add `src/lib/job-cost.ts` with `getJobLabourCost(jobId)` reading `job_workers` only. No reads of `contractors.hourly_rate` for historical data.
3. **Finance dashboard refactor** — replace `jobs.contractor_price` read in `/portal/finance/page.tsx` with the new helper.
4. **Variance display on contractor pay-run detail** — `/portal/payroll/contractor-runs/[id]/page.tsx` gets allowed / actual / approved / variance columns.
5. **Contractor Payables transition guidance (optional, Phase G.2 only)** — `/portal/contractor-invoices` may get a soft informational banner explaining the future Contractor Payables direction. **No "legacy" or "read-only" framing.** All action buttons remain enabled. No data hidden or migrated. Phase G.1 leaves the area completely untouched. The full evolution into Contractor Payables / Contractor Pay Runs (grouping by contractor + period, matching contractor-supplied invoices vs generating Sano internal payables) lands in a later Contractor Payables phase.
6. **Job page financial summary expansion** — add the full row of per-worker figures listed in Section C.
7. **Reconciliation flag query helpers** — pure functions in `src/lib/job-reconciliation.ts` that return the flags listed in Section F. UI surface can land in this phase or follow up.
8. **Tests** — unit tests around the canonical formula and the reconciliation flag helpers. No e2e flow change.
9. **Audit additions** — any new override or pay-rate edit writes an audit row.

No database migrations are required for Phase G's core (all columns already exist). A small follow-up may add a `pay_rate_overridden_at` or similar audit field if needed — to be decided in the Phase G implementation spec.

---

## M. Risks and out-of-scope for Phase G

- **Out of scope:** customer-facing surfaces, PDFs, Stripe webhook, email sending, share-page accept / pay logic, auth, contractor login, public website, quote → job conversion gates, GST display in document templates, employee payroll math.
- **Out of scope:** expenses, payment records, GST reports, accounting periods, Xero integration.
- **In scope:** the job detail page Labour & Margin section, the finance dashboard data source, the contractor pay-run detail view (variance columns), the optional Contractor Payables soft transition-guidance banner (Phase G.2 only), the `assignJob` action, the labour-cost helper, optional reconciliation flag helpers.
- **Risk:** the contractor-invoices flow has in-flight rows and is an **actively used surface** for paying contractors who don't invoice Sano. Phase G must not disable or visually deprecate any action there. If a transition banner is added in G.2, it must be soft and accurate — no "legacy" or "read-only" framing. The full Contractor Payables evolution lands in a later phase.
- **Risk:** `jobs.contractor_price` may be read by surfaces we haven't catalogued. Phase G implementation must grep `contractor_price` across `src/` and confirm all readers are switched or accept derived values.

---

## N. Companion documents

- [`2026-05-26-finance-accounting-review.md`](2026-05-26-finance-accounting-review.md) — current-state map, three-source-of-truth audit, full phased roadmap, risk register.
- Future: a dedicated Phase G implementation spec when the work is queued (path TBD, likely `docs/superpowers/specs/YYYY-MM-DD-phase-g-job-financials-foundation.md`).
- Future: Phase H spec — payment records + audit hardening.
- Future: Phase I spec — expenses foundation.
