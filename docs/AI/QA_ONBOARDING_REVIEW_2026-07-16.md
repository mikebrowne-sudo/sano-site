# Onboarding QA & Visual Review — 2026-07-16

> Scope: end-to-end QA, visual review and polish planning for the shipped
> contractor + employee onboarding system. **No fixes applied** — this is the
> review; fixes await Mike's sign-off (except any security/data-loss defect).
>
> Honest limitation up front: **live screenshots at each breakpoint and sample
> signed PDFs require the running test journey with real data.** The public
> agreement page is token-gated and the staff record is auth-gated, so they can't
> be captured from this environment. This report gives (a) the test-journey setup
> so you can walk it on the deploy preview, (b) a precise **responsive-code**
> assessment per breakpoint (authoritative from the layout classes), and (c) all
> the code/data-level QA. Where a screenshot is the only proof, it's marked
> **[eyeball]** with exactly what to check.

---

## 1. Test journeys

Run this to create two clearly-labelled TEST agreements (tokens auto-generate):

```sql
insert into public.employment_agreements
  (person_label, agreement_type, position, hourly_rate, start_date, agreement_version, is_test)
values
  ('ZZ TEST — Contractor', 'contractor',      'Cleaner (Contractor)', 35.00, current_date, 'contractor-v1', false),
  ('ZZ TEST — Employee',   'casual_employee', 'Cleaner (Casual)',     26.00, current_date, 'casual-v1',     false);

select person_label, 'https://sano.nz/agreement/' || token as review_link
from public.employment_agreements
where person_label like 'ZZ TEST%'
order by person_label;
```

- `is_test = false` so **signing creates onboarding (non-payroll) workforce records** in `contractors` — needed to review the staff side. They are safe: an onboarding worker is never in payroll and never assignable. They're labelled **ZZ TEST** for easy identification.
- Signing emails michael@ + carol@ (+ notify inbox). If you'd rather not email Carol, set `is_test = true` in the insert — but then **no staff record is created** (journey/PDF only).

**Cleanup after QA (destructive — run only when done):**
```sql
delete from public.contractors
 where id in (select contractor_id from public.employment_agreements
              where person_label like 'ZZ TEST%' and contractor_id is not null);
delete from public.employment_agreements where person_label like 'ZZ TEST%';
```
(Deleting the contractor cascades its checklist + training assignments. Or use the staff **Delete** button on each test record, then delete the agreements.)

---

## 2–3. Journey reviews (code-verified; walk them for UX)

Both journeys are **connected end-to-end** in code — no dead ends in the core flow:
secure link → branded agreement doc → details/structure/tax (contractor) or
IRD/IR330/KiwiSaver (employee) → document uploads → e-sign → on sign: workforce
record upserted, checklist seeded, 3 system items (+ employee supplied items)
auto-completed, uploaded docs attached + `*_uploaded` completed, induction
modules auto-assigned, confirmation email + signed PDF sent → staff record shows
checklist, tax/competency panels, activation gate.

**Employee not active before activation:** confirmed — the employee sign branch
sets `status='onboarding'`; payroll (`createPayRun`) only reads `contractors`
with `status='active'`. ✅

---

## Findings (ranked)

| # | Area | Severity | Fix type | Summary |
|---|---|---|---|---|
| F5 | H&S induction | **High** | Workflow/Compliance | The 4 induction module **PDF links are all MISSING**. The online modules are branded *summaries*; the rich H&S visual character lives in the linked finalised PDFs, so until the URLs are added the induction is summary-only. |
| F7 | Create agreement | Medium | Workflow | "Link existing employee" dropdown sources from the now-empty `employees` table → always empty. Should source `contractors(worker_type='employee')`. Signing still links by email, so not broken — just confusing. |
| F6 | Staff nav | Medium | Workflow | `/portal/employees` is now a **legacy empty page** (employees live under `/portal/contractors`). Potential confusion / dead-end. |
| F8 | Staff forms | Medium | Visual | `ContractorForm` (staff add/edit) is `max-w-2xl` — a narrow tablet-width column on desktop, against the responsive standard. |
| F1 | Agreement PDF | Medium | Visual/Compliance | Document **version is not displayed** (the `agreement_version` field exists but isn't rendered on the doc/PDF). |
| F2 | Agreement PDF | Medium | Visual | **No "issued" date** shown — only *Commences* and (once signed) *Signed*. |
| F3 | Agreement PDF | Low | Visual | **No page numbers** on the agreement PDF (the compliance H&S docs do have them). |
| F4 | Agreement | Low | Decision | Unsigned agreement shows a "*template — should be reviewed by a lawyer*" note. Once **signed it's replaced by the signature block** (good), but it shows on the unsigned online view/PDF. Keep (prudent) or remove? |
| F9 | Agreement doc mobile | Low | [eyeball] | Doc CSS is responsive (`max-width:100%` under 480px) — confirm no horizontal scroll at 390px on a real device. |

No **Critical** (security/data-loss) issues found.

---

## 4. Responsive review (from the layout classes)

| Screen | Desktop 1440/1920 | Laptop 1280 | Tablet 768 | Mobile 390 |
|---|---|---|---|---|
| **Agreement (public)** | `max-w-6xl` + `lg:grid-cols-2` → agreement beside sign form, good width use ✅ | 2-col (lg=1024+) ✅ | single column ✅ | single column, doc `max-width:100%` ✅ |
| **Contractor/employee record (staff)** | onboarding + competency `xl:grid-cols-2` ✅; other sections in cards | 2-col onboarding (xl=1280) ✅ | single column ✅ | single column ✅ |
| **Staff add/edit form** | ⚠️ `max-w-2xl` — narrow column on a wide screen (**F8**) | ⚠️ narrow | OK | OK |
| **Sign form fields** | internal `sm:grid-cols-2` ✅ | ✅ | 2-col at ≥640 | single column ✅ |
| **Induction module** | portal card, single readable column ✅ | ✅ | ✅ | ✅ |

**[eyeball] needed** on the deploy preview at 1440/1920/1280/768/390: the agreement two-column balance, the staff record two-column balance, and F8 (staff form width). Everything else is single-column-clean by construction.

---

## 5. H&S visual review — what's reused, what's lost, what's needed

- **Original assets** (`C:\Projects\Sano\40-Business\Health-Safety\Finalised`): Health & Safety Plan, Hazardous Chemical Substance Register (+ SDS), Harm Register, Hazard & Risk Procedure, Proof of Competency, Contractor Pre-Qualification — all professionally branded (dark banner, green accent, numbered sections, callouts, tables, page footers via `_lib/sano-doc.js`).
- **Reused online:** the *content substance* (H&S duties, hazard/incident reporting, chemical/SDS, PPE, security, privacy) as concise portal-branded summaries + acknowledge/complete.
- **Lost in conversion (by design):** the rich print layout — banner imagery, icons, colour callouts, tables, page structure — is **not** re-created in the portal. The plan was to preserve that character via the **linked finalised PDF**. **That link is the missing piece (F5).**
- **Exact URLs still required** (host the PDFs anywhere; paste at `/portal/training/<id>/edit`):
  - `hs_induction` → **Sano – Health & Safety Plan.pdf**
  - `hazardous_substances` → **Sano – Hazardous Chemical Substance Register (with SDS).pdf**
  - `security_property` → *(no dedicated PDF — content is in the signed agreement)* — decision: link the agreement, a policies PDF, or leave summary-only.
  - `privacy_conduct` → *(same as above)*
- **Not redesigned into a generic training UI** — confirmed; the modules are lightweight acknowledgements pointing to the authoritative documents.

---

## 6. Agreement & PDF presentation

Reviewed `EmploymentAgreementDocument` (online + `/agreement/[token]/print` → Puppeteer PDF):
- ✅ Sano logo (`sano-full-white.png`), sage branding, Noto Serif headings; parties, rate ("$35.00 per hour (exclusive of GST)" / employee "(inclusive of 8% holiday pay)"), clauses, dark footer.
- ✅ Signature block on signed docs: name · date · "Electronically signed — by typing their name…" (clean e-sign presentation).
- ⚠️ Missing vs your checklist: **document version (F1)**, **issued date (F2)**, **page numbers (F3)**; unsigned shows a lawyer template note (**F4**).
- **[eyeball]/sample PDF:** sign the test agreements, then open the confirmation email's attached PDF (and `/agreement/<token>/print`) to confirm page breaks + no browser-print artefacts.

---

## 7. Staff usability (contractor/employee record)

The onboarding panel shows: overall stage badge, **"X of Y required complete"** *plus* per-item status grouped by section (Personal / Payment / Compliance / Documents / Training / Competency), a **"Ready for activation"** banner with the blocking reason, `MarkActiveButton`, admin override, tax-review panel, competency panel, legacy badge where applicable.
- ✅ Not reliant on % alone (per-item + next-action banner).
- ✅ Uploaded vs verified are **separate items** (`id_uploaded` vs `id_verified`) — cannot be confused.
- Suggestion (polish): a one-line "Next action:" callout at the top of the panel and a compact "supplied / uploaded / verified / competency" summary strip for first-time processors.

---

## 8. Automation review (code-verified)

**Automated ✅:** checklist creation (on sign + applicant conversion), field branching (contractor vs employee sign form), document attachment (agreement_id → contractor_id backfill on sign), agreement signing updates, induction assignment (worker-type aware), signed-PDF delivery (Resend + Puppeteer), status/progress recalculation (`recomputeOnboardingStatus`), payroll visibility only after activation, audit logging (system + staff rows).

**Never auto-inferred (staff judgement) ✅:** `id_verified`, `right_to_work_verified`, `insurance_verified`, `tax_review`, `payroll_tax_verified`, `kiwisaver_verified`, `competency_confirmed` — all staff-only; document presence completes only the `*_uploaded` items, never a `*_verified` item (test-covered).

---

## 9. Accountant & lawyer review list

**Accountant:**
1. Employee **ND tax code until IR330 received + payroll-verified** (new default) — confirm this is the desired PAYE behaviour before verification.
2. KiwiSaver **employee rate** (captured on sign: 3/4/6/8/10%) + **employer rate default 3%** — confirm.
3. **Payroll-readiness rule** (employee enters payroll only when `status='active'`) — confirm.
4. Contractor **IR330C review statuses** (Review required / Awaiting IR330C / Confirmed / Not required / Exception) — confirm the mapping from structure.
5. **GST** handling + rate presentation on contractor agreements ("exclusive of GST") — confirm.

**Lawyer:**
1. Final **contractor agreement** wording (18 clauses).
2. Final **employee (casual) agreement** wording.
3. **Electronic-signature** presentation + evidence (typed-name attestation, timestamp, audit row).
4. Contractor **insurance minimum wording** ($1,000,000 residential / $2,000,000 commercial, clause 9.1).
5. **H&S / policy acknowledgement approach** (module acknowledgement vs signed clause).
6. **Record-retention** approach for signed agreements + uploaded ID/right-to-work/IR330 documents (private bucket).

*No legal/tax rules were changed during this review.*

---

## 10. Decisions required from Mike

- **D1 (unblocks F5):** host the 2 finalised PDFs + decide what `security_property`/`privacy_conduct` link to (agreement / policies PDF / summary-only).
- **D2 (F4):** keep or remove the "template — review by a lawyer" note on unsigned agreements.
- **D3 (F1/F2/F3):** add document version + issued date + page numbers to the agreement PDF? (polish, mild compliance value).
- **D4 (F6):** hide `/portal/employees` now, or leave until the table is retired.
- **D5:** accountant confirmation on ND + KiwiSaver rules before real employee signings.

## Final polish plan (once decisions are in)
1. **F5 / D1** — paste the PDF links (5 min, no code) → the induction visual character is restored.
2. **F1/F2/F3 / D3** — add version + issued date + page numbers to `EmploymentAgreementDocument` (visual, ~1 small PR).
3. **F7 + F6 / D4** — point the create-agreement employee dropdown at `contractors(worker_type='employee')`; hide/redirect the legacy `/portal/employees`.
4. **F8** — widen `ContractorForm` to a desktop two-column layout.
5. **F4 / D2** — keep/remove the template note.
6. Optional: the staff "Next action" callout (item 7 suggestion).

Everything above is **visual or workflow polish** except **F5** (compliance-relevant: the H&S visual/authoritative document must be reachable) and the accountant/lawyer confirmations, which are the only items with real compliance weight.
