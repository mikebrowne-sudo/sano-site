# Address Autocomplete — Portal Forms

**Date:** 2026-04-18 (revised 2026-04-18 to swap provider from AddressFinder NZ to Mapbox)
**Scope:** NZ address autocomplete on Sano portal customer, quote, and job forms.
**Provider:** Mapbox Geocoding v5 (`/geocoding/v5/mapbox.places`), client-side.
**DB change:** None.

## Problem

Portal forms require users to type full addresses into plain text inputs. This is slow and produces inconsistent formatting. We want a dropdown of NZ address suggestions that, on selection, populates the existing field with a clean formatted string — while still allowing manual edits.

## Non-goals

- No database schema change. Addresses remain single formatted strings.
- No split into structured parts (street / suburb / city / postcode).
- No autocomplete on public site forms, share pages, or contractor-facing forms.

## Design

### Provider

**Mapbox** (`api.mapbox.com/geocoding/v5/mapbox.places`), client-side.

- Env var: `NEXT_PUBLIC_MAPBOX_TOKEN` (public token, URL-restricted in the Mapbox dashboard).
- URL restrictions: `sano.nz`, `*.sano.nz`, `localhost:*`, `*.netlify.app`.
- No npm dependency — the component uses native `fetch`.
- NZ-only bias via `country=nz&language=en` query params.
- If the env var is missing at runtime, the component skips the fetch and behaves as a plain text input — no console errors.

### Component

`src/app/portal/_components/AddressField.tsx`. Drop-in replacement for the local `Field` primitive used by portal forms. Props:

```ts
interface AddressFieldProps {
  label: string
  value: string
  onChange: (next: string) => void
  required?: boolean
  className?: string
  placeholder?: string
  error?: string
}
```

Behaviour:

- As the user types, debounce 200 ms, then call Mapbox with the current query (`?country=nz&language=en&autocomplete=true&limit=5&types=address,place,postcode,locality,neighborhood`).
- Minimum 3 characters before calling.
- Render up to 5 suggestions in an absolute-positioned `<ul>` under the input, Tailwind-styled to match the portal sage palette.
- Keyboard: ArrowDown/ArrowUp move highlight; Enter selects the highlighted result; Escape closes the dropdown.
- Mouse: click on a row selects. `onMouseDown` + `preventDefault` ensures selection fires before the input's blur handler closes the dropdown.
- Clicking outside the component closes the dropdown.
- Manual edit is preserved — the input is an ordinary controlled input; selecting a suggestion just calls `onChange(fullPlaceName)` and closes the dropdown.

### Storage

Selected `place_name` string (e.g. `"123 Queen Street, Auckland 1010, New Zealand"`) is what's passed to the form's existing `onChange`, so it gets stored in the existing columns unchanged: `clients.service_address`, `clients.billing_address`, `quotes.service_address`, `quotes.billing_address`, `jobs.address`.

### Integration points (unchanged from prior version)

| File | Swaps |
|---|---|
| `src/app/portal/clients/_components/ClientForm.tsx` | service + billing |
| `src/app/portal/quotes/new/_components/NewQuoteForm.tsx` | service + billing |
| `src/app/portal/quotes/[id]/_components/EditQuoteForm.tsx` | service |
| `src/app/portal/jobs/_components/JobForm.tsx` | address |

These files import `<AddressField>` and are unaffected by the provider swap.

## Files changed by this revision

- **Modified:** `src/app/portal/_components/AddressField.tsx` — internals rewritten to call Mapbox.
- **Modified:** `src/app/globals.css` — removed the `.af_list` / `.af_item` block (AddressFinder dropdown styling). No replacement block needed; new dropdown is Tailwind-styled inline.
- **Modified:** this spec.

## Env setup

Add one variable in both places (remove the old AddressFinder one):

- `.env.local` (dev): `NEXT_PUBLIC_MAPBOX_TOKEN=pk.<your-public-token>`
- Netlify env vars (production + previews): same.

Create the token at `account.mapbox.com/access-tokens/`. Use the default public scopes (styles:read, fonts:read) plus ensure "Geocoding API" scope is included. Set URL restrictions in the token settings for the domains above.

Remove `NEXT_PUBLIC_ADDRESSFINDER_WIDGET_KEY` from `.env.local` and Netlify — no longer used.

## Testing

1. New client → type "123 queen" in Service address → dropdown appears → pick one → field populates → save → reload → persists.
2. Edit client → autocomplete works on both service and billing.
3. New quote → both addresses autocomplete. Picking a client still pre-fills from the client (no regression).
4. Edit quote → service address autocompletes.
5. New job + Edit job → address autocompletes.
6. Select an address, then manually append ", Unit 2" and save → manual edit preserved.
7. Blank `NEXT_PUBLIC_MAPBOX_TOKEN` locally → field behaves as plain input, no console errors.
8. ArrowDown/ArrowUp + Enter select by keyboard. Escape closes dropdown. Click outside closes.
9. Narrow viewport + touch device → dropdown remains usable.

## Risks

- **Mapbox downtime:** input is a normal text field, typing still works, dropdown just won't appear.
- **Mapbox pricing:** free tier is 100,000 permanent geocoding requests/month. Autocomplete calls count against this. Portal usage is well below the cap.
- **Token exposure:** public tokens are designed for client use; URL restrictions in the dashboard are the security boundary.
