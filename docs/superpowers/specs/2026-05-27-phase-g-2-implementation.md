# Phase G.2 — ready-to-invoice checks and finance cleanup visibility

> Spec type: implementation plan (Phase G.2)
> Status: planning (no implementation yet)
> Created: 2026-05-27
> Builds on: [`2026-05-26-phase-g-implementation.md`](2026-05-26-phase-g-implementation.md) (Phase G.1 — merged as PR #186 / `b1bedd7`)
> Companion review: [`2026-05-26-finance-accounting-review.md`](2026-05-26-finance-accounting-review.md)
> Companion plan: [`2026-05-26-job-financials-foundation-plan.md`](2026-05-26-job-financials-foundation-plan.md)
> Scope: visibility layer on top of the Phase G.1 job-cost foundation. No customer-facing change. No PDF / share-page / Stripe / email change. No migrations. No new tables.

---

## 1. Executive summary

Phase G.1 made labour cost calculate consistently across the portal and snapshotted contractor rates onto `job_workers` at assignment time. Phase G.2 adds a **visibility layer** on top: a per-job "Ready to invoice" panel that surfaces cleanup issues before an invoice is created, a small "Jobs needing attention" widget on `/portal/finance` that lets Mike scan his whole queue, and read-only variance columns on the contractor pay-run detail so payable variances are visible where the payment happens. Plus an optional soft transition note on `/portal/contractor-invoices` describing the Contractor Payables direction — no legacy framing, no disabled actions.

Phase G.2 does **not** automate contractor payables. That work — grouping approved hours by contractor/period, matching contractor-supplied invoices, generating Sano internal payables — is a later phase ("Contractor Payables") with its own spec.

The bet is: once admin can see which jobs need fixing in two glances (job page + finance dashboard), most of the value of an automated reconciliation system is already delivered. Phase G.2 is a thin pass; the heavy lifting can be paced separately.

---

## 2. Current-state technical map (post-Phase G.1)

### Live as of merge `b1bedd7`

- `src/lib/job-cost.ts` — canonical helpers (`getWorkerLabourCost`, `getJobLabourCost`, `getWorkerVariance`, `getWorkerRateSource`, `getWorkerPayableHours`, `getWorkerEstimatedHours`, `getWorkerRate`). All accept an optional `contractor_hourly_rate` fallback for historical rows.
- `src/lib/labour-calc.ts` — `WorkerInput.pay_rate` preferred over `hourly_rate`; backward compatible.
- `src/app/portal/jobs/[id]/_actions.ts` — `assignJob` snapshots `pay_rate` at assignment, hard-blocks when contractor has no hourly rate, audited (via existing path).
- `src/app/portal/jobs/[id]/page.tsx` — Labour & Margin per-worker breakdown shows Allowed / Actual / Approved / Rate (with `est.` and `missing` badges) / Approved pay (bold) / Variance / Status pill.
- `src/app/portal/finance/page.tsx` — Contractor cost reads from `job_workers` via `getJobLabourCost`, with `contractors.hourly_rate` fallback for historical rows.
- Tests: 49 Phase G.1 tests (job-cost 33, labour-calc 6, assign-job 5, finance-cost-consistency 6).

### What still does NOT exist

- No reconciliation flag helpers (`src/lib/job-reconciliation.ts` does not exist).
- No per-job Ready-to-invoice surface.
- No portal-wide "jobs needing attention" view.
- No variance columns on the contractor pay-run detail (the data is on `job_workers`; the surface just hasn't been built).
- No transition guidance on `/portal/contractor-invoices`.

### Quote → job → invoice → pay flow today (the surfaces Phase G.2 touches)

1. Job detail (`/portal/jobs/[id]`) — shows Labour & Margin; admin sees per-worker rate/hours/pay status; the "Next Step" panel (`JobNextStepCard`) lets admin create an invoice when status is `completed` (gated by `job_settings.require_review_before_invoicing` etc.).
2. Finance dashboard (`/portal/finance`) — period selector + summary cards + monthly breakdown + invoice register + contractor cost register.
3. Contractor pay-run detail (`/portal/payroll/contractor-runs/[id]`) — lists per-item Pay rate × Approved hours = Amount, grouped by contractor.
4. Contractor invoices list (`/portal/contractor-invoices`) — active surface (NOT legacy).

Phase G.2 enhances 1, 2, 3, and optionally 4. No flow change; only display + helpers.

---

## 3. Proposed Phase G.2 scope

Five deliverables, each small and shippable on its own. Order intentional — cleanup helpers first, then UI on top.

### 3.1 Reconciliation flag helpers — `src/lib/job-reconciliation.ts`

A new pure-functions module. Each helper is a small predicate over a job + its workers + linked invoice/pay-run state, returning `{ flag, severity, suggestedAction } | null`.

**Helpers (one per flag):**

| Helper | Severity | When it fires |
|---|---|---|
| `flagNoClient(job)` | hard | `jobs.client_id IS NULL` |
| `flagNoScope(job)` | hard | `jobs.description IS NULL AND jobs.scope_snapshot IS NULL` |
| `flagNoJobPrice(job)` | hard | `jobs.job_price IS NULL OR <= 0` |
| `flagContractorMissingRate(workers)` | hard | any worker has `pay_rate IS NULL AND contractor_hourly_rate IS NULL` |
| `flagActualHoursMissing(workers)` | soft | job is `completed`/`invoiced` and any worker has `actual_hours IS NULL` |
| `flagApprovedHoursMissing(workers)` | soft | job is `completed`/`invoiced` and any worker has `approved_hours IS NULL` |
| `flagHoursOverAllowed(workers, jobAllowedHours, pct=0.2)` | soft | any worker's payable hours > allowed × (1 + pct) |
| `flagCompletedNotInvoiced(job, daysThreshold=7)` | soft | `status='completed' AND invoice_id IS NULL AND completed_at older than N days` |
| `flagInvoiceTotalDiffersFromPrice(job, invoice)` | soft | invoice total ≠ `job.job_price` (excluding known add-ons; rounding tolerance ±1¢) |
| `flagLowMargin(job, workers, threshold=0.1)` | soft | `(job_price − labour) / job_price < threshold OR < 0` |
| `flagPayNotApproved(workers)` | soft | job is `completed`/`invoiced` and any worker has `pay_status='pending'` |
| `flagApprovedNotInPayRun(workers, daysThreshold=14)` | soft | any worker has `pay_status='approved'` and `approved_at` older than N days |
| `flagContractorInvoiceAndPayRunBoth(job, contractorInvoiceRows, payRunItemRows)` | soft | both ledgers have a row for the same `(job_id, contractor_id)` — **convergence flag, not error** |

**Aggregator:**

```ts
export interface JobReconciliationIssue {
  flag: string                                  // e.g. 'no-job-price'
  severity: 'hard' | 'soft'
  message: string                               // user-facing one-line
  suggestedAction?: string                      // e.g. 'Set job price'
  href?: string                                 // optional deep link to fix
}

export function reconcileJob(input: {
  job: ...
  workers: JobWorkerCostInput[]
  invoice?: ...
  contractorInvoices?: ...
  payRunItems?: ...
}): JobReconciliationIssue[]
```

`reconcileJob` runs every helper and returns the non-null results. Order: hard flags first, then soft, then convergence.

### 3.2 Ready-to-invoice panel — `<JobReadyToInvoice>` on `/portal/jobs/[id]`

A compact panel rendered inside the job detail page near the Labour & Margin section. **Informational only** — does not gate `createInvoiceFromJob`. Existing Phase D `job_settings` gates remain authoritative.

Renders the output of `reconcileJob` for the current job as a checklist with three states per line:

- ✓ green — clean
- ⚠ amber — soft warning
- ✗ red — hard block

When there are no issues, the panel collapses to a single line: *"✓ Ready to invoice."* When there are issues, each is one row with the message, a small inline suggested action (e.g. "Set job price") and an optional deep link.

**No admin override modal in Phase G.2.** If a hard-block issue applies, admin fixes it (or proceeds anyway via the existing Convert-to-Invoice flow which has its own gates). The panel is signal, not gate. This is a deliberate "keep operations easy" decision.

### 3.3 Jobs needing attention widget — section on `/portal/finance`

A new section added to the existing `/portal/finance` page (NOT a separate `/portal/reconcile` route). Reads jobs in the selected period and runs `reconcileJob` against each.

Simple table:

| Job | Client | Issue | Suggested action | Link |
|---|---|---|---|---|

Rules:
- Show at most one row per job (the highest-severity issue, ties broken by helper order in `reconcileJob`).
- Cap at top 25 issues by severity; if more exist, append a small "Showing 25 of N — narrow the period to see more" footer.
- Skip jobs that are clean (no issues).
- Order: hard issues first, then soft.
- Link column: `<Link href="/portal/jobs/{id}">→</Link>`.

The widget sits between the "Overdue invoices" section and "Invoices" section on `/portal/finance`, so it's visible above the per-invoice table.

### 3.4 Pay-run variance columns on `/portal/payroll/contractor-runs/[id]`

Add three read-only columns to the existing per-item rows: **Allowed**, **Actual**, **Variance (hours)**.

The Amount column already shows `pay_rate × approved_hours`. The new columns surface the same source-of-truth data that the job page already shows, so the contractor pay-run detail is no longer a context-free dollar list.

Allowed hours source per Phase G.1 helper rules: prefer `job_workers.hours_allocated`; fall back to `jobs.allowed_hours / worker_count` (per pay-run-item join). Document the fallback inline.

Variance hours = `approved_hours − allowed_hours`. Coloured red when over, emerald when under, sage dash when allowed is null.

### 3.5 Optional soft transition note on `/portal/contractor-invoices`

A compact informational banner above the list view (and an identical small note above the create form on the detail page). Soft copy:

> "This area tracks contractor payable records. Some are based on contractor-supplied invoices, and some may be generated internally from approved job hours. Future updates will connect this area more directly to job approvals and contractor pay runs."

Rules:
- **No "legacy" word. No "read-only" wording. No "deprecated".**
- All action buttons remain enabled.
- No route renamed.
- Data untouched.
- Banner is dismissible per session via a small `×` button (no persistence — Phase G.2 doesn't introduce settings or local storage). Optional implementation detail; can be omitted if it adds risk.

If the team prefers, the banner can be deferred to a tiny G.2.1 follow-up. It is the lowest-priority item in this phase and **must not block ship** if anything else is at risk.

---

## 4. Out of scope

Explicitly NOT included in Phase G.2:

- Full Contractor Payables automation (Workflow A matching + Workflow B generation, grouping by contractor + pay period). That lives in a later separately scoped phase.
- New tables for Contractor Payables, payments, expenses, or accounting periods.
- Route rename from `/portal/contractor-invoices` → `/portal/contractor-payables` (or similar). Phase G.2 keeps the route.
- Admin override modal on Ready-to-invoice hard blocks. Existing Phase D conversion gates handle blocking.
- A separate `/portal/reconcile` page. Issues widget lives on `/portal/finance`.
- Settings-driven variance threshold. Hardcoded 20% with `// TODO: settings (Phase L+)` comment.
- Expenses, expense categories, expense uploads.
- GST reports, GST101 prep, accountant exports.
- `invoice_payments` table.
- Stripe webhook changes.
- Accounting period locks.
- Xero / MYOB integration.
- Employee payroll changes (PAYE, KiwiSaver, ACC, payslip PDFs).
- Public website / customer-facing pages.
- PDFs / share pages / Stripe / email sending.
- Contractor login / contractor portal pages.
- `jobs.contractor_price` column removal. (Still left in place; not the canonical cost source.)

---

## 5. Proposed file-touch list

Files Phase G.2 changes. Anything not on this list stays untouched.

### 5.1 Shared helpers

- `src/lib/job-reconciliation.ts` — **new**. All flag helpers + `reconcileJob` aggregator + types.

### 5.2 Job detail UI

- `src/app/portal/jobs/[id]/page.tsx` — mount `<JobReadyToInvoice>` near the Labour & Margin section. Add the data lookups it needs (existing job + workers data is already loaded; add an invoice/contractor-invoice/pay-run-item query if not already there).
- `src/app/portal/jobs/[id]/_components/JobReadyToInvoice.tsx` — **new**. Pure presentational component taking the issue array; renders the checklist.

### 5.3 Finance dashboard

- `src/app/portal/finance/page.tsx` — query expansion: load the additional rows needed by `reconcileJob` (e.g. invoice totals, pay-run item joins). Add the new "Jobs needing attention" section between Overdue invoices and Invoices.
- `src/app/portal/finance/_components/JobsNeedingAttention.tsx` — **new**. Pure presentational table.

### 5.4 Contractor pay-run detail

- `src/app/portal/payroll/contractor-runs/[id]/page.tsx` — expand the per-item query to also load `job_workers.hours_allocated`, `actual_hours`, `approved_hours`, and the linked `jobs.allowed_hours`. Add Allowed / Actual / Variance columns to the per-item rows. Read-only.

### 5.5 Contractor invoices transition note (optional)

- `src/app/portal/contractor-invoices/page.tsx` — soft banner above the list. Optional in Phase G.2.
- `src/app/portal/contractor-invoices/[id]/page.tsx` — same banner above the detail. Optional.

### 5.6 Tests

- `src/__tests__/lib/job-reconciliation.test.ts` — **new**. One test per flag helper + a small batch of `reconcileJob` scenarios (clean job, hard-only, mixed, convergence).
- `src/__tests__/components/JobReadyToInvoice.test.tsx` — **new** (light). Renders representative issue arrays and asserts the right state badges + suggested actions appear.
- `src/__tests__/lib/finance-attention-data.test.ts` — **new**. Tests the finance-page helper that filters + sorts + caps issues for the widget.

UI rendering tests for `/portal/finance` and `/portal/payroll/contractor-runs/[id]` are out of scope unless a regression risk specifically appears — the data plumbing is small and the snapshot tests for the helpers cover the value math.

### 5.7 Docs

- `docs/PORTAL.md` — short addition under "Current Active Work" once G.2 ships (post-merge, not part of the spec).
- `docs/superpowers/specs/2026-05-27-phase-g-2-implementation.md` — this file.
- `docs/AI/DECISIONS.md` — append: variance threshold 20% hardcoded for G.2; Ready-to-invoice panel is signal-not-gate; Jobs-needing-attention widget lives on `/portal/finance`, not a dedicated route.

---

## 6. UX proposal — Ready-to-invoice panel

### Placement

Inside the job detail page, immediately after the Labour & Margin section, before the Notes section. Compact card chrome consistent with the existing `Section` component.

### Layout

**Clean job:**

```
[Section heading: Ready to invoice]
  ✓ Ready to invoice.
```

**Job with issues:**

```
[Section heading: Ready to invoice]
  ✗ No job price set                       [Set job price →]
  ✗ Contractor has no usable rate           [Set rate on profile →]
  ⚠ Approved hours missing                  [Open Pay approvals]
  ⚠ Actual hours exceed allowed by 32%
  ⚠ Estimated margin 4% (low)
  ✓ Client linked
  ✓ Scope captured
```

### Visual treatment

- Hard ✗ → small red square + red text.
- Soft ⚠ → small amber triangle + amber text.
- Clean ✓ → small emerald check + sage-700 text.
- "Suggested action" → small inline link / button. Where the fix is a route, link directly (e.g. `/portal/jobs/{id}/edit`, contractor profile, the inline Pay Approvals row scroll target).
- Section heading shows a small summary pill: `2 blocks · 3 warnings` when not clean; nothing when clean.
- Mobile / narrow screens: rows stack; suggested action drops below message.

### Behaviour

- Static at render. No live re-check.
- Click "Suggested action" → navigates (or scrolls to in-page anchor).
- The panel does NOT block conversion. The existing `JobNextStepCard` + Phase D gates handle hard-stop behaviour at the action point.

### Edge cases

- Job is in `draft` / `scheduled` / `assigned` status: panel shows but most soft warnings are skipped (no actual hours expected yet, no invoice expected). Hard blocks still apply.
- Job is `invoiced`: panel becomes informational only — most checks have already happened. Still useful for reviewing whether labour cost is approved and in a pay run.

---

## 7. UX proposal — Jobs needing attention widget

### Placement

A new section added to `/portal/finance` page between the existing "Overdue Invoices" section (when present) and the "Invoices" section. Same chrome as the surrounding `Section` cards.

### Layout

**No issues:**

```
[Section heading: Jobs needing attention]
  Nothing to fix in this period. ✓
```

**With issues:**

```
[Section heading: Jobs needing attention (8)]

  Job        Client                  Issue                              Action                Link
  ────────────────────────────────────────────────────────────────────────────────────────────
  J-0142     Barfoot & Thompson      ✗ Contractor has no usable rate    Set rate on profile   →
  J-0138     Vicky Rao               ✗ No job price                     Set job price         →
  J-0131     Mr Mercury              ⚠ Approved hours missing           Open Pay approvals    →
  J-0128     Apex Property           ⚠ Hours over allowed by 31%        Review actuals        →
  J-0125     House Mum Auckland      ⚠ Completed but not invoiced       Convert to invoice    →
  ...
```

### Rules

- Period scope: respects the existing `?period=` selector on `/portal/finance`.
- One row per job — highest-severity issue wins; ties broken by helper order.
- Cap at top 25 rows. If `N > 25`, append a small footer: *"Showing 25 of N issues. Narrow the period to see more."*
- Hard issues sorted before soft.
- Empty-state copy is brief and positive.

### Behaviour

- Static at render. No live re-check.
- The `→` link goes to `/portal/jobs/{id}`. The Ready-to-invoice panel there shows the full list of that job's issues.

### Why not a dedicated `/portal/reconcile` page

Three reasons:
1. The widget is the same data Mike will be looking at when he's reviewing the period anyway.
2. A dedicated route doubles the surface area without doubling the value.
3. Phase G.2 ships smaller.

If a dedicated route is ever wanted, it lives in a later phase as a thin wrapper around the same helpers.

---

## 8. Pay-run variance column proposal — `/portal/payroll/contractor-runs/[id]`

### Current state

Per-item rows show: Job · Approved hours · Pay rate · Amount.

### Proposed columns

After "Approved hours", add: **Allowed**, **Actual**, **Variance**.

```
Job        Allowed   Actual   Approved   Pay rate    Variance      Amount
─────────────────────────────────────────────────────────────────────────
J-0145     4.0h      4.5h     4.5h       $45.00      +0.5h / +$22  $202.50
J-0148     3.0h      2.5h     2.5h       $45.00      -0.5h / -$22  $112.50
J-0151     —         5.0h     5.0h       $45.00      —             $225.00
```

### Rules

- Variance is `approved_hours − allowed_hours`. Both in hours and dollars (×`pay_rate`).
- Allowed hours source: `job_workers.hours_allocated` first; fall back to `jobs.allowed_hours / worker_count` per item if `hours_allocated` is null. Document the fallback inline.
- When allowed is null, render `—` for Allowed and Variance.
- Variance over: red. Variance under: emerald. Variance zero: sage dash.
- Read-only. No editing, no actions in this phase.

### Query expansion

The existing per-item join already joins `job_workers`. The fields needed (`hours_allocated`, `actual_hours`, `approved_hours`) are already on `job_workers` and may or may not already be selected — confirm and add to the select clause if missing. Also add `jobs(allowed_hours)` to the chain if not already there for the worker-count fallback.

### Why this matters

Today Mike sees `4.5h × $45 = $202.50` on a pay-run row but has to leave the page to know whether that's over or under what was quoted. Phase G.2 fixes that without changing the action surface.

---

## 9. Contractor Payables transition note — recommendation

### Decision: include the banner, soft copy only

Place a compact informational banner above the list on `/portal/contractor-invoices` and above the create form on `/portal/contractor-invoices/[id]`.

### Copy (exact)

> "This area tracks contractor payable records. Some are based on contractor-supplied invoices, and some may be generated internally from approved job hours. Future updates will connect this area more directly to job approvals and contractor pay runs."

### Visual treatment

- Sage-50 background, sage-700 border-left, sage-700 text. **Not** amber/warning.
- Small dismiss `×` (session-only — no settings, no localStorage persistence in G.2).
- Sits inside a `<Section>`-style container.

### Hard rules

- Never the word "legacy".
- Never "read-only".
- Never "deprecated".
- All Create / Approve / Mark Paid actions remain fully enabled and visible.
- No route rename.
- No data migration. No row hiding.

### Defer to G.2.1 if risky

If any concern emerges during implementation that adding the banner could mislead users (e.g. wording sounds like the page is going away), defer the banner to a small G.2.1 follow-up. The banner is the lowest-priority item in this phase. Helpers + Ready-to-invoice panel + finance widget are higher priority.

---

## 10. Data model impact

**No database migrations required.** Phase G.2 is a pure read + presentation layer.

| Table / Column | Status |
|---|---|
| `jobs` | Existing columns only |
| `job_workers` | Existing columns only |
| `contractors` | `hourly_rate` already joined where needed |
| `invoices` / `invoice_items` | Existing reads only |
| `contractor_invoices` | Banner only; no data writes |
| `pay_runs` / `pay_run_items` | Existing columns; query expansion only |
| `audit_log` | No new audit verbs in G.2 |

No new tables, no new columns, no schema CHECK changes. If a future phase wants to persist last-seen-attention-snapshot, that's an additive migration in a later phase.

---

## 11. Test plan

### Unit tests

**`src/__tests__/lib/job-reconciliation.test.ts`** — one describe block per helper.

For each flag helper:
- Returns null when the condition isn't met.
- Returns the expected `{ flag, severity, message, suggestedAction? }` when condition is met.
- Edge: numeric thresholds (variance 20%, low margin 10%, completed-not-invoiced N days).
- Edge: `0` is a valid value (not missing).

Plus `reconcileJob` integration tests:
- Clean job → `[]`.
- Hard-only job → one or more hard entries, no soft.
- Mixed job → hard before soft, helper order respected.
- Convergence flag — exists where both ledgers have a row.
- Cap at job lifecycle stages: draft, scheduled, completed, invoiced (different helpers fire).

### Component tests

**`src/__tests__/components/JobReadyToInvoice.test.tsx`** — light.

- Clean: shows single "✓ Ready to invoice." line.
- All-hard: shows red ✗ rows with messages and suggested actions.
- Mixed: shows hard first, then soft, then clean (if all checks pass).
- Suggested action rendering when present vs absent.

### Data + filter / cap tests

**`src/__tests__/lib/finance-attention-data.test.ts`** — pure tests for the helper that turns a job + worker fixture into the widget's row array.

- Empty input → empty array.
- One job, one issue → one row.
- One job, three issues → one row, highest-severity wins.
- 30 jobs with mixed severity → 25 rows max, hard first.
- Tie-breaking: helper order respected.

### Regression tests (must remain green)

- 49 existing Phase G.1 tests + the pre-existing 3-failure baseline (`submit-application`, `services`, `Header`).
- Existing send-email, share-page, PDF tests untouched.

---

## 12. Rollout order

Smallest-blast-radius order. Each step is a separate commit/PR or sequential commits on the same branch.

1. **Add `src/lib/job-reconciliation.ts` helpers + tests.** Pure functions. No callers yet. Self-contained PR-shape.
2. **Mount `<JobReadyToInvoice>` on `/portal/jobs/[id]`.** UI consumes the helpers. Read-only. No conversion-flow change.
3. **Add Jobs needing attention widget to `/portal/finance`.** Reuses same helpers; reuses same period selector.
4. **Add Allowed / Actual / Variance columns to contractor pay-run detail.** Pure UI; query expansion.
5. **Add optional Contractor Payables soft transition note.** Lowest priority; defer to G.2.1 if anything else is at risk.
6. **Run the gauntlet:** `npm test`, `npx tsc --noEmit`, `npx next lint`, Netlify deploy preview.

Each step is shippable on its own — the helpers (step 1) are usable from step 2 onward; steps 2–5 are independent of each other.

---

## 13. Rollback strategy

Phase G.2 is reversible at every step:

- **Step 1** (helpers): pure functions; revert deletes them. No callers existed before, none should remain after revert.
- **Step 2** (Ready-to-invoice panel): UI-only addition. Revert removes the panel; underlying data unchanged.
- **Step 3** (Jobs needing attention widget): same — UI-only addition. The finance page falls back to its previous shape.
- **Step 4** (pay-run variance columns): read-only column additions. Revert removes the columns.
- **Step 5** (transition note banner): banner removal. No data state change.

No migrations to roll back. No new audit verbs. No new tables.

A fully reverted Phase G.2 leaves the codebase exactly as Phase G.1 shipped it. No data loss possible because Phase G.2 writes nothing.

---

## 14. Acceptance criteria

Phase G.2 is complete when **all** of these are true:

1. `src/lib/job-reconciliation.ts` exists with all flag helpers + `reconcileJob` aggregator, tested.
2. `/portal/jobs/[id]` renders a Ready-to-invoice panel showing hard ✗ blocks, soft ⚠ warnings, clean ✓ items, and suggested actions. The panel does not block `createInvoiceFromJob` (existing Phase D gates remain authoritative).
3. `/portal/finance` shows a Jobs needing attention widget with at most 25 rows per period, ordered hard-then-soft, with deep links to each job page.
4. `/portal/payroll/contractor-runs/[id]` shows Allowed / Actual / Variance columns per item row, sourced from `job_workers` and `jobs.allowed_hours` with the documented fallback.
5. **Optional:** `/portal/contractor-invoices` carries a soft sage-styled banner with the exact copy from §9. No "legacy" framing, no disabled actions, no route rename.
6. **No customer-facing change:** quote / invoice / share / PDF / Stripe / email / accept-quote / public website flows behave identically.
7. **Existing tests pass at baseline** (3 failing suites: `submit-application`, `services`, `Header`). All Phase G.1 tests still pass. New Phase G.2 tests pass.
8. `npx tsc --noEmit` clean.
9. `npx next lint` zero **Error:** lines.
10. `npm run build` passes on Netlify deploy preview (Windows local may still hit the documented EISDIR quirk; Netlify Linux is authoritative).

### Bonus / nice-to-have

- Variance threshold (20%) documented as a constant with `// TODO: settings (Phase L+)`.
- The Ready-to-invoice panel "no issues" state shows the single-line collapse rather than an empty card.
- The Jobs needing attention widget shows empty-state copy when no period issues exist.

---

## 15. Open questions before implementation

After Phase G.1 has merged, only a small set of decisions remain. Each has a default; accept the default or raise the question at the corresponding step.

1. **Banner inclusion vs G.2.1?**
   - **Recommendation:** include in G.2 with the exact copy from §9 and a dismissable `×`. Lowest priority. If anything else is at risk during implementation, defer to G.2.1 without holding the rest of G.2.

2. **Empty-state copy on the Ready-to-invoice panel for draft / scheduled jobs?**
   - These jobs haven't been worked yet, so most checks don't apply. **Recommendation:** show the panel anyway, with the clean ✓ items that DO apply (Client linked, Job price, Contractor rate when assigned), and skip the soft warnings that only make sense post-completion (actual hours, approved hours, invoice missing). Each helper internally guards on `job.status` where appropriate.

3. **Convergence flag suggested action?**
   - "Contractor invoice and pay-run data both exist" is a convergence flag, not an error. **Recommendation:** suggested action is `Review payment paths →` linking to the job page where both can be inspected. No automatic merge action in G.2.

4. **Should the Jobs needing attention widget respect `cleanup-mode`?**
   - Sano has an existing cleanup-mode that gates certain admin actions. **Recommendation:** the widget is visible to anyone who can see `/portal/finance` (staff + admin); cleanup-mode only gates per-item destructive actions. The widget is read-only so this is moot in G.2. Revisit if/when actions are added in a later phase.

5. **Variance dollar formatting on pay-run detail?**
   - For consistency with the job page's stacked `+1.5h / +$67.50` cell, **recommendation:** stack the hour and dollar variance in the same cell on the pay-run detail too. Already the pattern.

6. **Date thresholds (completed-not-invoiced 7 days, approved-not-in-pay-run 14 days)?**
   - These can become noisy if they're too aggressive. **Recommendation:** ship the defaults above and tune in a small G.2.1 if Mike's first pass shows the wrong rows surfacing.

None of these block implementation. The defaults give an implementer a clear path; specific questions can be raised against the corresponding step.

---

## 16. Companion documents

- [`2026-05-26-finance-accounting-review.md`](2026-05-26-finance-accounting-review.md) — current-state map and phased roadmap.
- [`2026-05-26-job-financials-foundation-plan.md`](2026-05-26-job-financials-foundation-plan.md) — practical Phase G plan with the Contractor Payables direction.
- [`2026-05-26-phase-g-implementation.md`](2026-05-26-phase-g-implementation.md) — Phase G.1 implementation spec (merged via PR #186).
- Future: Contractor Payables implementation spec — when that phase is scoped, this G.2 spec's transition-note section §9 is the anchor reference.
