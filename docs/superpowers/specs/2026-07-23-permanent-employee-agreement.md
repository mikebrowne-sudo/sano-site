# Spec — Permanent employee agreement (portal feature)

**Date:** 2026-07-23
**Status:** Draft — awaiting the 3 employment terms below before build.
**Author:** Mike + Claude

## Intent

Carol needs a **written permanent part-time** employment agreement, generated
**through the existing `/portal/agreements` feature** and reusable for any
future permanent staff. The feature already handles casual + contractor;
this adds the permanent-employee path.

## What exists

`employment_agreements` + a public sign flow (`/agreement/[token]`): an admin
creates a skeleton (type, person, position, rate, start date, link to the
workforce record) → sends a link → the employee completes personal details
(IRD number, bank, tax code, KiwiSaver, DOB, emergency contact, address) and
signs. Legal terms are boilerplate templates keyed by `agreement_type`
(`casual_employee`, `contractor`). No check constraint on `agreement_type`.

## Gap

- No `permanent_employee` type. Casual terms are wrong for Carol (casual = no
  guaranteed hours, 8% pay-as-you-go holiday). Permanent needs **guaranteed
  hours**, **accrued leave** (4 weeks annual + 10 days sick), and a **notice
  period**.
- The create form doesn't capture the permanent-specific terms.

## Build

### 1. New type + captured terms
- Add `permanent_employee` as an `agreement_type` (+ a check constraint listing
  all three valid types).
- Capture (create form, permanent path), with Carol's known values pre-filled
  from her `contractors` row: agreed **hours/week** (20) + **days** (4 × 5 hrs),
  **place of work**, **pay frequency** (weekly), **notice period**, **trial
  period** (yes/no + length), leave basis (accrued — fixed for permanent).
  Add the needed columns to `employment_agreements`.

### 2. Permanent agreement template
A permanent-employee template (print page + public sign page) covering the
**Employment NZ minimum required terms** — reviewed before first use:
- [ ] Employer + employee names
- [ ] Position / description of work
- [ ] Place of work
- [ ] Hours of work (agreed hours + days)
- [ ] Wages (rate, how + when paid — weekly)
- [ ] **Services for resolving employment problems** + the **90-day** personal-
      grievance window (mandatory clause)
- [ ] **Employee protection provision** (restructuring/sale — mandatory)
- [ ] Leave: annual **4 weeks**, sick **10 days** (after 6 months), public
      holidays, bereavement, family violence
- [ ] Notice period (both parties)
- [ ] Trial/probation (if chosen — 90-day trial valid only in writing before
      start; Sano <20 staff so eligible)
- [ ] KiwiSaver, deductions consent, health & safety, confidentiality,
      variation clause

### 3. Reuse
Same create → link → complete → sign flow as casual/contractor. Signing
updates Carol's linked `contractors` record (no duplicate).

## ⚠️ Legal review (non-negotiable)
The template wording is drafted from the Employment NZ minimum clauses but MUST
be checked against Employment NZ's agreement builder (employment.govt.nz) or a
qualified adviser before Carol — or anyone — signs. No invented legal wording
is presented as authoritative.

## Open decisions (need Mike) — the 3 terms to build a correct agreement
1. **Place of work** — home-based? client sites? an office/base address?
2. **Notice period** — e.g. 2 weeks / 4 weeks either side.
3. **Trial period** — include a 90-day trial, or none? (For a trusted long-term
   hire like Carol, usually none.)
