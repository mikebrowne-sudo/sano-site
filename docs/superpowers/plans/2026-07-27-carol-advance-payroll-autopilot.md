# Carol Advance Payroll Autopilot — TDD Implementation Plan

Status: **DRAFT — awaiting Mike's review. Do not begin coding until approved.**
Date: 2026-07-27

## 1. Goal & scope
Weekly, **paid-in-advance** wages for Carol (and future employees) that run on
autopilot: the cron drafts + auto-approves a standard run; Mike makes the actual
bank transfer manually. Mileage is handled **separately, monthly, in arrears**.
Hours are **effective-dated** with full history. KiwiSaver keeps processing until
a valid opt-out, then a **separate, auditable** refund/adjustment — approved pay
runs are never silently rewritten. Auto-payment is explicitly **not** built.

## 2. Approved golden figures (Carol, 20h × $30, code M, KiwiSaver 3.5%)
These become the golden test fixture. PAYE is **one** statutory deduction.

| Line | Amount |
|---|---|
| Gross wages | $600.00 |
| **PAYE (incl. ACC)** — single deduction | **$94.50** (internal: $84.00 tax + $10.50 ACC) |
| Employee KiwiSaver 3.5% | $21.00 |
| **Net pay** | **$484.50** |
| Gross employer KiwiSaver | $21.00 |
| ESCT 17.5% | $3.68 |
| Net employer contribution | $17.32 |
| **Total Sano wage cost** | **$621.00** |

**Hard rule:** net = gross − PAYE − employee KiwiSaver. ACC is **inside** PAYE;
it is never a second deduction line. The payslip/UI shows one "PAYE (incl. ACC
earner levy)" line; the $84.00/$10.50 split is display-only sub-text.

## 3. Design principles
- **Effective-dated standing terms**, never a single mutable value; historical runs resolve to the exact version used.
- **Auto-approve is the exception, not the rule** — only an unchanged standard run with zero warnings/exceptions auto-approves; everything else stays a draft.
- **Manual payment** always (transfer or, later, an ASB bulk file Mike uploads).
- **Immutable approved runs** — corrections are new, separate, audited adjustment records.
- **Everything auditable** — who/what/when for every state change.

## 4. Schema changes (all additive, idempotent, Mike-run)

### 4.1 `employee_pay_terms` (effective-dated standing config) — NEW
```
id uuid pk
contractor_id uuid not null → contractors(id) on delete restrict
standard_weekly_hours numeric not null
hourly_rate numeric not null
working_pattern text            -- days + approx times (free text)
pay_frequency text not null     -- 'weekly' | 'fortnightly'
payday text not null            -- day the pay date falls on, e.g. 'monday'
basis text not null             -- 'advance' | 'arrears'
effective_from date not null
effective_to date               -- null = current; set when superseded
created_by uuid, created_at timestamptz default now()
```
- Partial unique index: one current (`effective_to is null`) row per contractor.
- Saving a change **inserts a new row** and stamps `effective_to` on the prior current row (= new row's `effective_from` − 1 day). No in-place mutation.

### 4.2 `pay_runs` additions
- `pay_terms_id uuid → employee_pay_terms(id)` **and** a `terms_snapshot jsonb` (the resolved values) so a run always resolves to the exact terms used, even if terms rows are later archived.
- `basis text` ('advance'|'arrears'), `auto_approved boolean default false`.
- `payday_filing_status text` — 'not_filed' | 'submitted' | 'accepted' | 'exception' (default 'not_filed').
- `payday_filing_submitted_at`, `payday_filing_accepted_at` (timestamptz).
- Keep the existing period-unique double-pay guard.

### 4.3 `kiwisaver_adjustments` (refund/reversal record) — NEW
```
id, worker_id → contractors, source_pay_run_id → pay_runs (nullable),
kind text  -- 'employee_refund' | 'employer_reversal' | 'esct_correction'
amount numeric not null,
effective_date date not null,
reason text, evidence_ref text,
remitted_to_ird boolean,   -- true → IRD refunds; false → employer direct refund
performed_by uuid, created_at timestamptz default now()
```
- Never edits the originating pay run; a read-only ledger of corrections.

### 4.4 `mileage_reimbursement_statements` + link — NEW
```
statement: id, worker_id, period_start, period_end, total_amount, status
  ('draft'|'approved'|'paid'), approved_by, paid_at, created_at
```
- `mileage_logs` gains `statement_id` (nullable) so approved-unpaid trips group into one monthly statement. **Decouples mileage from the weekly wage run** (changes #423 behaviour — see §6.5).

### 4.5 Employer registration / payday-filing readiness — NEW (settings)
- `workforce_settings` (or a small `employer_tax_status` row): `emp_registered boolean`, `payday_filing_channel text` ('myir'|'other'), `emp_note text`. Surfaced in the readiness check; **informational, never blocks** a pay.

## 5. State machines

**Standing terms:** `current (effective_to null)` → `superseded (effective_to set)` on new version. Never deleted.

**Pay run:** `draft` → `approved` (manual, or gated auto) → `paid` (manual mark after transfer) → filing: `not_filed` → `submitted` → `accepted` | `exception`.
- Auto-approve transitions draft→approved **only** through the gate (§7).
- `exception` (filing rejected by IRD) never rewrites the run; it raises an alert + blocks future auto-approve until cleared.

**KiwiSaver (per earlier model):** `auto_enrolled` → (valid KS10) `opted_out`; opt-out spawns `kiwisaver_adjustments` rows (refund/reversal/ESCT), not edits.

**Mileage:** trip `approved & unpaid` → grouped into `statement(draft)` → `approved` → `paid`.

## 6. Component behaviour

### 6.1 Effective-dated terms resolution (pure lib)
`resolveTermsAsAt(terms[], date)` → the version whose `[effective_from, effective_to]` contains `date`. Used by cron + any recompute. Historical runs prefer `terms_snapshot`, falling back to resolution.

### 6.2 Weekly cron (extends #424 `create-employee-pay-run.ts` + `/api/cron/weekly-payroll`)
1. For each active employee with current terms `basis='advance'`: compute the **upcoming** week's period; `pay_date` = the configured payday of that week (advance).
2. Resolve terms as-at the period; compute payslip from them (single-PAYE engine).
3. Run **all** validations (§7).
4. If the run is a standard-match with **zero** warnings/exceptions → `auto_approved = true`, status `approved`. Else leave `draft`.
5. Write the `terms_snapshot`; create the payday-filing obligation (`not_filed`).
6. Notify Mike (email to `SANO_NOTIFY_EMAIL`) with the **net amount to pay** + a link; never triggers payment.
7. Respect the period-unique guard (no duplicate/overlap).

### 6.3 First-pay flow (manual approve, always)
- New readiness panel on the pay-run (or a pre-pay screen) with the 7 checks (§ requirement 1):
  signed agreement · completed IR330 · confirmed bank account · current KiwiSaver status · KS3/KS10 info pack recorded · payroll compared with IRD calc/IR340 (a staff tick with the compared figure) · EMP registration + payday-filing status visible.
- **EMP still processing does not block** the pay; the run is flagged `payday_filing_status='not_filed'` and the UI records "payday filing outstanding until accepted by IRD."
- First pay is **never** auto-approved (guarded by "no prior accepted pay for this worker").

### 6.4 KiwiSaver refund flow (on valid KS10, ~10 Aug)
- Uses the existing **validated staff action** (`recordEmployerOptOut`); triggers the existing **not-submitted-to-IRD reminder** (#442).
- Stops deductions from the opt-out **effective date**.
- Computes, as separate `kiwisaver_adjustments` rows: **employee refund**, **employer contribution reversal**, **ESCT correction** — each with `remitted_to_ird` set so the UI shows whether Sano direct-refunds (not yet remitted) or IRD refunds (already remitted).
- Presents them clearly on the employee KiwiSaver panel; **approved pay runs are untouched**.

### 6.5 Mileage (monthly, arrears, separate) — changes #423
- The weekly wage cron **excludes** mileage.
- A monthly action groups **approved unpaid** trips into one `mileage_reimbursement_statement` + a separate payment instruction. Non-taxable; never in taxable wages; never in the weekly run.
- Migration note: existing per-run mileage line behaviour (#423) is superseded for employees on the new model; document + guard so we don't double-pay a trip already settled the old way.

### 6.6 Payday-filing queue
- Each approved/paid run creates a filing obligation. Mike files via myIR (manual); marks `submitted` → `accepted`. `exception` raises an alert. A dashboard widget lists runs with filing `not_filed`/`submitted`/`exception`.

## 7. Auto-approve gate (draft unless ALL clear)
Auto-approve **only** an unchanged standard run. Blocked (→ stays draft) by any of:
- changed hours or rate vs the current terms
- tax-code change
- bank-detail change
- any leave or additional hours in the period
- KiwiSaver status change
- KS10 receipt, refund or correction pending
- any payroll adjustment
- failed or incomplete validation
- EMP / payday-filing exception outstanding
- duplicated or overlapping pay period
- stale standing configuration (no current terms / terms effective_from in the future / missing required fields)
Each blocker is a named predicate returning a reason; reasons are recorded on the draft + audited.

## 8. Permissions
- Terms edit, pay-run approve, mark-paid, KiwiSaver actions, mileage approve → **admin only** (`isAdminUser`).
- Cron runs under the service-role client (CRON_SECRET-gated route), `performed_by = null` (system).
- Readiness ticks (e.g. IRD-compared) record the admin who ticked.

## 9. Audit events (to `audit_log` + typed tables)
terms_version_created · pay_run_drafted · pay_run_auto_approved · pay_run_approved · pay_run_marked_paid · payday_filing_submitted · payday_filing_accepted · payday_filing_exception · kiwisaver_adjustment_created · mileage_statement_created · mileage_statement_paid · readiness_checked. Each with actor + timestamp + context.

## 10. Tests (TDD — write first, red → green)
**Pure unit (Jest):**
- Golden payslip: $600 → PAYE $94.50 (single line, no double ACC), KS $21.00, net $484.50, employer $21.00/ESCT $3.68/net $17.32, cost $621.00.
- PAYE single-deduction invariant: `net === gross − paye − employeeKs` and PAYE already includes ACC.
- `resolveTermsAsAt`: picks the right version at boundary dates; historical run resolves to its snapshot after a later change.
- Auto-approve gate: a table-driven test — each of the 11 blockers individually forces `draft`; the all-clear case auto-approves.
- Advance date calc: period + pay_date land on the configured payday of the upcoming week.
- KiwiSaver refund calc: employee refund / employer reversal / ESCT correction amounts + `remitted_to_ird` branch.
- Mileage grouping: approved-unpaid trips in a month → one statement total; already-paid excluded.
- Overlap/double-pay guard: overlapping period rejected.

**Integration-ish (fake client):**
- Cron: standard run → auto_approved; each exception → draft with the reason.
- First-pay: never auto-approves; readiness gate reports each item; EMP-processing does not block but records outstanding filing.

## 11. PR breakdown (each shippable, tests-first, migration Mike-run, gauntlet green)
- **PR A — effective-dated employee pay terms.** `employee_pay_terms` schema + `resolveTermsAsAt` lib + versioned save action + one-field "increase hours" UI (new version, closes old) + tests. Backfill Carol v1 (20h/$30/weekly/Monday/advance, effective 2026-07-27).
- **PR B — first-pay readiness, single-PAYE presentation, employee-payment + filing status.** Payslip shows one PAYE line; readiness panel (7 checks); employee-payment card ("Pay Carol $484.50" → "$484.50 paid …"); `pay_runs` filing-status fields; first-pay manual-approve guard. §13.2 + §13.4.
- **PR C — IRD liability ledger + payment-period tally + dashboard obligations summary.** `ird_liabilities` (period-grouped) + `ird_liability_lines` (per pay run) + "Set aside for IRD" card + dashboard summary. §13.3 + §13.5. Liability created on pay-run approval; cleared only by a recorded IRD payment.
- **PR D — advance weekly cron + gated auto-approval.** Extend #424; advance pay-date (Mon); the §7 gate; net-amount notification. Only after the first manual pay succeeds.
- **PR E — KiwiSaver refunds + immutable adjustments.** `kiwisaver_adjustments` (direct-refund vs IRD-refund split, employer reversal, ESCT correction) wired to the opt-out action; never edits approved runs. §6.4.
- **PR F — monthly mileage statements + legacy double-pay guard.** `mileage_reimbursement_statements`; decouple mileage from the weekly run; guard trips already settled via #423. §6.5.
- **PR G — payday-filing queue, rejection + correction workflow.** Filing states (not_filed/queued/submitted/accepted/rejected/correction_required) + retry/correction actions + audit. §13.4.
- **PR H (later) — ASB bulk-payment file.** Generate from approved wages + approved mileage; Mike uploads/authorises. No auto-payment.

## 12. Answers locked in (2026-07-27)
1. **Payday = Monday; pay week Mon–Sun; weekly in advance.** Carol's first pay: payment date **Mon 27 Jul 2026**, covering **Mon 27 Jul – Sun 2 Aug 2026**.
2. **EMP registration** submitted via myIR **27 Jul 2026, still processing.** Portal shows: EMP registration pending · payday filing required · filing not completed · filing due date · a clear action once the employer account is available. Pending registration **does not block** paying Carol, but the portal must **never** show the employment information as filed/accepted until it actually is.
3. **KiwiSaver refund route:** not-yet-remitted → Sano direct-refunds through payroll; already-remitted → IRD refunds. Employer reversals + ESCT corrections recorded separately + auditable. Never edit the original approved run.
4. **First real pay:** Mike is paying Carol **now**, before PR A, once the existing portal confirms the figures below. PAYE stays one $94.50 deduction; ACC is supporting detail only, never re-deducted.
   - Gross $600.00 · PAYE $94.50 · employee KiwiSaver $21.00 · **net $484.50** · gross employer KiwiSaver $21.00 (ESCT $3.68 within it, net $17.32) · **total Sano cost $621.00** · **total payable to IRD $136.50**.

## 13. Three distinct workflows (NEW — required addition)
A pay run must **never** carry one generic "completed" status implying all three
happened. The three are tracked and displayed separately:

**(1) Employee wage payment · (2) Payday filing · (3) IRD remittance of accumulated PAYE + KiwiSaver.**

Marking Carol **paid** must NOT clear the IRD liability and must NOT mark filing
as done.

### 13.2 Employee payment section (per approved pay run)
Shows: employee name · gross · PAYE · employee KiwiSaver · other deductions ·
net · bank account · payment reference · payment status · payment date.
- Primary instruction before payment: **"Pay Carol $484.50"**.
- After mark-paid: **"$484.50 paid to Carol on 27 July 2026"**.
- Mark-paid affects **only** payment status — not liability, not filing.

### 13.3 IRD liability ledger (NEW tables)
Each approved pay run creates an employer-liability contribution, added to the
**accumulated liability for the relevant IRD payment period** (a running total —
never disconnected weekly amounts).

**"Set aside for IRD" card (Carol's first pay): $136.50**
- PAYE $94.50 · employee KiwiSaver $21.00 · gross employer KiwiSaver $21.00 (ESCT $3.68 **within** it, net $17.32).
- ESCT is inside the $21 employer contribution — **never added again** on top of $136.50.
- Per-run display: Paid to Carol $484.50 · Held for IRD $136.50 · Total Sano cost $621.00.

Schema:
- `ird_liabilities` — one per IRD payment period: `id, period_key (e.g. 2026-07), period_start, period_end, due_date, status, total_paye, total_employee_ks, total_employer_ks_gross, total_esct, total_payable, amount_paid, outstanding, paid_at, ird_payment_reference, created_at`.
- `ird_liability_lines` — one per included pay run: `id, ird_liability_id, pay_run_id (unique — a run is in at most ONE batch), paye, employee_ks, employer_ks_gross, esct, subtotal, created_at`. Unique on `pay_run_id` (a pay run cannot be in more than one IRD batch).
- **Due date resolved from the employer's filing/payment obligations** (small/large employer rule → 20th of the month following, or 5th/20th for large), **not hard-coded** in the UI.
- States: `accruing → due → partially_paid → paid → overdue → adjusted`.
- Created when a pay run is **approved**; stays outstanding after Carol is marked paid; clears **only** when a separate IRD payment is recorded.
- Corrections = explicit `adjusted` adjustment lines, never rewrite historical liability.

### 13.4 Payday filing (separate from the remittance tally)
`pay_runs` filing fields (or a `payday_filings` row per run): states
`not_filed → queued → submitted → accepted → rejected → correction_required`.
Show: actual payday · filing due date · EMP registration status · submission date ·
acceptance/rejection date · rejection reason · retry/correction action.
Carol being paid must not imply filing submitted, accepted, or PAYE/KiwiSaver remitted.

### 13.5 Dashboard payroll-obligations summary
- wage payments awaiting action · wages paid · payday filings outstanding · filing exceptions · PAYE + KiwiSaver held for IRD · next IRD payment due date · total outstanding to IRD · overdue IRD liabilities · KiwiSaver actions outstanding.
- Wording e.g. **"IRD payment due [date]: $[amount] currently outstanding"** (date resolved, not hard-coded).
- Post-first-pay target display: Carol net pay $484.50 paid · Gross payroll cost $621.00 · Held for IRD $136.50 · Payday filing pending · EMP registration pending · IRD remittance outstanding.

## 14. Reuse analysis — what exists / extend / build / migrate / backfill
**Already exists (verified in prod 2026-07-27):**
- `pay_runs` — draft/approved/paid states + `approved_at/by`, `paid_at/by`, `pay_frequency`, `kind`. **No** filing status, terms link, basis, or liability. Period-unique double-pay guard (#420).
- `pay_run_lines` — employee payroll amounts incl. `kiwisaver_employee/employer/employer_net`, `paye`, `net_pay`, `mileage_reimbursement`. Golden figures come from here.
- `contractor_remittances` / `pay_run_remittances` — **contractor** payment statements (numbered, tokened, shareable). A reusable **pattern** for the mileage statement + (optionally) the IRD-liability statement, but **not** an IRD-liability ledger.
- `pay_run_items` — contractor per-job pay (separate from employee `pay_run_lines`).
- `mileage_logs` + `mileage_rate_config` — mileage; #423 currently injects approved mileage into the weekly run (to be decoupled in PR F).
- `worker_kiwisaver_events` — KiwiSaver audit trail (#435). `bank_transactions` — finance reconciliation.
- PAYE engine (`lib/payroll/paye.ts`) — single-PAYE (income tax + ACC) already computed as one figure; **no double-ACC risk** (verified). ESCT in `lib/payroll/esct.ts`.

**Needs building (new):** `employee_pay_terms`; `ird_liabilities` + `ird_liability_lines`; `kiwisaver_adjustments`; `mileage_reimbursement_statements`.
**Needs extending (migration):** `pay_runs` (+ `pay_terms_id`, `terms_snapshot jsonb`, `basis`, `auto_approved`, filing-status fields); `mileage_logs` (+ `statement_id`).
**Migrations:** all additive/idempotent, Mike-run, one per PR (A/B/C/E/F/G).
**Backfill:** Carol's `employee_pay_terms` v1 (20h/$30/weekly/Monday/advance, effective 2026-07-27). Existing employee pay runs: leave `pay_terms_id` null (resolve via `terms_snapshot` when present, else display-only historical).

**First manual Carol pay (before the new PRs land):** it will be an ordinary `pay_runs` + `pay_run_lines` row created via the existing `/portal/payroll/new`, with the golden figures. It has **no** liability/filing rows yet. **PR C backfills** a `ird_liabilities`/`ird_liability_lines` entry for it (period 2026-07), and **PR B/G** backfill its filing status as `not_filed`. Until then, the dashboard's "Held for IRD" is computed on the fly from that run's line so nothing is lost; the ledger row formalises it when PR C lands. No figures are ever silently dropped.

## 15. Sequencing rule
Gated auto-approval (PR D) ships **only after** the first manually-approved pay
has completed successfully. Bank payment stays manual throughout (PR H is a file
generator Mike uploads/authorises — never auto-payment).
