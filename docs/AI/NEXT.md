# Sano - Next (Immediate Queue)

> Short. The "what's next this week" view. Bigger sequencing lives in [`docs/AI/ROADMAP.md`](./ROADMAP.md). Phase history lives in [`docs/PORTAL.md`](../PORTAL.md).

## In progress
- _(empty)_

## Next up (this week)
- _(empty — suburb thread complete; commercial pass parked, see Backlog below)_

## Backlog / revisit when the business is ready
- **Site-wide commercial pass — PARKED 2026-07-29 (do not action yet).** Sano is still ~90% residential and not yet geared to actively grow/service a larger commercial base, so this is deliberately deferred until the business is ready. **Explicitly out of scope for now:** the enquiry form, the contact-page journey, suburb-page `serviceGroups` ordering, FAQ additions, and commercial internal linking — leave all as-is.
  - Audit findings (2026-07-29): the `/services/commercial-cleaning` page is already **strong and complete** (hero, why-choose, 9-card "what we cover", Service JSON-LD) — not the gap. 7 suburb pages already lead commercial-first genuinely (CBD, Newmarket, Manukau, Henderson, Onehunga, Westgate, Takapuna). About page addresses commercial; nav + footer link it.
  - Highest-value items *when revisited*: (1) the commercial page's CTAs land on `/contact` ("Let's get your home sparkling") and trust links on `/guarantee` (residential-only) — a business lead hits residential-framed pages; (2) Mount Wellington, Botany Downs, Albany are commercial-aware (name workplaces) but residential-led — genuine candidates to flip to commercial-first ordering; (3) no commercial-specific FAQ (after-hours, contract/per-site, multi-site); (4) no targeted internal links between commercial-heavy suburbs and the commercial page. **Deliberately NOT recommended even later:** a commercial hub, new commercial landing pages, homepage commercial-rebrand, or invented testimonials.

## Outage prevention plan (queued after 2026-05-31 incident)
- **✅ Health endpoint (P1)** — `src/app/api/health/route.ts` returning `{ok:true}`, `force-dynamic`, no deps. Built 2026-07-29.
- **✅ Pin `NODE_VERSION` + switch to `npm ci` (P1)** — `NODE_VERSION = "22"` + `npm ci && npm run build` in `netlify.toml`. Built 2026-07-29 (`npm ci --dry-run` verified in sync before switching).
- **✅ Incident playbook (P2)** — [`INCIDENT_PLAYBOOK.md`](./INCIDENT_PLAYBOOK.md), linked from `CLAUDE.md` + `STATE.md`. Built 2026-07-29.
- **Uptime monitoring (P0, still TODO — Mike)** — Better Stack (primary) + UptimeRobot (redundant secondary). Three monitors: `/`, `/portal/login`, `/api/health`. Both free tier; 1–3 min interval, push + email alerts. **Zero code — account setup only.** The health endpoint now exists for this.
- **Post-deploy smoke check (P3, still TODO)** — `.github/workflows/post-deploy-smoke.yml` on push to main; sleeps 90s then curls `/`, `/services`, `/portal/login`, `/robots.txt`, `/api/health`; alerts on non-200. 3× retry with 30s backoff.

## Pending decisions
- **A4 marketing flyer route** — `src/app/collateral/marketing-a4/page.tsx` is finished but deliberately local-only/uncommitted (decision 2026-07-04: leave local). Commit when Mike wants it deployable; it would be publicly routable though unlinked.

## Blocked / waiting
- _(empty)_

## Recently completed (housekept 2026-07-04)
- **2026-07-29 session — suburb thread COMPLETE:** PR #461 (wave-2/3 differentiation — the flagged 5-page cluster), PR #462 (sitewide intro dedup — 22 pages, both intro paragraphs deduped by name- + skeleton-normalized check across all 42), PR #463 (wave 5 — 8 new pages: Beach Haven, Glen Eden, Mangere, Meadowbank, Orakei, Otahuhu, Green Bay, Te Atatu South, estate to 50). All 8 new URLs verified live (200, correct schema/postcode/region, titles, nearby + hub links). Suburb copy is done — do not re-open without a genuine new finding. Also this session: quote/invoice PDF pagination + closing-block bottom-anchor, Full Property Reset structured scope, quote test-send vs customer-send split, outage-prevention P1 + P3 (health endpoint, Node pin, `npm ci`, incident playbook, post-deploy smoke).
- **2026-07-04 session:** PR #313 (docs/repo hygiene), PR #282 (GA4 privacy disclosure, merged after 9 days open), PR #314 (suburb parity sweep — 14 legacy pages onto the template, copy verbatim, −2,089 lines), PR #315 (wave 4 — 8 new pages, estate to 42). All verified live on production (`55ce5c4`).
- PRs #146–#312 merged between 2026-05-19 and 2026-07-02 — service-page differentiation + cleaning standards, suburb waves 1–3 + geo/FAQ schema, finance suite (expenses, P&L, ASB import + reconciliation), contractor pay pipeline + remittance, invoice/quote editing suite, global search + command palette, GA4 analytics (site + portal), accountant access, perf pass. Detail in [`STATE.md`](./STATE.md) and `git log --merges`.
- Dropped from this queue 2026-07-04: PR #195 verification (PR was **closed unmerged** — the client-reference inherit work is dead unless re-raised) and the 2026-05-14 fix-marathon verification items (superseded by seven weeks of subsequent shipping).

## How to use this doc
- Keep this list ruthlessly short - 1-5 items max.
- Each item is a specific, finishable piece of work, not a theme. If it's a theme, it belongs in [`ROADMAP.md`](./ROADMAP.md).
- When an item ships and is verified on Netlify, move the line to [`STATE.md`](./STATE.md) and let the linked spec/plan in `docs/superpowers/` carry the deeper history.
- Link each item to its spec/plan if one exists: `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` or `plans/YYYY-MM-DD-<slug>.md`.
