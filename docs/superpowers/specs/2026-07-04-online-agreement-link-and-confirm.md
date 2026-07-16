# Spec — Online agreements: link/create person + signed confirmation

> Status: **spec / not yet built.** Blocked on a permission unlock (see §6).
> Date: 2026-07-04
> Requested by: Mike. Scope confirmed via Q&A (see §2).

## 1. Goal

Make the employment/contractor agreement flow a complete online loop:

1. When creating an agreement, **link an existing contractor/employee** if
   we already have them (pre-filling their known details), instead of
   creating a duplicate.
2. If they're **new**, signing the agreement **creates their account**,
   populated with everything gathered on the form.
3. When they **sign + submit online**, the signed copy comes back into the
   portal (already happens) **and** a **confirmation email** goes out with
   the **signed agreement PDF attached**.

## 2. Confirmed scope (Mike's answers)

- **Confirmation email recipients:** Michael (michael@sano.nz), Carol
  (carol@sano.nz), the admin inbox (hello@sano.nz / `SANO_NOTIFY_EMAIL`),
  **and the signer themselves** (their own confirmation + copy).
- **Email content:** attach a **PDF of the fully signed agreement**.
- **Applies to both** contractors **and** employees (link existing person,
  or create the account on signing).
- **New account stores everything gathered** — name, contact, address,
  IRD/GST/bank, etc. Requires adding those columns to the person record
  (see §4.1). Mike runs the migration.

## 3. Current state (what already exists)

- `/portal/agreements` — create (casual employee | contractor), list.
  `createEmploymentAgreement` inserts a draft + private token link.
- `/portal/agreements/[id]` — renders the full `EmploymentAgreementDocument`
  (the preview) + a Copy-link box. `contractor_id` / `employee_id` on the
  record link to the workforce record once signed.
- `/agreement/[token]` — public sign page + `SignAgreementForm` + `_actions.ts`.
  On sign it captures the person's details, **upserts a contractor by email**,
  sets `signed_at` / `signed_name` / status = signed.
- `employment_agreements` columns already include: agreement_type,
  person_label, position, hourly_rate, start_date, employee_* (full_name,
  address, ird_number, bank_account, phone, email, dob), tax_code,
  kiwisaver_choice, contractor_trading_name, contractor_gst_number,
  contractor_id, employee_id, signed_name, signed_at, status.
- Employer constant: **Sano Property Services Limited**, GST 148-387-648,
  35 Holbrook Street, Blockhouse Bay.
- PDF infra exists: `src/lib/pdf/render-pdf.ts` (puppeteer-core +
  @sparticuz/chromium), used by quote/invoice/proposal PDF routes.
- Email infra: `src/lib/resend.ts` (Resend), `SANO_NOTIFY_EMAIL`.

## 4. Build plan

### 4.1 DB migration (Mike-run) — `docs/db/2026-07-04-agreement-person-fields.sql`
Add the "gathered" fields to the person records so a new account captures
everything (confirm exact existing columns first with `list_tables`):
- `contractors`: add (if missing) `address`, `ird_number`, `gst_number`,
  `bank_account`, `date_of_birth`, `emergency_contact_*`, `insurer_name`,
  `insurance_cover`, `insurance_expiry`, `trading_name`.
- `employees`: same personal set as applicable (address, ird_number,
  bank_account, tax_code, kiwisaver_choice, dob, emergency contacts).
Idempotent `add column if not exists`. RLS unchanged (admin/service writes).

### 4.2 Create form — link existing person (NOT restricted)
`src/app/portal/agreements/_components/CreateAgreementForm.tsx` +
`_actions.ts` + the create page:
- Page loads active contractors (id, full_name, email, phone) and employees.
- Form: optional **"Link existing contractor/employee"** searchable select
  (filtered by the chosen agreement type). When chosen, show the picked
  person read-only.
- `createEmploymentAgreement` gains `linkedContractorId?` / `linkedEmployeeId?`.
  When present: set `contractor_id`/`employee_id` on the agreement and
  pre-fill the agreement's person fields (name, email, phone, + any legal
  fields already on that record) so the document preview shows them and the
  sign step matches the same person (no duplicate).

### 4.3 Signed-agreement PDF route (NOT restricted — uses `[id]`)
`src/app/api/agreements/[id]/pdf/route.ts` (+ a print view, e.g.
`src/app/agreements-print/[id]/page.tsx`) reusing `render-pdf.ts`. Renders
`EmploymentAgreementDocument` for a signed agreement → filename
`Sano Agreement - <person>.pdf`. Staff-auth for the api route; the print
route is internal (token-guarded or admin) — mirror the existing PDF routes'
auth pattern. Deliberately avoids the `[token]` segment so it's editable.

### 4.4 Confirmation email helper (NOT restricted)
`src/lib/resend.ts`: `sendAgreementSignedEmail({ agreement, pdfBuffer,
recipients })`:
- To: michael@sano.nz, carol@sano.nz, `SANO_NOTIFY_EMAIL`, + the signer.
  (Internal recipients get the "X signed their agreement" framing; the
  signer gets a "thanks, here's your copy" framing — likely two sends.)
- Attaches the signed PDF. Subject e.g. "Agreement signed — <person>".

### 4.5 Sign action wiring (RESTRICTED — `src/app/agreement/[token]/_actions.ts`)
On submit, extend the existing flow to:
- If the agreement is already linked (`contractor_id`/`employee_id`),
  **update that record** with the gathered fields (don't create a new one).
- Else **create** the contractor/employee account with everything gathered
  (§4.1 columns), then set the id back on the agreement.
- After marking signed: render the PDF (§4.3) and call
  `sendAgreementSignedEmail` (§4.4). Fail-soft on email (sign still succeeds;
  log the email failure) so a mail hiccup never blocks a signature.

## 5. Verification
- Link an existing contractor when creating → document pre-filled, no
  duplicate on sign, gathered fields update that contractor.
- New person → account created with all fields.
- On sign: signed copy in portal, and the 4 confirmation emails arrive with
  the signed PDF attached.
- Both contractor and employee types.

## 6. Blocker — permission unlock required
`src/app/agreement/[token]/**` (the signing route, §4.5) is blocked by a
global `Read(//**/*token*)` deny in `~/.claude/settings.json` (line ~107),
intended for secret token files but matching the Next.js `[token]` route
folder (also affects `src/app/share/[token]/**`). Fix: narrow it (e.g.
`Read(//**/*.token)`); `*secret*` / `*credential*` / `.env` denies still
cover real secrets. Permission changes apply at **session start**, so a
restart is needed. §§4.1–4.4 can be built without the unlock; §4.5 cannot.
