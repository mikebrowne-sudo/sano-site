# Sano - Next (Immediate Queue)

> Short. The "what's next this week" view. Bigger sequencing lives in [`docs/AI/ROADMAP.md`](./ROADMAP.md). Phase history lives in [`docs/PORTAL.md`](../PORTAL.md).

## In progress
- _(empty)_

## Next up (this week)
- **Suburb parity sweep** — migrate the 14 hand-built suburb pages (`devonport, epsom, grey-lynn, henderson, kingsland, manukau, mission-bay, mount-eden, new-lynn, onehunga, ponsonby, takapuna, te-atatu-peninsula, titirangi`) onto `SuburbLandingTemplate` so they gain the PR #311 geo schema + PR #312 FAQ/FAQPage schema, and rewrite their intros to the service-led standard (no geography/research voice). Verified 2026-07-04: template pages serve FAQPage live (e.g. Albany); the 14 legacy pages do not.
- **Decide PR #282** — `content(policies): website-analytics line in Privacy section`, open since 2026-06-25. Review, then merge or close; don't leave it hanging.
- **Site-wide commercial pass** — lean commercial where genuine (services, about, FAQ, CTAs); residential stays primary. Open review item from the commercial growth focus.

## Outage prevention plan (queued after 2026-05-31 incident — none built as of 2026-07-04)
- **Uptime monitoring (P0)** — Better Stack (primary) + UptimeRobot (redundant secondary). Three monitors: `/`, `/portal/login`, `/api/health`. Both free tier; expect 1–3 min check interval, push + email alerts. Zero code change.
- **Health endpoint (P1)** — add `src/app/api/health/route.ts` returning `{ok:true}` with `export const dynamic = 'force-dynamic'`. No DB / Supabase / external dependency — pure Lambda probe.
- **Pin `NODE_VERSION` + switch to `npm ci` (P1)** — add `NODE_VERSION` to `netlify.toml` `[build.environment]` (pull the value from the current working deploy's build log first); switch build command to `npm ci && npm run build` so the lockfile is strictly enforced.
- **Incident playbook (P2)** — new `docs/AI/INCIDENT_PLAYBOOK.md` documenting the "dynamic routes 500 / static files 200 → Trigger deploy → Clear cache and deploy site" recovery procedure that resolved 2026-05-31. Reference in `CLAUDE.md` Status pointers + `STATE.md` Known caveats.
- **Post-deploy smoke check (P3)** — `.github/workflows/post-deploy-smoke.yml` triggered on push to main; sleeps 90s then curls `/`, `/services`, `/portal/login`, `/robots.txt`, `/api/health`; alerts on non-200. 3× retry with 30s backoff to absorb cold-start jitter.

## Pending decisions
- **A4 marketing flyer route** — `src/app/collateral/marketing-a4/page.tsx` is finished but deliberately local-only/uncommitted (decision 2026-07-04: leave local). Commit when Mike wants it deployable; it would be publicly routable though unlinked.

## Blocked / waiting
- _(empty)_

## Recently completed (housekept 2026-07-04)
- PRs #146–#312 merged between 2026-05-19 and 2026-07-02 — service-page differentiation + cleaning standards, 34 suburb pages (3 waves + geo/FAQ schema), finance suite (expenses, P&L, ASB import + reconciliation), contractor pay pipeline + remittance, invoice/quote editing suite, global search + command palette, GA4 analytics (site + portal), accountant access, perf pass. Detail in [`STATE.md`](./STATE.md) and `git log --merges`.
- Dropped from this queue 2026-07-04: PR #195 verification (PR was **closed unmerged** — the client-reference inherit work is dead unless re-raised) and the 2026-05-14 fix-marathon verification items (superseded by seven weeks of subsequent shipping).

## How to use this doc
- Keep this list ruthlessly short - 1-5 items max.
- Each item is a specific, finishable piece of work, not a theme. If it's a theme, it belongs in [`ROADMAP.md`](./ROADMAP.md).
- When an item ships and is verified on Netlify, move the line to [`STATE.md`](./STATE.md) and let the linked spec/plan in `docs/superpowers/` carry the deeper history.
- Link each item to its spec/plan if one exists: `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` or `plans/YYYY-MM-DD-<slug>.md`.
