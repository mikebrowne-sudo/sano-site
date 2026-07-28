# Sano - Next (Immediate Queue)

> Short. The "what's next this week" view. Bigger sequencing lives in [`docs/AI/ROADMAP.md`](./ROADMAP.md). Phase history lives in [`docs/PORTAL.md`](../PORTAL.md).

## In progress
- _(empty)_

## Next up (this week)
- **Wave-2/3 suburb differentiation pass** — Papakura, Flat Bush, Hobsonville, Browns Bay, and Milford share verbatim intro-P2 and cover-card copy with each other (thin-content guard finding, 2026-07-04). Vary at sentence level before shipping more volume waves; also vary the estate-wide "Rentals and move cleans" card structure where cheap.
- **Suburb wave 5** — ~37 registry suburbs still pageless. Strongest candidates: Beach Haven, Glen Eden, Mangere, Meadowbank, Orakei, Otahuhu, Green Bay, Te Atatu South. Same pipeline as wave 4: planner agent → Mike confirms property-stock claims → build on template → thin-content guard → PR.
- **Site-wide commercial pass** — lean commercial where genuine (services, about, FAQ, CTAs); residential stays primary. Open review item from the commercial growth focus.

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
- **2026-07-04 session:** PR #313 (docs/repo hygiene), PR #282 (GA4 privacy disclosure, merged after 9 days open), PR #314 (suburb parity sweep — 14 legacy pages onto the template, copy verbatim, −2,089 lines), PR #315 (wave 4 — 8 new pages, estate to 42). All verified live on production (`55ce5c4`).
- PRs #146–#312 merged between 2026-05-19 and 2026-07-02 — service-page differentiation + cleaning standards, suburb waves 1–3 + geo/FAQ schema, finance suite (expenses, P&L, ASB import + reconciliation), contractor pay pipeline + remittance, invoice/quote editing suite, global search + command palette, GA4 analytics (site + portal), accountant access, perf pass. Detail in [`STATE.md`](./STATE.md) and `git log --merges`.
- Dropped from this queue 2026-07-04: PR #195 verification (PR was **closed unmerged** — the client-reference inherit work is dead unless re-raised) and the 2026-05-14 fix-marathon verification items (superseded by seven weeks of subsequent shipping).

## How to use this doc
- Keep this list ruthlessly short - 1-5 items max.
- Each item is a specific, finishable piece of work, not a theme. If it's a theme, it belongs in [`ROADMAP.md`](./ROADMAP.md).
- When an item ships and is verified on Netlify, move the line to [`STATE.md`](./STATE.md) and let the linked spec/plan in `docs/superpowers/` carry the deeper history.
- Link each item to its spec/plan if one exists: `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` or `plans/YYYY-MM-DD-<slug>.md`.
