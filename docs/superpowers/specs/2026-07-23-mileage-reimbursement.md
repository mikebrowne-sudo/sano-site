# Spec — Mileage reimbursement (Carol) linked to payroll

**Date:** 2026-07-23
**Status:** Draft — building PR2a (rate foundation) first.
**Author:** Mike + Claude

## Intent

Carol (permanent employee) uses her **petrol** car for work. Reimburse her
per-kilometre at IRD rates as a **non-taxable reimbursement**, linked to her
employee record and paid **through payroll but outside the tax calculation**.

## Hard tax rules (must hold)

- Mileage is a **reimbursement, NOT wages**. On the payslip it is a **separate
  line added to net pay AFTER PAYE**.
- It is **excluded from** taxable gross, **PAYE, ACC, KiwiSaver**, and the
  **IRD Employment Information** (payday filing). It never enters
  `calculatePayPreview`'s gross.
- It is posted to a **motor-vehicle / employee-reimbursement expense account**
  (NOT `wages_payroll`).

## Tier rule (important — do NOT auto-pick the tier)

Tier 1 applies to the **vehicle's first 14,000 km of TOTAL annual travel
(including private km)** — not the first 14,000 *work* km submitted to Sano.
Sano cannot know total vehicle km, so **the tier must be chosen manually by an
authorised user**, with an on-screen **warning** explaining the total-vehicle-km
rule. Never infer the tier from Sano mileage alone.

## Rates — IRD 2025/26, dated config table (not hard-coded)

Store in `mileage_rate_config` (dated). Seed with the **IRD 2025/26** rates,
**labelled** as "IRD 2025/26 rates, used for 2026/27 reimbursements" — NOT as
official 2026/27 rates (IRD had not published 2026/27 at build time).

| Vehicle type   | Tier 1 | Tier 2 |
|----------------|-------:|-------:|
| Petrol         | $1.20  | $0.37  |
| Diesel         | $1.30  | $0.38  |
| Petrol hybrid  | $0.90  | $0.24  |
| Electric       | $1.22  | $0.23  |

Carol's car is **petrol** → default petrol Tier 1 ($1.20), still manually
overridable per the tier rule.

## Capture (per Carol's spec)

Each mileage entry records: **date**, **business purpose**, **route /
destination** (existing stops/Mapbox), **kilometres** (existing distance_km),
**vehicle type**. Plus, for reimbursement: chosen **tier**, **rate applied**,
**reimbursement amount**, and an **audit trail** (km, rate, calculation,
**approver** + timestamp).

## Build (sub-PRs)

### PR2a — Rate foundation (this build)
- Migration: `mileage_rate_config` (dated table) + seed the 8 rates + label.
- `lib/payroll/mileage-rates.ts` — pure `resolveMileageRate(configs, {vehicleType, tier, onDate})`
  (latest effective on/before date) + `computeMileageReimbursement(km, rate)`
  (round to cents). Fully unit-tested with the exact rates above.
- No behaviour change yet; foundation only.

### PR2b — Link mileage to the employee + approval
- Extend `mileage_logs`: `contractor_id` (FK → Carol), `business_purpose`,
  `vehicle_type`, `tier`, `rate_per_km`, `reimbursement_amount`,
  `status` (draft/approved/reimbursed), `approved_by`, `approved_at`,
  `pay_run_id` (set when reimbursed).
- Mileage form: pick employee (default Carol), vehicle type (default petrol),
  business purpose, **manual tier selector with the total-vehicle-km warning**;
  compute + show the reimbursement; an **approve** action (records approver).

### PR2c — Payroll integration
- On a pay run, pull the employee's **approved, un-reimbursed** mileage in the
  period → add a **non-taxable reimbursement line** (added to net, excluded
  from every tax calc + IRD EI) → post the motor-vehicle expense → mark those
  mileage rows `reimbursed` + link `pay_run_id`.
- Payslip: show the reimbursement line separately, "Net + reimbursement = total
  paid".

## Out of scope (v1)
- Auto-tier detection (deliberately manual per the rule above).
- Non-employee (contractor) mileage reimbursement.

## Verification / done
- Rate resolver unit-tested against all 8 seeded rates + date selection.
- Reimbursement never alters gross/PAYE/ACC/KiwiSaver (asserted).
- Expense posts to motor-vehicle, not wages.
- Audit row (km, rate, calc, approver) present before a reimbursement pays.
- Accountant tick on the treatment before first live reimbursement.
