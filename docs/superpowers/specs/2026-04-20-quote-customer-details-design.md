# Quote customer details visibility — Design

**Date:** 2026-04-20
**Status:** Approved, ready for implementation plan

## Purpose

Make customer contact details (name, phone, email, service address) visible from within the portal's quotes UI, without having to open the underlying edit form or cross-reference the clients table.

Two surfaces are in scope:

1. **Quotes list** (`/portal/quotes`) — quick scan for address only
2. **Quote detail** (`/portal/quotes/[id]`) — full contact block

## Background

Today the quotes list page shows Quote #, Client name, Status, Issued, Valid until, Total. The detail page shows a heading row (quote number + action buttons) and then drops straight into the editable `EditQuoteForm`. To see the customer's phone or address, the user has to scroll through the edit form.

Quotes already store `service_address` on the row itself. The linked `clients` table already has `name`, `phone`, `email`. No schema changes needed.

## Scope

### In scope

- List page: new **Address** column, truncated to one line, with native-browser tooltip on hover showing the full address.
- Detail page: new read-only **Customer** card above `EditQuoteForm`, showing name, phone (click-to-call), email (mailto), and full service address.
- Data fetches in both page server components extended to include the additional fields.

### Out of scope

- No new editable UI. `EditQuoteForm` remains the only place these fields are edited.
- No status-based gating. The customer card renders on every quote regardless of status (draft, sent, accepted, declined).
- No list-page phone/email columns (deliberately omitted to keep the list scannable).
- No changes to the public share/print pages.
- No schema migration.

## Design

### List page

Add one column between **Client** and **Status**:

| Quote # | Client | Address | Status | Issued | Valid until | Total |

- Column is `max-w-[180px]` and uses Tailwind `truncate` so overflow clips with ellipsis.
- Wrapped in a `<span title={fullAddress}>` so the native browser tooltip reveals the full address on hover (approx. 0.5–1s delay, browser-controlled — close enough to the requested "1 second" without a custom component).
- If `service_address` is null/empty, render a muted em-dash (`—`) and omit the `title` attribute.

Mobile card view (`md:hidden`): append a single truncated line showing the address beneath the client name, same fallback behaviour. No tooltip on mobile (no hover); tapping the row opens the detail page where the full address is visible.

Data fetch change: add `service_address` to the `quotes` select on `src/app/portal/quotes/page.tsx`.

### Detail page

Insert a **Customer** card directly below the existing heading/actions row and above `<EditQuoteForm />`.

```
┌────────────────────────────────────────────────────────────┐
│  Customer                                                  │
│                                                            │
│  Name                       Phone                          │
│  Sarah Smith                021 123 4567                   │
│                                                            │
│  Email                      Service address                │
│  sarah@example.com          12 Oak Road, Grey Lynn 1021    │
└────────────────────────────────────────────────────────────┘
```

- 2×2 grid on `md+`, single column on mobile.
- Phone renders inside `<a href="tel:…">`; email inside `<a href="mailto:…">`.
- Missing values show a muted `—`.
- Styling matches existing portal cards: white background, `sage-100` border, rounded-xl, padded.
- Card does not include editable inputs. All four fields remain editable via `EditQuoteForm`.

Data fetch changes on `src/app/portal/quotes/[id]/page.tsx`: extend the `currentClient` select to include `phone` (currently selects `name, email`).

### New component

`src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx`

Props:
```ts
{
  name: string | null
  phone: string | null
  email: string | null
  serviceAddress: string | null
}
```

Pure presentational, no state, no effects. Renders the card as described above. Exposes one named export `QuoteCustomerDetails`.

## Data flow

- **List page** → single Supabase query already in place. Add `service_address` to the top-level `quotes` select. Row mapping in `page.tsx` gets one more field (`address`) which is passed to both the desktop `<td>` and the mobile card.
- **Detail page** → three parallel queries already in place. Extend `currentClient` select (`name, email`) → (`name, email, phone`). Pass the four resolved values as props to `<QuoteCustomerDetails />`.

## Edge cases

| Case | Behaviour |
|---|---|
| Client has no phone | Show `—`, no `tel:` link |
| Client has no email | Show `—`, no `mailto:` link |
| Quote has no `service_address` | Show `—` on detail card; on list page, cell shows `—` with no tooltip |
| Legacy quote with no linked client | Name/phone/email all show `—`; address still renders if present on the quote row |
| Extremely long address | List cell truncates with ellipsis, full text available via tooltip; detail card wraps naturally |

## Accessibility

- `tel:` and `mailto:` anchors are focusable by default and announce as links.
- Native `title` attribute is announced by screen readers on focus of the truncated cell.
- Colour contrast follows existing sage palette (`sage-800` body, `sage-500` muted) already used elsewhere in the portal.

## Testing

- Jest tests are not added for this change. The new component is purely presentational with no conditional logic beyond null-coalescing; the cost of setting up a test renderer for it outweighs the value.
- Manual verification checklist for the implementation plan:
  - List: address column renders with ellipsis on long values
  - List: hovering for ~1s shows full address in native tooltip
  - List: rows with null `service_address` render `—`
  - Detail: customer card shows all four fields when populated
  - Detail: `tel:` and `mailto:` links work (open dialler / mail client)
  - Detail: missing phone/email render `—` without a broken link
  - Mobile list view: address line appears under client name

## Files touched

- `src/app/portal/quotes/page.tsx` — extend select, add Address column, add mobile address line
- `src/app/portal/quotes/[id]/page.tsx` — extend `currentClient` select, render new component
- `src/app/portal/quotes/[id]/_components/QuoteCustomerDetails.tsx` — **new**, pure presentational

No schema migration. No dependency changes.

## Release

Single commit on `main`, auto-deployed via Netlify. No feature flag needed — the change is additive and read-only.
