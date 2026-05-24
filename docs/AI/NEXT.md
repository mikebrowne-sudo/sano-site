# Sano - Next (Immediate Queue)

> Short. The "what's next this week" view. Bigger sequencing lives in [`docs/AI/ROADMAP.md`](./ROADMAP.md). Phase history lives in [`docs/PORTAL.md`](../PORTAL.md).

## In progress
- **Verify Sano portal production after the 2026-05-14 fix marathon.** Production should be on commit `226a876`. Test path: (a) fresh staff password reset for `michael@sano.nz` from a clean incognito → expect password form, not "Link expired"; (b) fresh contractor invite end-to-end → expect `/contractor/jobs` after password set; (c) installed contractor PWA relaunched → topbar shows green Sano wordmark; (d) home-screen icon updates after manual remove + re-add. Capture the `[reset-password] init` console output once for the DECISIONS record.

## Next up (this week)
- Run the four manual config checks queued during the contractor-login diagnosis: Supabase Auth Site URL + Redirect URLs allowlist, Resend domain verification, Netlify production env vars, real contractor invite test.
- After above verifies green: update `docs/AI/STATE.md` and `docs/PORTAL.md` to reflect the Phase 5B amendment lock, contractor invite audit panel, dual-flow reset-password fix, and real brand assets all live.
- Clean up orphan AI placeholders: delete `public/brand/sano-mark.svg`, `sano-logo-horizontal.{png,svg}`, `sano-logo-stacked.{png,svg}`. Replace `src/app/favicon.ico` with the real Sano logomark while we're there.
- Add `contractor.invite_accepted` audit verb + self-heal `auth_user_id` linkage on first password set (closes the secondary linkage issue from the contractor-login diagnosis).
- Dedupe `clients/[id]` activity timeline onto the shared `<AuditTimelinePanel>` (deferred from Phase 5B; check the Promise.all batching cost first).

## Pending decisions
- Marketing site audit next decision: service-page differentiation or About page trust upgrade. (Homepage hero review closed — hierarchy locked in via PRs #154/155/156; remaining hero work is content-blocked on real Sano photography.)

## Blocked / waiting
- _(empty)_

## Recently completed (move to STATE.md once verified live)
- **Quote / Tax Invoice document redesign** — PR #180 merged 2026-05-25 (`66fb318`). Shared document family under `src/components/document/`, pinned to the bundled standalone HTML at `F:\Sano\30-Accounting\Templates\Examples\Sano Invoice _ Quote _standalone_.html` (BRAND.md §8). Poppins + Noto Serif, flat sage-800 header with 56px logo + 34px serif `Quote.` / `Invoice.`, `SERVICE ADDRESS` / `SERVICE DESCRIPTION` sub-blocks, `0800 726 686` footer, `Quote #` / `Invoice #` header label, render-side `due_date` fallback via `computeInvoiceDueDate`. Awaiting production smoke on the 8 surfaces (staff + share print + PDF, both kinds).
- **Homepage hero alignment refine** — PR #156 merged 2026-05-19 (`9d58469`). Content block widened to `max-w-2xl`, left inset reduced to `pl-2 lg:pl-4`, chip set rotated to Homes / Offices / Rentals / End of tenancy (ClipboardCheck icon for end-of-tenancy so no icon duplicated). Trust row + chip row now sit on a single line at desktop widths.
- **Homepage hero polish (hierarchy + gradient)** — PR #155 merged 2026-05-19 (`ada9817`). Inline icon trust row (no boxed pills), soft white card-style chips, gradient lightened through centre/right (`0.78/0.50/0.10` → `0.72/0.38/0.06`).
- **Phase 5B amendment lock** — PR #139 merged 2026-05-13 (`a5e1a9e`). Docs ADR shipped via PR #140 (`b84d791`).
- **Contractor invite-failure audit + activity timeline** — PR #141 merged 2026-05-14 (`b4cf784`).
- **Contractor login flow restored** — PRs #142 (middleware, `eaa260d`) + #143 (PKCE, `c4be3c8`) + #144 (dual-flow + diagnostics, `e93ac61`).
- **Real Sano brand assets** — PR #145 merged 2026-05-14 (`226a876`). PWA icons, browser favicon, contractor topbar all corrected.
- **Marketing copy aligned with brand rules** — PR #146 merged 2026-05-19 (`0ae3feb`). Removed "premium" / "eco-friendly" from SEO surfaces; replaced with on-brand vocabulary.
- **End-of-tenancy guarantee wording aligned** — PR #147 merged 2026-05-19 (`ac018c9`). Hybrid direction: "bond-ready clean designed to maximise your chance of bond recovery" + honest landlord-control caveat + quality-of-work commitment.
- **Footer trust links + OG image** — PR #148 merged 2026-05-19 (`6c7413f`). Footer Company column +3 trust pages, trust badges 2 → 4 with flex-wrap, logo 67→48px, root metadata `openGraph.images` declared.

## How to use this doc
- Keep this list ruthlessly short - 1-5 items max.
- Each item is a specific, finishable piece of work, not a theme. If it's a theme, it belongs in [`ROADMAP.md`](./ROADMAP.md).
- When an item ships and is verified on Netlify, move the line to [`STATE.md`](./STATE.md) and let the linked spec/plan in `docs/superpowers/` carry the deeper history.
- Link each item to its spec/plan if one exists: `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` or `plans/YYYY-MM-DD-<slug>.md`.
