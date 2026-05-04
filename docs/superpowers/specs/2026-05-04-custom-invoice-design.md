# Custom Invoice (Legacy / Manual Import) — Design

**Date:** 2026-05-04
**Status:** Approved — ready for implementation
**Branch:** TBD (new branch off `main`)

---

## 1. Purpose

Provide a safe, additive way to create fully manual invoices in the portal for
pre-portal / legacy cases — e.g. an invoice that was originally issued outside
the portal needs to be reproduced inside it (with the same legacy invoice
number, custom dates, and custom wording) so it can be sent, shared, and marked
paid through the standard flow.

The immediate motivation is a tenancy-dispute case where a customer needs the
wording on a previously-issued invoice amended.

## 2. Scope

**In scope.**

- New admin-only entry point at `/portal/invoices/custom/new`.
- A single-page form with full manual control of: `invoice_number`,
  `client_id`, `date_issued`, `due_date`, `service_address`, `notes`,
  `base_price`, `gst_included`, `payment_type`.
- New `source = 'custom'` value on `invoices`.
- Patch the `generate_invoice_number` trigger to respect a manually-supplied
  number (backward-compatible).
- Server-side uniqueness check that returns a clean error before the DB sees it.
- Audit log entry `invoice.created_custom` including the user's email.
- "Custom" badge on the list view and the detail view, with a tooltip
  clarifying meaning.
- Non-blocking warning when editing a custom invoice that's already `sent` or
  `paid`.

**Out of scope.**

- Editing custom invoices beyond what the standard detail page already exposes.
  (Future option if needed.)
- Bulk import of multiple legacy invoices.
- Line items (`invoice_items`) on custom invoices — Lean field set only.
- Any change to the standard quote → job → invoice flow.
- Any change to the unique-index strategy on `invoice_number`.

## 3. Pre-flight verifications (resolved)

| Check | Finding |
|---|---|
| `generate_invoice_number()` trigger respects manual values? | **No** — unconditionally overwrites with `nextval()`. Migration must patch this. Patch is backward-compatible (only auto-generates when input is null/empty). |
| `share_token` generation | DB default `gen_random_uuid()`. No app code needed. |
| `invoices.site_id` exists? | **No** — column doesn't exist. Drop "populate site_id" from the plan. Only `contact_id` is populated from the client's primary contact. |
| `invoice_number` column | NOT NULL, no DB default; relies on the trigger. After patch: NOT NULL preserved (trigger fills the gap when caller doesn't). |

## 4. Data-model changes

Single migration: `docs/db/2026-05-04-custom-invoice-source.sql`. Idempotent.

```sql
-- Phase 5.5.X — Custom (legacy) invoices.
-- Two changes, both additive + backward-compatible:
--   1. Allow source = 'custom'.
--   2. Patch generate_invoice_number() to respect a manually-supplied
--      number, so the new custom-invoice flow can write its legacy
--      invoice_number without it being clobbered.

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'invoices_source_check') then
    alter table public.invoices drop constraint invoices_source_check;
  end if;
  alter table public.invoices
    add constraint invoices_source_check
    check (source is null or source in ('job','manual','recurring','custom'));
end $$;

create or replace function public.generate_invoice_number()
returns trigger
language plpgsql
as $func$
begin
  -- Backward-compatible: existing call sites never set invoice_number,
  -- so nextval still fires for them. The new custom-invoice flow (Phase
  -- 5.5.X) supplies a legacy number explicitly; that value is now
  -- preserved instead of being overwritten.
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$func$;
```

No new columns. No new tables. The unique partial index on `invoice_number`
is preserved as-is — it's exactly the guard we want against accidental
collisions.

## 5. Server action

New file `src/app/portal/invoices/_actions-custom.ts` exporting
`createCustomInvoice(form)`. Existing `_actions.ts` is not touched.

Responsibilities, in order:

1. **Auth.** Load user; reject when `user.email !== 'michael@sano.nz'`.
2. **Validate inputs** (server-side, not just form-level):
   - `invoice_number` — required, soft-format check `/^INV-\d{4,6}$/`,
     **explicit uniqueness pre-check** against `public.invoices.invoice_number`
     before insert (returns a clean message: "Invoice number INV-XXXX is
     already in use" — does NOT rely on the DB unique-index error).
   - `client_id` — required, must resolve to a non-archived client.
   - `date_issued` / `due_date` — required, valid ISO dates,
     `due_date >= date_issued`.
   - `base_price` — required, >= 0, NZD.
   - `payment_type` — `'cash_sale'` or `'on_account'`.
   - `notes` — required (this is the primary content field — disputes need
     wording, so we want it explicit).
3. **Resolve `contact_id`** from the client's primary contact (one-row lookup;
   nullable if absent — Phase 5.5.9 backfill guarantees one for existing
   clients but we don't fail if it's missing for any reason).
4. **Insert** the invoice row with:
   - `source: 'custom'`
   - `quote_id: null`, `job_id: null`
   - `status: 'draft'` (so the existing send flow lights up)
   - All form fields verbatim
   - `contact_id: <resolved or null>`
5. **Audit log** — write `audit_log` row:
   - `action = 'invoice.created_custom'`
   - `entity_table = 'invoices'`, `entity_id = <new id>`
   - `actor_email = user.email` (per the user's "include created_by" addition)
   - `payload = { invoice_number, client_id, base_price, gst_included, payment_type }`
6. **Redirect** to `/portal/invoices/{new id}`.

## 6. UI changes

**Files modified.**

- `src/app/portal/invoices/page.tsx`
  - SELECT now includes `source`.
  - Header gains an admin-only `[+ Create custom invoice]` link to
    `/portal/invoices/custom/new`.
  - `cell()` for `invoice_number` renders the new `CustomInvoiceBadge` next
    to the existing Test/Archived badges when `source === 'custom'`.
- `src/app/portal/invoices/[id]/page.tsx`
  - SELECT now includes `source`.
  - `<CustomInvoiceBadge>` rendered next to the H1 invoice number.
  - When `source === 'custom'` AND `displayStatus` ∈ `{'sent','paid','overdue'}`,
    a small non-blocking amber banner above the action row reads:
    "This is a custom (legacy) invoice. Edits won't notify the customer
    automatically — confirm any wording changes are reflected in the next
    send."

**Files added.**

- `src/app/portal/invoices/custom/new/page.tsx` — admin gate + render form.
- `src/app/portal/invoices/_components/CustomInvoiceForm.tsx` — client form.
  - Posts to `createCustomInvoice` server action.
  - Inline error rendering (uniqueness, validation).
  - Quick-fill button "Use 14-day terms" calling the existing
    `computeInvoiceDueDate` helper.
- `src/app/portal/invoices/_components/CustomInvoiceBadge.tsx` — small chip,
  sage palette, tooltip "Custom (legacy / manual) invoice — created
  outside the standard quote → job → invoice flow."

**Files explicitly NOT touched.**

- `_actions.ts` (send / mark-paid / archive)
- `quotes/[id]/_actions-invoice.ts`, `_actions-job-and-invoice.ts`
- `jobs/[id]/_actions.ts` (`createInvoiceFromJob`)
- `lib/invoice-dates.ts`, `lib/invoice-total.ts`, `lib/doc-helpers.ts`
- `print/page.tsx`, `share/invoice/[token]/page.tsx`, `SendInvoicePanel.tsx`
- `lib/attention-rules.ts`, `lib/quote-status.ts`,
  `lib/portal-display-settings.ts`
- All notification templates and SMS triggers (Phase H).

## 7. Safety guarantees ("Must NOT be auto-modified")

- `quote_id = null` and `job_id = null` → invisible to all converters
  (`convertToInvoice`, `createInvoiceFromJob`, `createJobAndInvoiceFromQuote`).
  These functions only mutate rows they create.
- `auto_create_job_on_invoice` setting only fires inside `convertToInvoice`,
  which is bypassed entirely.
- Payment-status sync on linked jobs (`sendInvoiceEmail` / `markInvoicePaid`)
  is scoped to `jobs.invoice_id = $id`. No job will ever match a custom
  invoice. No-op by data shape.
- Existing "needs attention" rules surface custom drafts/overdue normally —
  this is the intended behaviour.

## 8. Risks (post-verification)

| # | Risk | Status |
|---|---|---|
| 1 | `invoice_number` trigger overwrites manual values | **Resolved** — migration patches the trigger to a `COALESCE`-style guard. Backward-compatible. |
| 2 | Soft-deleted invoices still occupy their number (unique index isn't filtered on `deleted_at`) | **Accepted** — not relevant to legacy import. Documented in form helper text. |
| 3 | Manual number could collide with a future auto-sequence value | **Accepted** — user has confirmed no collision today; sequence runs at ~10/month and legacy uses `INV-26xxx` range. Soft format hint in the form. |
| 4 | Print PDF renders structured service fields a custom invoice won't have | **Mitigated** — `print/page.tsx` already conditionally renders these; `notes` carries the wording. Smoke test in Section 9. |
| 5 | `SendInvoicePanel` Cc routing relies on `accounts_email` / `contact_email` overrides | **Mitigated** — Lean form omits these; panel falls back to `clients.email`. Same fallback used today. |
| 6 | Reports / KPIs treat custom invoices as revenue | **Intentional** — they ARE revenue. No filter changes. |
| 7 | Audit trail completeness for disputes | **Resolved** — server action writes `invoice.created_custom` with `actor_email`. Subsequent edits are covered by existing `record_snapshots`. |

## 9. Acceptance criteria (test plan)

Local smoke tests, in order:

1. `dev` server boots; TS + lint clean.
2. Visit `/portal/invoices` as `michael@sano.nz` → see new "Create custom
   invoice" button. Visit as a non-admin → button is absent.
3. Submit form with valid inputs and `INV-26001` → redirects to detail page.
4. Detail page shows "Custom" badge next to the invoice number.
5. List view shows "Custom" badge in the invoice-number cell, alongside
   Test/Archived chips when applicable.
6. Submit form again with the same `INV-26001` → see clean error, NOT a DB
   constraint trace.
7. Submit form with `invoice_number` left blank → server validation rejects
   (we never want to fall through to auto-generation when the user is in the
   custom flow).
8. Send the new custom invoice via the existing panel → email arrives, invoice
   moves to `sent`, share link works, PDF renders with the dispute wording in
   the Notes section.
9. Mark the custom invoice as paid → standard flow works; no warnings.
10. Edit the custom invoice (status `sent`) → non-blocking amber banner appears
    (per addition #3).
11. Inspect `audit_log` → `invoice.created_custom` row exists with
    `actor_email` populated.
12. Spot-check standard auto-flow: convert a fresh quote to invoice → still
    auto-numbers correctly via the patched trigger (regression check).
13. Repeat the trigger regression in a second migration dry run on a staging
    DB before production apply.

## 10. Open questions

None. All resolved during pre-flight verification.
