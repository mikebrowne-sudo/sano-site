# Spec — Contractor portal: job history, monthly records & staff-controlled remittance paid state

**Date:** 2026-07-07
**Driver:** Kritika/Anishal remittance cleanup surfaced that contractors can't see their completed-job history or a clear paid/unpaid state; and remittances are marked paid instantly at creation with no "pay it later" step.
**Status:** Draft — approved decisions captured, ready to build.

## Approved decisions (from Mike, 2026-07-07)

1. **Paid status = staff-controlled.** A remittance can exist as **unpaid**; staff flip it to **Paid** once the money leaves the bank. RA-0006 shows *pending* to Kritika until Mike pays it. (Changes today's behaviour where building a batch marks payables paid instantly.)
2. **Completed-jobs view = per-job record.** Month-by-month list of every completed job, each tagged Paid / Pending / Awaiting approval and linked to the remittance that paid it. Read-only record.
3. **Mark done = any outstanding job.** Today, upcoming, AND past-dated jobs never marked complete become markable (today overdue jobs are hidden and can never be completed).
4. Build **generically for all contractors** (Kritika/Anishal are just first users).

## What already exists (do NOT rebuild)

- **Pay tab** (`/contractor/payroll`, `ContractorPayView`): pending (approved-unpaid) + paid history grouped by remittance batch, each linking to the advice PDF. Sourced from the canonical `contractor_invoices` + `contractor_remittances` model.
- **Mark complete**: `ContractorJobActions` → `contractorCompleteJob`. Contractors already complete their own jobs.
- **Pay status resolver**: `contractor-pay-status.ts` (`scheduled → awaiting_approval → approved_pending → paid`) with labels/chips.
- Nav: Jobs / Pay / Onboarding / Profile (bottom nav + topbar).

## Gaps to close

- **No completed-job history** — `ContractorJobsView` shows only Today + Upcoming; past/completed vanish.
- **Overdue jobs unmarkable** — `bucketFor` sends past-dated → `hidden`, so they can never be completed.
- **No unpaid remittance state** — batch creation marks payables paid immediately; no "mark paid later".

## Design

### Navigation (keeps bottom nav at 4 — not "all on one screen")
- **Jobs** → segmented **To do | Completed**
  - *To do*: Today, Upcoming, **and Outstanding** (past-dated, not yet complete) — all markable.
  - *Completed*: month-by-month history, each job with a pay-status chip + link to its remittance.
- **Pay** stays the money view: pending total, and remittances (paid *and* the new unpaid ones shown as "Pending payment"), each linking to the advice.
- **Onboarding / Profile** unchanged.

### Remittance paid state (staff-controlled)
- Migration: add `contractor_remittances.paid_at timestamptz` (null = unpaid). Backfill existing remittances whose payables are all paid → `paid_at = payment_date` (RA-0001…RA-0005 = paid; RA-0006 will be unpaid).
- **Batch creation** (`_actions-remittance-batch.ts`): create the remittance + snapshot lines but leave payables `approved` (do NOT set `date_paid`/`status='paid'`), `paid_at = null`.
- **New staff actions** (`_actions-remittance-paid.ts`):
  - `markRemittancePaid(id, date)` → set each linked payable `status='paid'`, `date_paid=date`; set `paid_at`. Audit.
  - `markRemittanceUnpaid(id)` → revert payables to `approved`, `date_paid=null`; clear `paid_at`. Audit. (Reuses the void-batch revert logic minus the delete.)
- **Staff UI**: "Mark paid" / "Mark unpaid" control on the remittance detail + a Paid/Pending badge in the remittances list.
- **Contractor Pay view**: treat a payable as *paid* only when its remittance `paid_at` is set (or legacy paid). Unpaid remittances surface under a "Pending payment" group, still linking to the advice.

### Completed-job history (contractor)
- New data loader: contractor's completed/invoiced jobs (via `job_workers` + `jobs`), joined to their `contractor_invoice` + remittance, grouped by completion month (NZ tz). Reuse `getContractorPayStatus`.
- New presentational view `ContractorJobHistoryView` (pure, shared with staff "preview as contractor").

### Overdue-markable
- `bucketFor`: past-dated + not completed → new `outstanding` bucket (visible, markable) instead of `hidden`. Job detail already allows completion; just stop hiding them.

## Phases

- **Phase 1 — remittance paid state (backend + staff UI).** Migration + create-unpaid + mark paid/unpaid actions + staff control + contractor Pay view respects `paid_at`. *Ship before RA-0006 is built so RA-0006 starts unpaid.*
- **Phase 2 — contractor completed-job history + overdue-markable.** History loader + view + Jobs segmented control + bucket change.

## Sequencing with the live cleanup

1. Run the data SQL (create CI-0041/CI-0042, approved). *(done by Mike)*
2. Ship Phase 1.
3. Build **RA-0006** (now creates unpaid) → Kritika sees it "Pending payment".
4. Mike pays via bank → **Mark paid** → shows Paid.
5. Ship Phase 2.

## Out of scope
- No amounts/margins ever exposed beyond the contractor's own pay (existing rule).
- No change to how pay is *approved* (still staff-side).
- Legacy `pay_run` flow untouched (historical only).

## Verification
- Gauntlet at baseline (3 failing suites).
- Unit tests: paid/unpaid resolver, history grouping, bucket change.
- Manual: preview-as-contractor for Kritika — Completed history by month with correct chips; RA-0006 pending→paid flips correctly; overdue job completable.
