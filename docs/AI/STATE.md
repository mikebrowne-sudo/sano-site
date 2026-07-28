# Sano - Current State

> Short, current. The deep history lives in [`docs/PORTAL.md`](../PORTAL.md). Update this after each Netlify-verified deploy.

**Last verified:** 2026-07-04 (production on `55ce5c4` = PR #315 merge; Netlify deploy `ready` + live checks: wave-4 pages returning 200 with FAQPage schema, e.g. `/service-area/takanini`, `/service-area/westgate`.)

## Live in production today

### Public site
- Marketing site (homepage, services, about, contact, FAQ, guarantee, policies, join-our-team).
- Cleaning-standards system: 100-point home clean + 125-point property reset checklists, homepage signature-system block, differentiated service pages with subpage heroes and standardised bodies (PRs #150–#179).
- **42 suburb pages** under `/service-area/*`, all on `SuburbLandingTemplate` with per-suburb geo Place schema (PR #311) + visible FAQ mirrored in FAQPage rich-result schema (PR #312). The 14 legacy hand-built pages were migrated (parity sweep, PR #314, copy preserved verbatim); wave 4 added Glenfield, Northcote, Avondale, Massey, Westgate, Papatoetoe, Takanini, Panmure (PR #315, planner-briefed, Mike-confirmed property-stock claims, thin-content-guarded).
- SEO technical wins (#306) + internal-linking pass (#307); GA4 site analytics (#281/#284).
- About page rebuilt (#295–#299); banners/eyebrow trust rows (#294/#296); who-we-work-with (#297).
- Email signature preview routes: `/email-signature`, `/email-signature-michael`, `/email-signature-mammoth{,-a,-b}` (PRs #196–#198).

### Portal CRM (`/portal`)
- Core: quotes, invoices, jobs, clients, people, payroll, settings. Unified document numbering (#232). Global search (#304) + command palette (#305). Accountant read access (#287). Carol admin (#207).
- Finance suite (shipped 2026-06-23/24): expenses v1 (#269) + vendor prefill (#270), P&L (#271), ASB bank CSV import persisted to `bank_transactions` (#273/#274/#276), reconciliation with drag-drop + match assistant + likely-bundle status (#275/#278–#280), portal analytics dashboard (#283/#285).
- Contractor pay pipeline: allowed-hours labour model (#208), approve pay (#241–#243), pay runs + remittance advice with server PDF + send email (#216, #223–#230), fixed contractor payments (#267), pay status in contractor portal (#252). Legacy pay screens retired (#251/#254).
- Editing suite: sensitive-edit foundation + audit (#246), edit invoice details/line items (#245/#247), edit contractor payables (#248), remittance manual edit (#303), quote lock-on-sent (#206), quote contact picker/quick-add + greetings (#233–#235).
- Client structure: branch vs duplicate cleanup (#236/#237), structured branch accounts (#238), account contacts on client page (#239).
- Perf pass: loading skeletons, parallelised queries, keep-warm (#199–#204).

### Contractor + share surfaces
- Contractor mobile views (`/contractor`) incl. pay + photos (#211–#215), today/upcoming fix (#217).
- Public share routes (`/share/quote/[token]`, `/share/invoice/[token]`) with action cards (#185); Stripe Pay-Now; Twilio SMS; Mapbox autocomplete.
- Quote/Invoice document family under `src/components/document/` (PR #180) + Phase J PDF routes.

## Verification status
- `npm test` baseline: 3 failing suites (`submit-application`, `services`, `Header`) - pre-existing, leave alone.
- `npx next lint` should be clean (Errors fail Netlify builds).
- `npx tsc --noEmit` should be clean.

## Known caveats
- Do **NOT** set `PUPPETEER_EXECUTABLE_PATH` in Netlify production env. Local `.env.local` only.
- `docs/compliance/` and `docs/AI/New Text Document.txt` are untracked operational scratch - never `git add`.
- Wave-2/3 near-duplicate cluster: Papakura, Flat Bush, Hobsonville, Browns Bay, and Milford share verbatim intro-P2 / card copy with each other (flagged by thin-content guard 2026-07-04). Differentiation pass queued in [`NEXT.md`](./NEXT.md) before further volume waves.
- `src/app/collateral/marketing-a4/page.tsx` is a finished A4 flyer print route kept **local-only / uncommitted** by choice (2026-07-04).
- **Production outage 2026-05-31 04:05–04:29 UTC** — every Next.js-handled route (including `/favicon.ico`) returned plain-text `Internal Server Error` while static files served fine. Rollback to a prior known-good SHA did NOT fix it; a fresh redeploy of the same source DID. Strong evidence: bad Netlify function bundle / artifact corruption, not a code regression. **Recovery rule: when symptoms match (dynamic routes 500, static files 200, no `X-Powered-By: Next.js`), Netlify dashboard → Deploys → Trigger deploy → "Clear cache and deploy site" BEFORE attempting a source rollback.** Full triage + recovery steps in [`INCIDENT_PLAYBOOK.md`](./INCIDENT_PLAYBOOK.md). Prevention P1 layer now built (2026-07-29): `/api/health` liveness probe, `NODE_VERSION` pinned + `npm ci` in `netlify.toml`, incident playbook. **Still queued (P0/P3):** wiring the Better Stack + UptimeRobot monitors (account setup — the health endpoint exists for this) and the post-deploy smoke workflow — see [`NEXT.md`](./NEXT.md).

## How to update this doc
- Append-style entries are fine but keep the "Live in production today" list short and accurate.
- Update **Last verified** to the date of the last successful Netlify production deploy you confirmed.
- Move retired phases to `docs/PORTAL.md` (long-form history) and remove them from this doc.
