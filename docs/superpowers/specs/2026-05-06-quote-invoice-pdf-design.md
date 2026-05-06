# Quote & Invoice PDF — Design

**Date:** 2026-05-06
**Status:** Approved (pending implementation plan)
**Scope:** Server-rendered PDF download for residential quotes and invoices, plus auto-attach to the existing Send Quote / Send Invoice emails.

---

## Goal

Give Sano staff a one-click "Download PDF" of any residential quote or invoice from the portal, give customers the same on the public share page, and attach that PDF to the operator-triggered "Send" email so customers receive the document inline rather than only a link.

## Non-goals

- Commercial quotes — they already have a working PDF download via `/api/proposals/[id]/pdf` (the multi-page proposal pack). This design does not touch that route.
- Renaming the existing proposal PDF filename (currently `proposal-QT-xxxx.pdf`). A future round can harmonise to `Sano Proposal - QT-xxxx.pdf`.
- Background-function migration for slow Puppeteer renders — out of scope until volume actually hits the Netlify Function timeout.
- Caching rendered PDFs — every request re-renders. The volume is operator-driven, not customer-traffic-driven, so caching is not worth the invalidation logic.

## Why

1. The customer's "print to PDF via the share link" path produces a file titled "Sano Cleaning — Professional Cleaning in Auckland.pdf" with a Chrome-injected date/time header and URL footer on every page. That string is the global site title (`src/app/layout.tsx:6`); none of the print/share pages override `<title>`. Result: an unprofessional artefact going to clients.
2. There's no way for staff to pull a PDF off a quote or invoice from the portal at all. The only "PDF" today is a Print/PDF link that opens the print page in a new tab and relies on the user using their browser's print-to-PDF dialog.
3. When operators want to email a quote or invoice with the document attached, they have to do it manually outside the portal.

## Approach

Mirror the existing `/api/proposals/[id]/pdf` pattern (`puppeteer-core` + `@sparticuz/chromium`, navigate Puppeteer to a print/share page, capture, return as `application/pdf`). Extract the boot-navigate-capture plumbing into a single shared helper used by all PDF routes and by the send-email server actions.

Two new pairs of routes:

| Route | Auth | Puppeteer navigates to | Filename |
|---|---|---|---|
| `GET /api/quotes/[id]/pdf` | Staff session (cookie-forwarded) | `/portal/quotes/[id]/print` | `Sano Quote - {quote_number}.pdf` |
| `GET /api/invoices/[id]/pdf` | Staff session (cookie-forwarded) | `/portal/invoices/[id]/print` | `Sano Tax Invoice - {invoice_number}.pdf` |
| `GET /api/share/quote/[token]/pdf` | Public (token in URL) | `/share/quote/[token]?pdf=1` | `Sano Quote - {quote_number}.pdf` |
| `GET /api/share/invoice/[token]/pdf` | Public (token in URL) | `/share/invoice/[token]?pdf=1` | `Sano Tax Invoice - {invoice_number}.pdf` |

Why route-per-noun-and-context (staff vs share):
- Different auth models — splitting them avoids conditional auth logic in one handler.
- The staff print page shows quote-level contact-override fields (Attn / accounts contact) that the customer-facing share page omits. Two render targets preserve that distinction.

The existing `/api/proposals/[id]/pdf` is refactored to use the same shared helper — net code reduction.

### Commercial quote guard

`/api/quotes/[id]/pdf` returns 400 if `service_category === 'commercial'`, with a JSON body pointing at `/api/proposals/[id]/pdf`. The Download-PDF button on the quote page already branches by category, so this is a safety net.

## Title & filename

Both `<title>` (set via Next `generateMetadata`) and the HTTP `Content-Disposition` filename use the same template:

| Page | Title / filename stem |
|---|---|
| `/portal/quotes/[id]/print` and `/share/quote/[token]` | `Sano Quote - {quote_number}` |
| `/portal/invoices/[id]/print` and `/share/invoice/[token]` | `Sano Tax Invoice - {invoice_number}` |

Why both `Quote` and `Tax Invoice`:
- Invoices say "TAX INVOICE" prominently in the document body and that's what NZ clients expect for GST credits.
- Quotes have no equivalent legal designation — plain "Sano Quote" is correct.

These pages currently set `metadata: { robots: 'noindex, nofollow' }` as a static export. We change to async `generateMetadata` so the title can include the live quote/invoice number; the noindex directive is preserved.

`Content-Disposition` form (sets both `filename` and the RFC-5987 `filename*`):

```
Content-Disposition: attachment;
  filename="Sano Quote - QT-1234.pdf";
  filename*=UTF-8''Sano%20Quote%20-%20QT-1234.pdf
```

Belt-and-braces — Safari, Firefox, Chrome all preserve the spaces and the en-dash-style hyphen consistently with both forms present.

### Filename sanitiser

A single helper `sanitizePdfFilename(stem: string): string`:
- Replaces every character outside `[A-Za-z0-9 .\-_]` (including ASCII control chars) with `_`.
- Collapses runs of whitespace to a single space.
- Trims leading / trailing whitespace.
- If the resulting stem is empty, falls back to `Sano Document`.
- Result, after the `.pdf` suffix is appended, always matches `/^[A-Za-z0-9 .\-_]+\.pdf$/`.

## `?pdf=1` mode on share pages

When `pdf=1` is present in the query string on `/share/quote/[token]` or `/share/invoice/[token]`:

1. Hide the `<AcceptQuote>` panel (quotes) or `<PayNowButton>` panel (invoices) — these are interactive and have no place in a static PDF.
2. Skip the `<AutoPrint>` mount entirely. Even if `?print=1` is somehow combined, `pdf=1` wins.
3. **Skip the status side-effect on the quote share page.** That page promotes `sent → viewed` and writes an audit row when opened by the customer. A Puppeteer render is not a real customer view, so the promote and audit insert are short-circuited when `pdf=1`. Without this guard, every staff-triggered PDF download or email-attach render would falsely promote a `sent` quote to `viewed`.

Belt-and-braces: Puppeteer also calls `page.emulateMediaType('print')` so even if a future component forgets to honour the `pdf=1` flag, the existing `@media print { display: none }` rules still hide it.

## Shared renderer

```
renderPdfFromUrl(targetUrl: string, opts: {
  cookies?: { name: string; value: string; domain: string; path: string }[]
  filename: string
}) → Promise<{ buffer: Buffer; filename: string }>
```

Responsibilities:
- Boot Puppeteer (Lambda binary in prod via `@sparticuz/chromium`; system Chrome in dev via `PUPPETEER_EXECUTABLE_PATH`).
- Inject cookies before first navigation when provided (staff routes).
- `page.emulateMediaType('print')`.
- `page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30_000 })`.
- `page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: 0 })`.
- Always close the browser in a `finally` block.

Used by:
- All four new API routes (returns the buffer as HTTP body).
- The Send-Quote and Send-Invoice server actions (returns the buffer for Resend's `attachments` field).
- The existing `/api/proposals/[id]/pdf` route (refactored).

## Buttons & UI surfaces

### Portal detail pages

Both buttons live side by side, mirroring the existing commercial-quote pattern of "Preview Proposal" + "Download PDF":

- `/portal/quotes/[id]` (residential):
  - **Preview Quote** — opens `/portal/quotes/[id]/print` in a new tab (existing behaviour).
  - **Download PDF** — new — hits `/api/quotes/[id]/pdf`, browser saves the file.
- `/portal/invoices/[id]`:
  - **Print / PDF** → renamed to **Preview Invoice** for consistency.
  - **Download PDF** — new — hits `/api/invoices/[id]/pdf`.

### Customer share pages

- `/share/quote/[token]` and `/share/invoice/[token]`: a prominent "Download PDF" button that hits the share-route PDF endpoint. The existing `?print=1` auto-print flow (used by some dashboard "PDF" buttons) is kept for backwards compatibility but is no longer the recommended customer path — the Download PDF button is.

## Email auto-attach

The existing Send Quote / Send Invoice server actions are extended:

1. Operator clicks **Send Quote** / **Send Invoice**.
2. Server action: render share-page PDF in-memory via `renderPdfFromUrl('/share/quote/{token}?pdf=1', { filename: '...' })`.
3. Resend `send()` with `attachments: [{ filename: 'Sano Quote - QT-1234.pdf', content: buffer }]`.
4. On success, flip status `draft → sent` and write the audit row.
5. UI shows the success state.

Which PDF gets attached: the **share-page** PDF, not the staff print page. Reasoning: that's the customer's deliverable — same render the customer would get if they hit the share link's Download button. No internal contact-override fields. Email body and attachment match.

### Fail-fast policy

If any step of the renderer or Resend call throws:
- The email is not sent.
- The status flip does not happen.
- No audit row is written.
- The operator sees a clear error, e.g.:
  > "PDF generation failed, so the email was not sent. Please try again."

This matches the operator's mental model: a half-sent state (status flipped but no email out, or email sent without attachment when an attachment was expected) is worse than no-send. The operator can retry once the cause is fixed.

### Latency

Cold-start Puppeteer on Netlify Functions runs ~10-30 s. The Send button must show a loading state. Verify during implementation that the existing Send button already disables and shows a "Sending..." indicator; if it doesn't, add one. If we observe regular hits to Netlify's 26 s function-timeout cliff, the follow-up is to push send into a Netlify Background Function — but that's a "if it actually happens" phase, not part of this spec.

### Send-on-resend

Every send attaches a freshly rendered PDF. No caching. The customer always receives the current state of the quote / invoice as of the moment of send.

## Print-page layout for multi-page output

The current quote and invoice print CSS has no `break-inside: avoid` rules. A long quote (many add-ons, long generated-scope prose) will currently break awkwardly across pages in a server-rendered PDF. The implementation adds to both stylesheets:

```css
.print-section,
.print-pricing,
.print-totals-box,
.print-terms-section,
.print-addresses { break-inside: avoid; page-break-inside: avoid; }
.print-pricing tr { break-inside: avoid; }
```

`-webkit-print-color-adjust: exact` and `print-color-adjust: exact` are already present on the page roots; no change there.

## Errors & edge cases

| Caller | Route | Behaviour |
|---|---|---|
| Unauthenticated → staff route | `/api/quotes/[id]/pdf`, `/api/invoices/[id]/pdf` | 401 |
| Staff → soft-deleted quote/invoice (`deleted_at IS NOT NULL`) | staff route | 404 |
| Staff → wrong category (commercial quote) | `/api/quotes/[id]/pdf` | 400 with body `{ "error": "Use /api/proposals/[id]/pdf for commercial quotes" }` |
| Public → unknown token | share route | 404 |
| Public → token matches soft-deleted record | share route | 404 (matches existing share-page behaviour) |
| Puppeteer launch fails | any route | 500 with sanitised error message |
| `page.goto` returns non-2xx | any route | 502 (`"Print route returned {status}"`) |
| Render exceeds `maxDuration = 60` s | any route | function timeout — 502/504 from Netlify |

The send-action wrapper catches all of the above as thrown errors → operator-visible message → no status flip, no email, no audit row.

## Concurrency caveat

Puppeteer launches a Chromium per invocation. Netlify Function memory is ~1 GB; two concurrent calls fit, three may OOM. The proposal route already lives with this limit. Out of scope to optimise now — the volume is operator-driven, not customer-traffic-driven. If volume rises, the fix is a queue or a warm Chromium pool, follow-up phase.

## PORTAL.md update

Add a "Phase J — Quote & Invoice PDF" section under "Current system status" with five sub-points:

1. Staff PDF routes for residential quotes and invoices.
2. Public share-route PDFs for both.
3. Share-page `?pdf=1` mode that hides interactive panels and skips the `sent → viewed` side-effect.
4. Email auto-attach with fail-fast send behaviour.
5. Title and filename normalised to `Sano Quote - QT-xxxx` and `Sano Tax Invoice - INV-xxxx`.

Update the "Current Active Work" pointer accordingly.

## Testing

**Unit**
- `sanitizePdfFilename` — covers spaces, hyphens, unicode, control chars, empty strings, long strings.

**Integration (route)**
- 401 on unauthenticated staff routes.
- 400 on commercial-quote PDF route, with the redirect message in the body.
- 404 on unknown / soft-deleted records (both staff and share).
- 200 happy path: response is `application/pdf`, `Content-Disposition` contains both `filename="Sano Quote - QT-xxxx.pdf"` and the matching `filename*=UTF-8''...` form.
- The `?pdf=1` flag on the share page does not flip status from `sent → viewed` and does not insert an audit row.

**Send-action**
- Mock `renderPdfFromUrl` and Resend.
- Happy path: attachment passed to Resend has filename `Sano Quote - QT-xxxx.pdf` (assert exact filename) or `Sano Tax Invoice - INV-xxxx.pdf`; status flipped; audit row written.
- Render-failure path: throws before Resend is called; status stays `draft`; no audit row; operator-visible error message contains the "PDF generation failed, so the email was not sent. Please try again." string.

**Manual smoke (documented in PR)**
- Render a residential quote PDF in local dev, render an invoice PDF, eyeball both for layout (no awkward page breaks, no Chrome chrome).
- Send a test quote email and a test invoice email to a real inbox; confirm the attachment opens cleanly, filename is correct, and content matches the share-page render byte-for-character.
- Open `/share/quote/{token}?pdf=1` in a browser → confirm `<AcceptQuote>` is hidden, no status flip, no audit row.

## Local dev requirement

Set `PUPPETEER_EXECUTABLE_PATH` in `.env.local` to the local Chrome binary, e.g.:

```
PUPPETEER_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

Without this, all four new routes and the send-actions will fail on Windows / macOS in dev with the same `@sparticuz/chromium` Lambda-binary error already documented for the proposal route. Production (Netlify Functions) needs no setup — `@sparticuz/chromium` ships the binary.

## Open follow-ups (not in this scope)

- Harmonise the proposal PDF filename to `Sano Proposal - QT-xxxx.pdf`.
- Move PDF-rendering Send actions to a Netlify Background Function if cold-start latency starts hitting the function timeout.
- Customer-traffic concurrency control once volume rises.
