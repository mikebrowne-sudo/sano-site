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

## Most recent shipped phase
**Phase J - Quote & Invoice PDF** (per [`docs/PORTAL.md`](../PORTAL.md) "Phase J - Quote & Invoice PDF"). 5 server-rendered PDF routes share `src/lib/pdf/render-pdf.ts` (`puppeteer-core` + `@sparticuz/chromium`). Send Quote / Send Invoice emails auto-attach the share-page PDF with a fail-fast contract. Branch-shipped on `feat/quote-invoice-pdf`.

## Verification status
- `npm test` baseline: 3 failing suites (`submit-application`, `services`, `Header`) - pre-existing, leave alone.
- `npx next lint` should be clean (Errors fail Netlify builds).
- `npx tsc --noEmit` should be clean.
- Manual smoke per Phase J spec recommended before merge.

## Known caveats
- Do **NOT** set `PUPPETEER_EXECUTABLE_PATH` in Netlify production env. Local `.env.local` only.
- `docs/compliance/` and `docs/AI/New Text Document.txt` are untracked operational scratch - never `git add`.

## How to update this doc
- Append-style entries are fine but keep the "Live in production today" list short and accurate.
- Update **Last verified** to the date of the last successful Netlify production deploy you confirmed.
- Move retired phases to `docs/PORTAL.md` (long-form history) and remove them from this doc.
