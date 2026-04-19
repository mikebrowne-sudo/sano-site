# Manual Price Override — Design

**Status:** Approved 2026-04-20
**Owner:** Mike Browne
**Scope:** Quote form (New + Edit). Invoice receives an audit snapshot at conversion time only.

## Goal

Replace the current implicit "type a different number into PricingSummary" override path with a single, explicit, fully-audited manual override flow. The override exists to record *who* deviated from the engine's calculated price, *what* the deviation was, and *why* — at the time it was confirmed.

This is a pricing decision record, not a pricing convenience. Every override carries: original calculated price, override price, reason, confirmation flag, confirming user, and confirmation timestamp.

## Behavioural Decisions (locked)

These were agreed during brainstorming on 2026-04-20:

1. **Single override path.** The existing implicit override (editable final-price input + "Revert to calculated" button inside `PricingSummary`) is removed. The new explicit toggle is the only way to override.
2. **Discount is bypassed when override is on.** `final_price = override_price`. The discount field stays visible but is greyed out and disabled with the note *"Discount doesn't apply to overridden prices"*.
3. **Override locking inherits existing pricing lock.** When the existing PricingSummary lock is active (currently: quote status `sent` or `accepted`), the override panel inherits that same lock. No separate lock rule.
4. **Invoice receives an audit snapshot.** The seven override columns are mirrored on `invoices` and copied verbatim from the quote at `convertToInvoice` time. The invoice has no override editing UI; the fields are write-once at conversion and read-only thereafter.
5. **Final price always visible at top of pricing section.** Stable form layout — order does not reflow when override is toggled.
6. **PricingSummary stays visible when override is on**, in a muted/read-only state. Calculated price and breakdown remain accessible so staff can compare while overriding.
7. **Override applies universally.** For services where the engine cannot calculate (currently shown as a bare manual "Base price ($)" field), the override toggle is pre-checked and locked-on, with the price/reason/confirmation panel always visible. Every manually-set price gets the same audit trail.
8. **Audit fields included.** `override_confirmed_by` (uuid → `auth.users`) and `override_confirmed_at` (timestamptz) are added beyond the spec's five fields. Without them the audit trail is incomplete (general `updated_at` reflects any later edit, not the override decision).
9. **Toggling override off in the UI does not clear the override input values.** Inputs persist in form state so the user can flip the toggle without losing what they typed. Reset-on-save is not implemented — on save with the toggle off, `is_price_overridden = false` is persisted and consumers ignore the other override fields, but those fields are not nulled.

## Architecture

```
+-------------------------------------+
|  NewQuoteForm.tsx / EditQuoteForm   |
|                                     |
|  +-- final-price banner             |
|  +-- <PricingSummary />  (display)  |
|  +-- discount field                 |
|  +-- <OverridePanel />  (NEW)       |
|       |                             |
|       +-- toggle                    |
|       +-- (revealed when on)        |
|            custom price             |
|            reason                   |
|            confirmation             |
|            warning text             |
+-------------------------------------+
              |
              v  (on submit)
+-------------------------------------+
|  createQuote / updateQuote          |
|  - server-side validation           |
|  - persist override fields          |
+-------------------------------------+
              |
              v  (on convertToInvoice)
+-------------------------------------+
|  invoice row (audit snapshot)       |
+-------------------------------------+
```

**Pricing engine (`calculateQuotePrice`) is not modified.** The engine's existing optional `override` parameter is no longer called from the form. Final price is computed at the form level:

```
final_price = is_price_overridden
  ? override_price
  : engineResult.final_price   // engine handles discount internally
```

This split keeps the engine purely about "what the system says the price should be" and makes override an explicit human decision layered on top.

## Files

### New
- `src/app/portal/quotes/_components/OverridePanel.tsx`
- `docs/db/2026-04-20-add-price-override.sql`

### Modified
- `src/app/portal/quotes/_components/PricingSummary.tsx` — remove editable final-price input and "Revert to calculated" button. Component becomes display-only: shows calculated price, mode buttons (interactive when not overridden), expandable breakdown.
- `src/app/portal/quotes/new/_components/NewQuoteForm.tsx` — slot OverridePanel under discount; add final-price banner; mute PricingSummary + grey discount when override on.
- `src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx` — same as above, plus hydrate override fields from saved quote.
- `src/app/portal/quotes/new/_actions.ts` — accept and persist new fields; server-side validation.
- `src/app/portal/quotes/[id]/_actions.ts` — same as above.
- `src/app/portal/quotes/[id]/_actions-invoice.ts` — copy seven override fields from quote to invoice on `convertToInvoice`.
- `src/app/portal/invoices/[id]/page.tsx` — render override audit block when `is_price_overridden = true`.

## Schema Changes

Mirrored on `quotes` and `invoices`:

| Column | Type | Default | Notes |
|---|---|---|---|
| `is_price_overridden` | `boolean` | `false` | NOT NULL |
| `override_price` | `decimal(10,2)` | NULL | Final price when overridden |
| `override_reason` | `text` | NULL | Required when override on |
| `override_confirmed` | `boolean` | `false` | NOT NULL; required true when override on |
| `override_confirmed_by` | `uuid` | NULL | FK → `auth.users(id)` |
| `override_confirmed_at` | `timestamptz` | NULL | Set on save when confirmed |
| `calculated_price` | `decimal(10,2)` | NULL | Engine output snapshot, preserved verbatim |

Deployment: SQL written to `docs/db/2026-04-20-add-price-override.sql`. Mike runs it manually via the Supabase dashboard SQL editor (matches existing repo convention; no migrations folder to set up).

## Form Layout

Order is stable regardless of override state:

```
[ Pricing section header ]
[ Final price banner ]               <- always visible, large
  (when override on: "Manual override applied" sub-label)
[ PricingSummary ]                   <- muted/read-only when override on
[ Discount field ]                   <- disabled+greyed when override on
[ Override toggle ]                  <- "Override price manually"
  (when on, panel reveals below):
    Custom price ($)
    Reason for override
    Confirmation checkbox
    Warning: "This price bypasses the pricing engine and may affect margins"
[ GST checkbox, payment type, etc. — unchanged ]
```

For ineligible services: the bare "Base price ($)" field is replaced by the OverridePanel pre-checked and locked-on. PricingSummary is not shown.

## Validation

Matches the existing imperative client-side pattern (no Zod, no react-hook-form). Errors render inline via the existing `Field` component's `error` prop.

**When `is_price_overridden = true`, all three must hold (otherwise prevent submit and show inline errors):**
- `override_price > 0`
- `override_reason` non-empty (after trim)
- `override_confirmed === true`

**Server-side validation (in `createQuote` / `updateQuote`):** repeat the same three checks. The existing actions don't validate — but accountability data should not be trustable from the client alone. If any check fails server-side, return an error without persisting.

## Lifecycle Rules

| Event | Effect |
|---|---|
| Toggle on (UI) | Reveal panel; pre-fill custom price with current `calculated_price` (or empty if no calculation); reason and confirmation start empty/unchecked. |
| Toggle off (UI) | Hide panel; **do not clear** input values (preserves UX if user re-toggles). Final price reverts to engine result. |
| Save with toggle on | Persist all seven fields. Set `override_confirmed_by = current user` and `override_confirmed_at = now()`. |
| Save with toggle off | Persist `is_price_overridden = false`. Other six fields are not actively cleared (no reset-on-save). Consumers must check the boolean before reading the other fields. |
| Convert to invoice | Copy all seven fields verbatim from quote to new invoice row. Independent thereafter — later edits to the quote do not propagate. |
| Quote status becomes `sent` or `accepted` | OverridePanel inherits the existing PricingSummary lock — entire panel becomes read-only. |

## Discount Behaviour

- Discount field's value is preserved across override toggle cycles. Toggling override on disables and greys the discount input but does not clear its value. Toggling override off re-enables the discount, and the previously-entered value applies again.
- This must be covered by a behavioural test (see Testing section).

## Testing

**New tests:**
1. **OverridePanel unit tests** — toggle reveals/hides fields; validation triggers on missing required fields when toggle is on; toggle-off does not clear inputs.
2. **Form-level final-price computation** — `is_price_overridden = true` → `final_price = override_price`; `false` → `final_price = engineResult.final_price` (after discount).
3. **Discount preservation through override cycle** — enter discount $X → toggle override on → confirm discount is ignored (final = override price) → toggle override off → confirm discount value $X is intact and applies again.
4. **Server action validation** — `createQuote` / `updateQuote` reject submissions where override is on but reason is empty / confirmation is false / price ≤ 0.
5. **Conversion snapshot** — `convertToInvoice` copies all seven override fields onto the new invoice row.
6. **Lock inheritance** — when quote status is `sent` or `accepted`, OverridePanel cannot be edited (matches PricingSummary lock).

**Unchanged:** existing pricing engine tests (`src/lib/__tests__/quote-pricing.test.ts`). The engine itself is not modified.

## Invoice Display

Read-only audit block on the invoice detail page, shown only when `is_price_overridden = true`:

> **Manual override applied**
> Original calculated price: $X
> Final invoiced price: $Y
> Reason: [override_reason]
> Confirmed by [user display name] on [override_confirmed_at, formatted]

Framing: this is an audit snapshot from the source quote at conversion time — not invoice-native override state. There is no UI on the invoice to edit these fields.

## Out of Scope

- Migration system / `supabase/migrations/` folder setup. Schema deploys via dashboard, matching current convention.
- Removing the engine's existing `override` parameter or its tests. Engine stays as-is; the parameter just goes unused by the form.
- Admin-only restrictions on override (any staff can override, per existing permission model).
- Any change to invoice editability — invoices remain read-only.
- Reset-on-save semantics for override fields when toggle is off.

## Open Risks

- **Two persisted records of pricing** (quote + invoice) means the two could drift if anyone bypasses the convertToInvoice path to edit either directly. Mitigation: no UI to edit override fields on invoices.
- **Server-side validation is new** — adds a defensive check to actions that previously trusted the client. Worth manually testing both happy and rejection paths.
