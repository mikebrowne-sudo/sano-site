# Job line items + quote payment details

**Date:** 2026-09-17
**Status:** Spec — approved to build
**Origin:** Two operator gaps raised together on 2026-09-17.

1. A cash-sale quote tells the customer payment is required before the clean but
   never tells them *how* to pay. The bank details exist on invoices and are
   simply absent from quotes.
2. A carpet clean is an add-on that can appear at three different moments — on
   the quote, discovered on site, or as its own job — and the portal can only
   handle the first and third. There is no way to add a charge to a job after it
   is created, and no way to pay a contractor a set amount for it without
   voiding their hourly payable.

---

# Part 1 — Payment details on cash-sale quotes

## Problem

`QuoteDocument` already computes `isCashSale` from `quote.payment_type`
(`src/components/document/QuoteDocument.tsx:137`) and uses it for exactly one
sentence of terms:

```ts
const paymentSentence = isCashSale
  ? 'Payment is required prior to the clean.'
  : 'Payment is due within 14 days of the invoice date.'
```

`DocumentLayout` already renders a "Payment details" block from a
`paymentDetails` prop (`src/components/document/DocumentLayout.tsx:268-277`),
and `InvoiceDocument` already passes Sano's real account
(`src/components/document/InvoiceDocument.tsx:246-250`):

```ts
const paymentDetails: { label: string; value: string }[] = [
  { label: 'Account',   value: 'Sano Property Services Limited' },
  { label: 'Number',    value: '12-3627-0005597-00' },
  { label: 'Reference', value: invoice.invoice_number },
]
```

`QuoteDocument` never passes the prop. That is the whole bug.

## Decision

Bank details only. **No Stripe Pay-Now button on quotes.** Stripe checkout today
is keyed to an invoice id (`src/app/api/stripe/create-checkout/route.ts`) and the
webhook flips `invoices.status`. Paying against a quote that has no invoice yet
has no sane landing place, and inventing one is a separate decision.

## Change

Extract the shared account constant so the two documents can never drift:

**New file `src/lib/sano-bank-details.ts`**

```ts
// Sano's own bank account, as shown to customers on quotes and invoices.
// ONE definition so a quote and its invoice can never disagree about where
// the money goes. The reference differs per document (quote number vs invoice
// number) and is therefore passed in, never hardcoded here.

export const SANO_ACCOUNT_NAME = 'Sano Property Services Limited'
export const SANO_ACCOUNT_NUMBER = '12-3627-0005597-00'

export interface PaymentDetailRow { label: string; value: string }

/** The customer-facing payment block. `reference` is the document number. */
export function sanoPaymentDetails(reference: string): PaymentDetailRow[] {
  return [
    { label: 'Account',   value: SANO_ACCOUNT_NAME },
    { label: 'Number',    value: SANO_ACCOUNT_NUMBER },
    { label: 'Reference', value: reference },
  ]
}
```

**`InvoiceDocument.tsx`** — replace the inline array with
`sanoPaymentDetails(invoice.invoice_number)`, keeping the existing
`Your reference / PO` push. No visual change.

**`QuoteDocument.tsx`** — build the block only for a cash sale:

```ts
const paymentDetails = isCashSale ? sanoPaymentDetails(quote.quote_number) : undefined
```

and pass `paymentDetails={paymentDetails}` to `DocumentLayout`.

On-account quotes get nothing, because the invoice that follows carries the
details and payment is not due at quote time.

## Copy

No new prose. The existing cash-sale sentence *"Payment is required prior to the
clean."* already sits in `termsBody`; the block below it now shows where to send
it. Nothing here touches the forbidden-phrase list.

## Verification

- A cash-sale quote share page shows Account / Number / Reference with the
  quote number as the reference.
- An on-account quote shows no payment block.
- An invoice renders byte-identically to today.
- `?pdf=1` on the quote share route shows the block (it is document body, not an
  interactive panel).

---

# Part 2 — `job_items`: charge-out extras that flow to contractor pay

## Problem

### Jobs hold one number

A job's entire money is `jobs.job_price numeric`. There is no job line-item
table. The only record of what the quote contained is a frozen, deliberately
read-only `scope_snapshot.residential_items` JSONB
(`src/app/portal/jobs/[id]/_components/ScopeSnapshotPanel.tsx:12-33`).

### The invoice reads the quote, not the job

`createInvoiceFromJob` re-reads the **source quote's** `quote_items`
(`src/app/portal/jobs/[id]/_actions.ts:111-115`) and decomposes `job_price` back
into base + add-ons (`:183-185`). Anything added at job level is structurally
unable to reach the invoice. A job with no `quote_id` invoices as a single
un-itemised line.

### No UI can set a non-hourly pay basis

`job_workers.pay_type` supports `hourly | per_visit | fixed` at the DB and lib
level (`src/lib/job-worker-pay-basis.ts`), but every portal write site hardcodes
`'hourly'`:

- `src/app/portal/jobs/_actions.ts:144-154` (create job)
- `src/app/portal/jobs/_actions.ts:517-524` (edit job, worker added)
- `src/app/portal/jobs/[id]/_actions-workers.ts:141-148` (add worker inline)

`per_visit` is written only by recurring-job generation
(`src/lib/recurring-worker.ts:43-63`). An ad-hoc job with a set-amount worker
cannot be created through the UI at all.

### One payable per job per contractor

`src/app/portal/contractor-invoices/_actions-approve-pay.ts:113-123` blocks a
second `contractor_invoices` row for the same `(job_id, contractor_id)`. So a
cleaner already being paid hourly for the clean cannot also be paid a set amount
for the carpet they did on the same visit.

### What staff do instead

`noteLooksLikePrice` (`src/lib/doc-totals.ts:30-33`) is a non-blocking warning
that fires when someone types a `$` amount into Notes — which exists precisely
because there is no line-item affordance at the moment they need one.

## The three carpet-clean scenarios

| # | Scenario | Today | After |
|---|---|---|---|
| A | Carpet quoted up front | `quote_item` → `invoice_item` ✅, pay is hourly only | Pay basis now settable |
| B | Carpet found on site | ❌ nowhere to record it | `job_item` → invoice line + its own payable |
| C | Separate carpet contractor job | Own job ✅, pay is hourly only | Pay basis now settable |

B is the real gap. A and C need only the pay-basis half.

## Design

One new object: a **job item** is a thing done on a job that has a price to the
client and, optionally, a cost to a contractor with its own pay basis.

```
job_items
  id              uuid pk
  job_id          uuid not null → jobs(id) on delete cascade
  label           text not null              'Carpet clean — lounge & hall'
  description     text
  price           numeric not null default 0   charged to the client
  contractor_id   uuid → contractors(id)       nullable: unassigned/in-house
  cost_amount     numeric                      paid to the contractor
  cost_basis      text not null default 'fixed'   'fixed' | 'hourly'
  cost_hours      numeric                      only when cost_basis = 'hourly'
  source          text not null default 'added'   'quote' | 'added'
  sort_order      integer not null default 0
  created_at      timestamptz not null default now()
  created_by      uuid → auth.users(id)
```

### Why these fields

- **`price` and `cost_amount` are independent.** Charging $300 and paying $180 is
  the normal case; the margin is the point. Neither derives from the other.
- **`cost_basis` defaults to `'fixed'`** because a set amount is the whole reason
  this exists. `'hourly'` (with `cost_hours`) is there so an item can be paid the
  ordinary way when that is genuinely what happened.
- **`cost_basis` deliberately has no `'per_visit'`.** `per_visit` answers "is this
  occurrence of a recurring contract payable?" — a question a one-off item never
  asks. Reusing the word would blur `src/lib/job-worker-pay-basis.ts`, whose whole
  purpose is keeping `fixed` (retainer) and `per_visit` distinct. A job item's
  cost is `fixed` in exactly the sense `computeApprovedAmount` already means it.
- **`contractor_id` is nullable.** An item can be billed before anyone is assigned,
  or done in-house with no payable at all.
- **`source`** distinguishes an item copied from the quote at conversion from one
  added later, so the invoice can be built without double-counting.

### Constraints

```sql
alter table public.job_items
  add constraint job_items_cost_basis_chk check (cost_basis in ('fixed','hourly')),
  add constraint job_items_source_chk     check (source in ('quote','added')),
  add constraint job_items_price_chk      check (price >= 0),
  add constraint job_items_cost_chk       check (cost_amount is null or cost_amount >= 0),
  -- hourly cost needs hours; fixed cost must not carry them
  add constraint job_items_hours_chk check (
    (cost_basis = 'hourly' and (cost_amount is null or cost_hours is not null))
    or (cost_basis = 'fixed' and cost_hours is null)
  );
create index job_items_job_id_idx on public.job_items (job_id);
create index job_items_contractor_id_idx on public.job_items (contractor_id) where contractor_id is not null;
```

`price >= 0`: unlike `invoice_items` (which allows a negative correction line),
a job item represents work done. Credits belong on the invoice.

### RLS

Staff-only, mirroring `job_workers`. Contractors do **not** read `job_items` —
`price` and another contractor's `cost_amount` must not leak to a contractor
session. Contractor-facing surfaces get label-only data through an explicit
server-side projection, never a direct table read.

## Money: how `job_price` and items relate

**Rule: `jobs.job_price` remains the price of the job as quoted. Items are
additive on top. The client total is `job_price + sum(job_items.price)`.**

This mirrors the existing `invoice_items` semantic — *"items are ADDONS, not the
full breakdown"* (`src/lib/invoice-total.ts:16-21`) — so there is one rule across
the codebase rather than two.

It also means `createInvoiceFromJob`'s existing decomposition stays correct:
`job_price` still equals base + quote add-ons, and job items are appended as
extra invoice lines rather than folded into the base.

### New helper `src/lib/job-items.ts`

```ts
export interface JobItemLine {
  label: string
  description?: string | null
  price?: number | null
  cost_amount?: number | null
  cost_basis?: string | null
  cost_hours?: number | null
  contractor_id?: string | null
}

/** Total charged to the client for a job's items. */
export function sumJobItemCharges(items: JobItemLine[]): number

/** Total contractor cost across a job's items (0 where unassigned/unpriced). */
export function sumJobItemCosts(items: JobItemLine[]): number

/** The payable for one item: fixed amount, or hours x rate. Null when unpayable. */
export function jobItemPayable(item: JobItemLine): number | null
```

`jobItemPayable` delegates to `computeApprovedAmount` from
`src/lib/contractor-pay.ts` so item pay and worker pay round identically.

## Flow changes

### 1. Quote → Job conversion

`_actions-job.ts`, `_actions-job-and-invoice.ts`, `_actions-job-setup.ts` each
already read `quote_items` for the scope snapshot. They additionally insert a
`job_items` row per quote add-on with `source: 'quote'`, `price` from the quote
line, and `contractor_id`/`cost_amount` null.

**`job_price` is unchanged by this.** Paths C and D compute
`job_price = computeQuoteTotal(quote, residentialItems)` — base − discount +
add-ons, already inclusive. Copying quote add-ons into `job_items` would
double-count if they were additive, so `source: 'quote'` rows are **excluded from
the client-facing total** and exist only to carry the contractor-pay half
(scenario A). Only `source: 'added'` rows are additive.

> This asymmetry is the one genuinely subtle thing in the design. It is a direct
> consequence of `job_price` already containing the quote add-ons. The helper
> enforces it: `sumJobItemCharges` filters to `source === 'added'`, and the
> filtering lives in exactly one place.

Path B (`_actions-job.ts`) leaves `job_price` null today; that is pre-existing
and out of scope here.

### 2. Job detail — the "Extras" panel

New panel on `src/app/portal/jobs/[id]/page.tsx`, beside the existing workers
and scope panels. Per the portal UX rules — full-page forms, large labels,
dropdowns over typing, avoid modals.

Add-item form:

- **What was done** — text (`label`), required
- **Details** — optional textarea (`description`)
- **Charge the client** — number (`price`)
- **Who did it** — `<select>` of the job's assigned workers, then all
  contractors, plus *"No one / in-house"* (`contractor_id`)
- **How they're paid** — radio, default **Set amount**:
  - *Set amount* → one number field (`cost_amount`, `cost_basis: 'fixed'`)
  - *Hourly* → hours + rate, rate prefilled from the contractor's resolved rate
    (`cost_hours`, `cost_amount = hours × rate`, `cost_basis: 'hourly'`)

The panel shows each item with charge, cost, margin, and its pay state
(*Not approved* / *Approved CI-####* / *Paid*).

`source: 'quote'` items render in the same list, marked **From quote**, with the
charge shown greyed and annotated *"already in the job price"*. Their pay half is
fully editable — that is scenario A.

### 3. Job → Invoice

`createInvoiceFromJob` (`src/app/portal/jobs/[id]/_actions.ts:67`) additionally
reads `job_items` where `source = 'added'` and appends one `invoice_items` row
per item (`label`, `description`, `price`), after the quote-derived add-ons,
continuing the `sort_order` sequence.

`base_price` computation is untouched: `job_price − addonsTotal` where
`addonsTotal` is still the **quote** add-ons only. Job items are new lines on
top, so the invoice total rises by exactly `sumJobItemCharges`.

A job with no `quote_id` now itemises properly for the first time.

### 4. Contractor pay — the guard change ⚠️ HARD STOP

This is the only part that touches the path protecting money. Flag for Mike's
review before merge.

`contractor_invoices` gains:

```sql
alter table public.contractor_invoices
  add column job_item_id uuid references public.job_items(id) on delete restrict;
create unique index contractor_invoices_job_item_uniq
  on public.contractor_invoices (job_item_id) where job_item_id is not null and status <> 'void';
```

The existing duplicate guard becomes **item-aware rather than weaker**:

```ts
// One payable per (job, contractor) for the JOB ITSELF, and at most one payable
// per JOB ITEM. A job item is separately-identified work, so paying it does not
// double-pay the job — but the same item must never be paid twice.
const dupQuery = supabase
  .from('contractor_invoices')
  .select('id')
  .eq('job_id', jobId)
  .eq('contractor_id', contractorId)
  .neq('status', 'void')

const { data: existing } = input.jobItemId
  ? await dupQuery.eq('job_item_id', input.jobItemId).limit(1).maybeSingle()
  : await dupQuery.is('job_item_id', null).limit(1).maybeSingle()
```

The `is('job_item_id', null)` branch is what preserves today's protection exactly:
approving the job itself twice is still blocked. The partial unique index is the
belt-and-braces guarantee at the DB level.

**Amount resolution.** When `jobItemId` is present the amount comes from the item,
not from `job_workers`:

```ts
if (input.jobItemId) {
  const payable = jobItemPayable(item)
  if (payable == null) return { error: 'This extra has no contractor cost set.' }
  calc = computeApprovedAmount({
    fixedAmount: item.cost_basis === 'fixed' ? payable : undefined,
    approvedHours: item.cost_basis === 'hourly' ? item.cost_hours : undefined,
    rate: item.cost_basis === 'hourly' ? item.cost_amount / item.cost_hours : undefined,
  })
}
```

**The retainer gate must still apply.** A retainer worker is not payable per
occurrence — but a job item is *separately-identified additional work*, not the
occurrence. A carpet clean by a retained contractor is genuinely extra and
genuinely payable. So for an item payable the gate is skipped, with the reason
written into the code comment. This is a deliberate, narrow exception and the
second thing worth Mike's eye.

**Everything downstream is unchanged.** `contractor_invoices` still carries a
flat `amount`, `pay_basis` (`'fixed' | 'hourly'`), `pay_hours`, and the GST
snapshot from `resolveContractorGstSnapshot`. Statements, remittance batches and
pay runs group by contractor and sum `amount`
(`src/lib/contractor-statement-build.ts:64`) — they need no change at all.

The payable's `notes` default to the item label, so the remittance advice reads
*"Carpet clean — lounge & hall"* rather than the job's clean type.

### 5. Job costing and margin

`src/lib/job-cost.ts` currently computes labour cost from `job_workers` only, and
is `pay_type`-blind — a known pre-existing defect: a `per_visit` worker is
mis-costed as hours × rate in margin reporting, even though the job detail page
branches correctly at `page.tsx:702-708`.

Two changes, kept separate:

- **In scope:** `getJobLabourCost` gains `+ sumJobItemCosts(items)` so margin
  reflects what is actually paid out. `job-margin.ts` follows automatically.
- **Fix while here:** make `job-cost.ts` honour `pay_type` — `per_visit` costs
  `pay_rate`, `fixed` costs 0 at occurrence level — using the existing
  `src/lib/job-worker-pay-basis.ts` predicates, which is exactly the branch
  `page.tsx:702-708` already does in the view layer. Small, mechanical, removes
  a live mis-costing, and touching this file twice for two reasons would be worse.

---

# Addendum — 2026-09-17, after PR 1/2 merged (#598)

Operator clarification: **the cleaner assigned to the job is often not the
person who does the extra.** A carpet clean is frequently a specialist who was
never on the job roster at all.

The data model already allowed this (`job_items.contractor_id` is independent of
`job_workers`), but the *approval path* did not, and this had been
under-planned.

## The blocker this exposes

`approveContractorPay` refuses any contractor without a `job_workers` row:

```
src/app/portal/contractor-invoices/_actions-approve-pay.ts:94
  if (!jw) return { error: 'This contractor is not assigned to the job.' }
```

Contractor job visibility is gated the same way
(`src/app/contractor/_lib/contractor-job-detail-data.ts:66`). So today a carpet
specialist can neither be paid for the job nor see it.

## Decision: the item authorises its own payable (option A)

An item payable authorises on `job_items.contractor_id` alone. No roster row is
created.

**The rejected alternative** was auto-inserting a `job_workers` row when an item
is assigned. It is cheaper and reuses the existing path, but a roster row carries
`hours_allocated`, and `resplitJobHours`
(`src/app/portal/jobs/[id]/_actions-workers.ts:35-82`) re-splits the job's
allowed hours across *everyone* on the roster. Adding the carpet specialist would
silently cut the actual cleaner's payable hours. That is a money bug, and this
codebase has been bitten by exactly that class of defect before (QUO-0313,
JOB-0289). Two authorisation paths, kept explicit and tested, is the cheaper risk.

## Operator decisions taken

1. **No client-approval gate on an extra.** Staff add it and it bills. The
   operator has already agreed it verbally on site, and the invoice can still be
   corrected before sending. No tickbox, no accept flow.
2. **A non-roster contractor sees the extra only** — label, address, date and
   their own pay. NOT the main clean, NOT the roster, NOT the client charge.
3. **Contractor dropdown is grouped**: the job's assigned workers first under an
   "On this job" heading, then all other contractors, then "No one / in-house".
   The specialist is always one scroll away, never hidden.

## Client-facing rule

The invoice shows the extra as an ordinary line — label and price, placed after
the quoted add-ons. It **never** names the contractor who did it and **never**
exposes `cost_amount`. A unit test pins that `cost_amount` cannot reach a
customer-facing document.

## Revised guard changes (PR 6)

Three narrow changes, each item-scoped, none weakening the job payable:

| Guard | Job payable | Item payable |
|---|---|---|
| Duplicate | one per (job, contractor) — **unchanged** | at most one per item |
| Roster row required | **yes, unchanged** | no — `job_items.contractor_id` authorises |
| Retainer gate | **yes, unchanged** | exempt — an extra is genuinely extra work |

The `job_item_id IS NULL` branch of the duplicate query is what preserves
today's behaviour exactly.

## Revised build order

| PR | Contents | Risk |
|---|---|---|
| 3 | Extras panel on the job page | Low |
| 4 | Quote→job conversion writes `source: 'quote'` items | Medium |
| 5 | `createInvoiceFromJob` appends item lines | Medium — billing |
| 6 | Pay approval: duplicate + roster + retainer guards | **HARD STOP** |
| 7 | Contractor sees their own extra | Low |

PR 7 is new, and falls directly out of option A: without it a specialist is paid
but cannot see what for.

---

## Explicitly out of scope

- Stripe Pay-Now on quotes (decided against, above).
- Adding line items to `quotes`/`invoices` beyond what exists.
- Making `scope_snapshot` editable — it stays append-only by design.
- A `pay_type` selector on `job_workers`. Scenarios A and C are served by giving
  the *item* a set-amount basis, which is where the set amount actually belongs.
  Changing how the main worker is paid for the whole job remains a recurring-
  contract decision.
- Backfilling historical jobs. `job_items` starts empty; every existing job keeps
  behaving exactly as it does today.

## Migration

`docs/superpowers/specs/2026-09-17-job-items.sql` — **Mike-run**, per standing
rule. Creates `job_items`, its constraints, indexes and RLS; adds
`contractor_invoices.job_item_id` and the partial unique index. Purely additive:
no column is dropped, altered or backfilled, so it is safe to apply before the
code deploys.

## Build order

| PR | Contents | Risk |
|---|---|---|
| 1 | Part 1 — `sano-bank-details.ts`, quote + invoice payment block | Low. Ship first, independently. |
| 2 | Migration SQL + `src/lib/job-items.ts` + unit tests | None (no behaviour change until wired) |
| 3 | Job detail Extras panel — create/edit/delete items | Low; new surface, nothing existing reads it |
| 4 | Quote→job conversion writes `source: 'quote'` items | Medium — touches 3 conversion actions |
| 5 | `createInvoiceFromJob` appends item lines | Medium — touches billing |
| 6 | Approve-pay `job_item_id` + guard change + costing fix | **HARD STOP — Mike reviews** |

## Verification

Per `CLAUDE.md` "what done means": `npm test` at the documented 3-failure
baseline, `npx next lint` with zero Error lines, `npx tsc --noEmit` clean, and a
Netlify deploy-preview check before merge.

Manual smoke, scenario by scenario:

- **A** — quote with a carpet add-on → convert to job → item appears marked
  *From quote*, charge greyed → set contractor + set amount → approve → one
  payable for the item, one for the job, both distinct.
- **B** — job with no carpet → add an extra, charge $300, cost $180 → invoice the
  job → invoice total is `job_price + 300` with a discrete carpet line → approve
  the item → a $180 payable named after the item.
- **C** — standalone carpet job with a single item, `job_price` 0 → invoice shows
  the item line → payable is the set amount, not hours × rate.
- **Guard** — approving the same item twice is refused; approving the job itself
  twice is still refused; approving the job and an item on it both succeed.
- **Retainer** — a retained contractor can be paid for a job item but still
  cannot be paid for the occurrence.
