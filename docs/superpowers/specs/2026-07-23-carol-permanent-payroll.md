# Spec — Carol permanent-employee payroll

**Date:** 2026-07-23
**Status:** Draft — awaiting scope decision (pay-now vs leave-ledger-first).
**Author:** Mike + Claude

## Context

Carol starts getting paid as Sano's first **permanent part-time employee**
(not a contractor, not an owner). $0 income this financial year; this is her
only job.

Agreed terms:

- **$30.00/hour**, **20 hours/week** = **4 days × 5 hrs** (a "day" = 5 hrs).
- Verified net **$505.50/week** (gross $600, PAYE $94.50, KiwiSaver $0).
- **Tax code M**, no student loan. **KiwiSaver opted out.**
- **Holiday + sick leave accrued and paid** (permanent — NOT 8% pay-as-you-go).
- Reviewed quarterly; increases as the business grows while preserving a
  buffer for tax, GST, and operating capital.

## Actual architecture (verified 2026-07-23)

The **active** employee payroll flow is `/portal/payroll/new`:

- **Employees are `contractors` rows** with `worker_type = 'employee'`
  (existing: Radhika Dhungel — active, casual PAYG; Dipesh Nepal — inactive).
- `createPayRun` (`app/portal/payroll/_actions.ts`) inserts a `pay_runs` row
  for a period and **auto-generates a `pay_run_lines` row for every active
  employee**, computing pay via `calculatePayPreview` (`lib/nz-paye.ts`),
  which delegates income-tax + ACC to the canonical `lib/payroll/paye.ts`.
- `pay_runs` has an **approve → paid lifecycle** (`status`, `approved_at/by`,
  `paid_at/by`) but **no period-unique constraint** (double-pay guard gap).
- `holiday_pay_method` supports **`'accrue_leave'`** already; when set (≠
  `'pay_as_you_go_8_percent'`), `calculatePayPreview` adds **no 8%** and gross
  = hours × rate. **So the engine already produces Carol's $505.50 correctly.**
- **PAYE constants are IRD-confirmed** for 2026/27 (thresholds $15,600/$53,500/
  $78,100/$180,000; rates 10.5/17.5/30/33/39%; ACC levy 1.75%, cap $156,641,
  max $2,741.22). `nz-paye.ts` already applies IRD **truncation** (whole-dollar
  gross, cent-truncated deductions). The 2026-07-20 "unverified" note is stale.

**Dead code — do NOT build on:** `/portal/payroll/employee`, the missing
`employee_pay_runs` table, and `lib/payroll/payslip.ts` (`computePayslip`).
This was the retired second flow; extending it recreates the "two of
everything" fragmentation the July audit is consolidating away.

**Genuinely missing:** any **leave ledger**. No `leave*`/`holiday*` tables
exist. Accrued annual + sick leave for a permanent employee is unbuilt — this
is the real new work, and it is employee-agnostic (also serves future
permanent hires).

## Plan

### Phase 1 — Pay Carol (mostly config, minimal code)

Create Carol as an employee record in `contractors`:
`worker_type='employee'`, `status='active'`, `full_name`, `email`,
`hourly_rate=30`, `base_hourly_rate=30`, `standard_hours=20`,
`pay_frequency='weekly'`, `tax_code='M'`, `holiday_pay_method='accrue_leave'`,
`kiwisaver_enrolled=false`. Then `/new` produces her line at gross $600, PAYE
$94.50, net **$505.50** — no engine change. (Insert prepared for Mike to run;
never a raw `auth.users` touch — this is a `contractors` row only.)

### Phase 2 — Permanent-employee leave ledger (the real build)

- **Calc core:** `lib/payroll/leave.ts` (built) — annual leave in HOURS
  (4 weeks = 80 hrs at 20 hrs/wk, accrued pro-rata per pay), sick leave in
  DAYS (10 after 6 months, +10 per 12-month anniversary, cap 20). Fixed hours
  ⇒ OWP = AWE, so the Holidays Act "greater of" is satisfied trivially.
- **Ledger table** `employee_leave_ledger` — append-only movements
  (`+accrual` per completed pay run, `−taken`) per leave type; balance = sum.
- **Accrual hook:** on pay-run completion, write the period's annual-leave
  accrual for each `accrue_leave` employee.
- **Take leave:** an action to record leave taken (paid at ordinary weekly
  pay); a leave line on the pay run for that period.
- **Display:** current balances on the payslip + employee view.

### Phase 3 — Hardening (broader; schedule with Mike)

- Period-unique / duplicate guard on `pay_runs` (double-pay).
- Public-holiday handling (paid if otherwise-working day; worked = time-and-a-
  half + alternative day) — operator-assisted, not auto, in v1.

## Out of scope (v1)

- IRD gateway/API integration — file manually via myIR (free; correct for a
  handful of employees).
- Variable-hours Holidays Act (Carol is fixed-hours).
- Rebuilding/removing the dead `/employee` flow (separate consolidation task).

## Verification / done

- PAYE constants IRD-confirmed (2026-07-23). Final output comparison vs IRD's
  calculator (truncation, tax code, ACC cap, KiwiSaver, ESCT, student loan)
  before the first live run — mostly covers other employees; Carol's even
  figures are exact.
- Leave ledger unit-tested (accrue, take, balance, 6-/12-month gates) — done
  in `payroll-leave.test.ts`.
- Carol's line verified end-to-end in a draft (non-completed) pay run before
  any real payment.
- Accountant tick on the employment agreement + first pay run before go-live.

## Open decisions (need Mike)

1. **Scope now:** just get Carol paid (Phase 1), or build the leave ledger
   (Phase 2) first so her balances accrue from day one? (Recommend Phase 1 to
   start paying her, Phase 2 immediately after — leave accrues from her start
   date regardless, and can be back-filled.)
2. **Start date** (sets the 6-month sick / 12-month annual milestones).
3. Carol's **email** (for payslip delivery) + full legal name for the record.
