# Sano — Accountant review brief (contractor & employee onboarding)

> Purpose: confirm the tax / payroll treatment baked into Sano's new online
> onboarding is correct before it's used with real people. Please confirm each
> item, or tell us what to change. Nothing here was decided by assumption — these
> are the rules the system currently applies.
>
> Prepared for: Sano's accountant · Contact: Michael Browne — michael@sano.nz — 021 168 5553

---

## 1. Contractor GST — agreed rate is **GST-inclusive**
The contractor agreement (clause 5.1) and the rate display now treat the agreed
hourly rate as **inclusive of GST**:

> *"The agreed rate is inclusive of GST. Where the Contractor is registered for
> GST, the agreed fee is treated as GST-inclusive and the Contractor will provide
> a valid tax invoice showing the GST component."*

Rate shows on the agreement as e.g. **"$35.00 per hour (inclusive of GST)"**.

**Please confirm:** this is the intended treatment (a GST-registered contractor's
GST comes *out of* the agreed rate, not added on top), and the wording is correct.
*(This is a recent change from "exclusive of GST; Principal pays GST on top".)*

## 2. Contractor IR330C / schedular payments
Clause 5.3 keeps IR330C conditional: where payments are schedular payments, the
contractor must provide a completed IR330C (or exemption/special rate certificate)
before payment; without it the Principal may deduct at the no-notification rate.

The staff onboarding record has a **tax-review status** the operator sets:
Review required · Awaiting contractor information · Awaiting IR330C · Ready for
review · Confirmed · Not required · Exception. The system pre-fills the expectation
from the contractor's structure:
- **Sole trader / other** → IR330C generally required.
- **NZ limited company** → IR330C generally not required (staff confirm).
- **Partnership / trust** → manual review.

**Please confirm:** that mapping is right, and that the system correctly leaves the
final call to a person (it never auto-decides tax).

## 3. Employee tax code — **ND default until IR330 verified**
When an employee signs online, the system stores their declared tax code on the
agreement but sets the **operational tax code to `ND` (no-notification)** and
`ir330_received = false` on the payroll record, until staff verify the IR330.

**Please confirm:** deducting at the ND rate until the IR330 is received + verified
is the correct, safe default for a newly-signed employee.

## 4. Employee KiwiSaver
Captured at signing: **enrolment** (enrol / opt out) and, if enrolled, the
**employee contribution rate** (3 / 4 / 6 / 8 / 10%). The **employer rate defaults
to 3%**.

**Please confirm:** the employee rate options and the 3% employer default are
correct, and how you'd like employer contributions treated.

## 5. Payroll-readiness
An employee is created in **onboarding** status on signing and **only enters the
pay run once activated** (after ID/right-to-work/tax/KiwiSaver verification +
competency sign-off). A signed agreement alone does **not** make them payable.

**Please confirm:** that gate matches how you want employees to appear in payroll.

---

### What we need back
A yes/adjust on items 1–5. If any wording or rate should change, tell us and we'll
update the system + agreement. The full signed-agreement PDF can be provided on
request for the exact clause wording.
