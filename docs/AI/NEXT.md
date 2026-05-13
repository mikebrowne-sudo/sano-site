# Sano - Next (Immediate Queue)

> Short. The "what's next this week" view. Bigger sequencing lives in [`docs/AI/ROADMAP.md`](./ROADMAP.md). Phase history lives in [`docs/PORTAL.md`](../PORTAL.md).

## In progress
- **Phase 5B — amendment lock (invoice-existence)** on branch `feat/phase-5b-amendment-lock`. 3 commits, gauntlet green. Needs `/sano-ship` → Netlify preview smoke test (locked quote → admin "Edit anyway" → save → audit row appears) → merge.

## Next up (this week)
- After Phase 5B merges + Netlify verifies: move the line to `STATE.md`, update `docs/PORTAL.md` Phase 5B section.
- Dedupe `clients/[id]` activity timeline onto the new shared `<AuditTimelinePanel>` (deferred from Phase 5B to preserve the page's Promise.all batching).

## Blocked / waiting
- _(empty)_

## Recently completed (move to STATE.md once verified live)
- _(empty)_

## How to use this doc
- Keep this list ruthlessly short - 1-5 items max.
- Each item is a specific, finishable piece of work, not a theme. If it's a theme, it belongs in [`ROADMAP.md`](./ROADMAP.md).
- When an item ships and is verified on Netlify, move the line to [`STATE.md`](./STATE.md) and let the linked spec/plan in `docs/superpowers/` carry the deeper history.
- Link each item to its spec/plan if one exists: `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` or `plans/YYYY-MM-DD-<slug>.md`.
