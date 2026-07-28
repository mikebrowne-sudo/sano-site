# Sano — Incident Playbook

> What to do when the live site is down or misbehaving. Keep it short and
> actionable. Deeper architecture lives in [`../PORTAL.md`](../PORTAL.md);
> queued prevention work is in [`NEXT.md`](./NEXT.md).

## Live surfaces to know

- **Public site:** https://sano.nz
- **Portal login:** https://sano.nz/portal/login
- **Health probe:** https://sano.nz/api/health → `{"ok":true}` (200). Pure
  Lambda, no DB — a green check means the SSR function is executing.
- **Host:** Netlify project `sanonz1` (Admin: https://app.netlify.com/projects/sanonz1).
  Auto-deploys from GitHub `main`.

## Fastest triage — which layer is broken?

Curl three things (or open them):

| Check | 200 = | Non-200 / 500 = |
|---|---|---|
| `/` (static) | static hosting is up | whole site / CDN down |
| `/api/health` (dynamic, no DB) | SSR Lambda is executing | **the 2026-05-31 failure mode** — see below |
| `/portal/login` (dynamic + Supabase) | app + DB path is up | app or Supabase issue |

The key signal: **`/` returns 200 but `/api/health` (or other dynamic routes)
return 500.** That means static files serve fine while the SSR/dynamic Lambda
is broken — the exact shape of the 2026-05-31 incident.

## Recovery — dynamic routes 500 while static files 200

This resolved the 2026-05-31 outage:

1. In the Netlify dashboard (`sanonz1`) → **Deploys**.
2. **Trigger deploy → "Deploy site"** (a plain re-deploy of the current commit).
3. If that doesn't clear it: **Trigger deploy → "Clear cache and deploy site"**.
4. Re-check `/api/health` and `/portal/login` until both return 200.

Most SSR-Lambda breakage after a green build is a stale/edge-cache or a bad
function bundle; a clean re-deploy (step 2–3) rebuilds and re-publishes it.

## If a re-deploy doesn't fix it

- **Check the build log** (Netlify → Deploys → latest → build log) for a failed
  or partial build. A red build means `main` is broken — revert the offending
  commit on GitHub and let the auto-deploy rebuild.
- **Check Supabase** (project `Sano`, `rcfzlvablzehyawmrdqs`) is
  `ACTIVE_HEALTHY` — dashboard status + `/portal/login` behaviour. A paused or
  degraded DB breaks every authed route but leaves static `/` and `/api/health`
  green.
- **Check env vars** haven't been dropped (`netlify env:list`) — a missing
  `SUPABASE_*` / `RESEND_*` / `STRIPE_*` key surfaces as 500s on the routes
  that use it.

## Guardrails already in place

- **Node pinned** — `NODE_VERSION = "22"` in `netlify.toml`, so builds don't
  drift when Netlify changes its default.
- **Strict install** — build runs `npm ci` (not `npm install`), failing on any
  lockfile drift rather than resolving an untested dependency tree.
- **Keep-warm** — `netlify/functions/keep-warm.mts` pings a dynamic route every
  5 min so the SSR Lambda stays warm (avoids the ~3.5s first-click cold start;
  unrelated to outages but worth knowing it exists).

## Still queued (not yet built — see NEXT.md)

- Uptime monitors (Better Stack + UptimeRobot) on `/`, `/portal/login`,
  `/api/health` — the health endpoint above exists specifically so these can be
  wired up.
- Post-deploy smoke check (`.github/workflows/post-deploy-smoke.yml`).
