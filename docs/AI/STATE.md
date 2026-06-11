# Sano - Current State

> Short, current. The deep history lives in [`docs/PORTAL.md`](../PORTAL.md). Update this after each Netlify-verified deploy.

**Last verified:** 2026-05-19 (homepage hero hierarchy locked in — PR #155 + #156 merged and confirmed live on sano.nz by polling served HTML.)

## Live in production today
- Marketing site (homepage, services, about, contact, FAQ). Homepage hero now uses real Sano residential photography (Herne Bay) with a softened sage gradient (`0.88 / 0.72 / 0.38 / 0.06`), inline icon trust row (`Insured · Vetted teams · Auckland wide · Satisfaction guarantee`), and a soft white card-style service chip row (`Homes · Offices · Rentals · End of tenancy`).
- Portal CRM (`/portal`) - quotes, invoices, jobs, clients, people, payroll, settings.
- Contractor mobile views (`/contractor`).
- Public share routes (`/share/quote/[token]`, `/share/invoice/[token]`).
- Stripe-powered Pay-Now button on share-page invoices.
- Twilio SMS notifications (Phase H).
- Mapbox NZ-biased address autocomplete.
- Mike's email signature preview routes on the Sano domain: `/email-signature` (Sano default), `/email-signature-michael` (Sano/Michael), `/email-signature-mammoth` (Mammoth Full — badges + live HTML Take-Back), `/email-signature-mammoth-a` (Mammoth slim, no Take-Back), `/email-signature-mammoth-b` (Mammoth slim + Take-Back). Mammoth banner assets hosted under `public/email/`. PRs #196 / #197 / #198.

## Most recent shipped phase
**Phase J - Quote & Invoice PDF** (per [`docs/PORTAL.md`](../PORTAL.md) "Phase J - Quote & Invoice PDF"). 5 server-rendered PDF routes share `src/lib/pdf/render-pdf.ts` (`puppeteer-core` + `@sparticuz/chromium`). Send Quote / Send Invoice emails auto-attach the share-page PDF with a fail-fast contract. Branch-shipped on `feat/quote-invoice-pdf`.

**Quote / Tax Invoice document redesign** - PR [#180](https://github.com/mikebrowne-sudo/sano-site/pull/180) merged 2026-05-25 (`66fb318`). Shared document family under `src/components/document/` (`QuoteInvoiceCss.ts`, `DocumentLayout.tsx`, `QuoteDocument.tsx`, `InvoiceDocument.tsx`) consumed by all 4 staff-print + share-page surfaces. Pinned to the bundled standalone HTML at `F:\Sano\30-Accounting\Templates\Examples\Sano Invoice _ Quote _standalone_.html` (BRAND.md §8): Poppins + Noto Serif, flat sage-800 header with 56px logo + 34px serif `Quote.` / `Invoice.`, `Service address` / `Service description` sub-blocks in the line item, `0800 726 686` footer, `Quote #` / `Invoice #` header label, render-side `due_date` fallback via `computeInvoiceDueDate`. Awaiting production smoke (open print + share + PDF on both kinds; verify A4 portrait, no clipping, due-date matches terms wording per `payment_type`).

## Verification status
- `npm test` baseline: 3 failing suites (`submit-application`, `services`, `Header`) - pre-existing, leave alone.
- `npx next lint` should be clean (Errors fail Netlify builds).
- `npx tsc --noEmit` should be clean.
- Manual smoke per Phase J spec recommended before merge.

## Known caveats
- Do **NOT** set `PUPPETEER_EXECUTABLE_PATH` in Netlify production env. Local `.env.local` only.
- `docs/compliance/` and `docs/AI/New Text Document.txt` are untracked operational scratch - never `git add`.
- **Production outage 2026-05-31 04:05–04:29 UTC** — every Next.js-handled route (including `/favicon.ico`) returned plain-text `Internal Server Error` while static files served fine. Rollback to a prior known-good SHA did NOT fix it; a fresh redeploy of the same source DID. Strong evidence: bad Netlify function bundle / artifact corruption, not a code regression. **Recovery rule: when symptoms match (dynamic routes 500, static files 200, no `X-Powered-By: Next.js`), Netlify dashboard → Deploys → Trigger deploy → "Clear cache and deploy site" BEFORE attempting a source rollback.** Prevention items queued in [`NEXT.md`](./NEXT.md).

## How to update this doc
- Append-style entries are fine but keep the "Live in production today" list short and accurate.
- Update **Last verified** to the date of the last successful Netlify production deploy you confirmed.
- Move retired phases to `docs/PORTAL.md` (long-form history) and remove them from this doc.
