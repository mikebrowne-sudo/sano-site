# Spec — Online contractor onboarding (tick all 7 documents)

> Status: **spec / planning.** No build proposed here until Mike picks phases.
> Date: 2026-07-04
> Context: Mike's manual onboarding used 7 documents. The online agreement flow
> now covers several; this maps the gaps and proposes how to close them.

## 1. Goal

Make the online contractor onboarding cover everything the old manual process
did, so a signed-up contractor is fully onboarded without paper. Keep the
contracting relationship defensible and the tax treatment correct.

## 2. The 7 manual documents → current online coverage

| # | Manual document | Online today | Gap |
|---|---|---|---|
| 1 | Independent Contractor Agreement | ✅ Signed online (revised per NZ legal review, PR #357) | — |
| 2 | Contractor Details & Bank Form | ✅ Captured on the sign form (name, contact, address, DOB, IRD, bank, emergency) | — |
| 3 | IR330C | ⚠️ Conditional (see §3) — not collected online | Collect only for sole traders |
| 4 | Insurance & Identity Checklist | 🟡 Insurer/cover/expiry + `id_sighted` flag captured | No file uploads (cert, photo ID) |
| 5 | Health & Safety Induction | 🟡 Embedded as signed agreement clauses (mutual duties, stop-work, hazard info) | No explicit induction step / acknowledgement |
| 6 | Policies & Security Acknowledgement | 🟡 Embedded as signed agreement clauses (security, client property, keys, no photos) | No separate acknowledgement |
| 7 | Equipment, Chemicals & Competency | 🟡 Equipment/chemicals embedded as clauses; competency is a real staff verification (docs/compliance/proof-of-competency.html) | Competency not confirmed online |

Existing staff-side tracking: `src/lib/onboarding-checklist.ts` +
`portal/contractors/[id]` OnboardingPanel (confirm details / bank / ID verified /
insurance uploaded / contract signed / training). Manual compliance framework
docs live in `docs/compliance/` (pre-qualification, proof-of-competency).

## 3. IR330C / trading structure decision

Contractor **status** (accountant's factors — work for others, decline work, own
company, written agreement) is separate from **schedular-payment withholding**:

- Schedular payments (and IR330C) apply to payments to **individuals / sole
  traders** in listed activities (cleaning is listed).
- They generally **do NOT apply to payments to a limited liability company.**

So: contractor invoices via **their own LLC → no IR330C**; **sole trader → IR330C
(or 45% no-notification rate)**. The agreement clause 5.3 is already conditional,
so no clause change. Onboarding should **capture the trading structure + evidence**
(NZBN / company number / GST), and require IR330C only for sole traders. Confirm
each contractor's structure with the accountant.

## 4. Proposed build (phased)

### Phase A — Document uploads (closes #4, supports #3/#7)
- Supabase Storage bucket `onboarding-docs` (private; service-role writes on the
  token sign flow, admin reads). RLS/bucket policy staff-read only.
- Sign form: file inputs for **public liability insurance certificate**, **photo
  ID / right-to-work**, and (contractor) **company/GST evidence**. Store paths on
  the agreement + workforce record; surface download links in the portal.
- Replace the bare `id_sighted` boolean with an actual uploaded ID + a staff
  "verified" tick.

### Phase B — Trading structure + conditional IR330C (closes #3)
- Sign form: "How do you invoice?" → **Limited company** (capture company name +
  NZBN/company number + GST) OR **Sole trader** (then show IR330C fields: IRD
  number, tax rate, or upload the IR330C).
- Store on contractor record; the pay flow already handles GST. Staff checklist
  item reflects "IR330C on file / not required (company)".

### Phase C — Induction + policies + competency sign-off (closes #5/#6/#7)
- Sign flow (self-attested): explicit tick-boxes — "I have read the Health &
  Safety induction" and "I acknowledge the contractor policies & security
  requirements" — even though the agreement covers them (cleaner for audits).
  Optionally show a short induction/policies summary above the ticks.
- Staff checklist (verified, not self-attested): add **Competency confirmed**
  (someone at Sano assessed they can clean to standard) and **H&S induction
  completed**. Competency stays staff-verified because it's assessed.

### Data model (additive migrations, Mike-run)
- `employment_agreements` / `contractors`: `trading_structure` (company|sole),
  `company_number`, `nzbn`, `insurance_doc_path`, `id_doc_path`,
  `company_doc_path`, `ir330c_on_file` / `ir330c_rate`,
  `hs_induction_ack`, `policies_ack`.
- `onboarding-checklist.ts`: add competency + H&S-induction items (contractor).

## 5. Out of scope / confirmations needed
- **Lawyer sign-off** of the agreement before real use (already flagged in-doc).
- **Accountant** to confirm Marina's structure (LLC vs sole trader) → IR330C or not.
- File uploads mean handling ID/insurance/company docs — keep them in private
  storage, not emailed around (the legal review's privacy point).

## 6. Recommendation
Phase A + B give the biggest compliance gain (real evidence on file + correct
tax). Phase C is lighter (mostly acknowledgements + two checklist items). Suggest
A + B first, C alongside or shortly after.
