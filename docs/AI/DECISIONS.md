# Sano - Decisions Log

> Append-only ADR-lite log. Architectural decisions for the Sano portal. Personal / cross-project decisions go in the vault at `F:\Second Brain\05 Decisions\`.

## Format

Each entry is a short ADR. Newest at the top. Don't rewrite history - if a decision is reversed, add a new entry that supersedes the old one.

```
## YYYY-MM-DD - <Decision title>
- **Status:** proposed | accepted | superseded by <link>
- **Context:** Why this decision is being made.
- **Options:**
  1. Option A - pros/cons.
  2. Option B - pros/cons.
- **Decision:** Chosen option and reasoning.
- **Consequences:** Trade-offs accepted, follow-up work needed.
- **Links:** PR / spec / plan / external thread.
```

---

## 2026-05-14 - Contractor portal + browser favicon use real Sano logomark
- **Status:** accepted
- **Context:** PWA app icon, browser favicon, Apple touch icon, and the contractor-portal topbar were all using AI-generated placeholder art (a procedural green-gradient S-shape SVG and PNG renders of it). Real Sano brand assets exist at `F:\Sano\10-Branding\Logos\` but had never been pulled into the repo. Per `feedback_external_folders`, the user normally moves brand assets in by hand — this was an explicit one-off override for two named files.
- **Options:**
  1. Reference `sano-logo.png` (full mark + wordmark) for everything — but wordmark is illegible at 16/32/192px favicon/icon sizes.
  2. Drop in dedicated logomark-only assets and generate icon sizes server-side.
  3. Leave the AI placeholder + add a TODO.
- **Decision:** Option 2. Used `sharp` to generate `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and a 512×512 `sano-logomark.png` from `F:\Sano\10-Branding\Logos\Logomark\logo4.jpg`. Pipeline: trim white border → resize-contain → extend with 5% padding (normal) or 15% padding (maskable, for Android adaptive-icon safe zone) → PNG. Copied `sano-full-green.png` verbatim for the contractor topbar (text "Sano" → `<Image>`).
- **Consequences:** Browser favicon, PWA install icon, Apple touch icon, and contractor portal topbar all now use the real Sano logomark. Orphan AI placeholders (`sano-mark.svg`, `sano-logo-horizontal.*`, `sano-logo-stacked.*`) left in place pending a cleanup PR. iOS/Android home-screen shortcuts baked-in at install time still show the old icon until users remove + re-add (no service worker, so in-app branding updates on next launch). `src/app/favicon.ico` left as-is (overridden by metadata; worth a clean swap in the next pass).
- **Links:** PR [#145](https://github.com/mikebrowne-sudo/sano-site/pull/145) (`226a876`).

## 2026-05-14 - Contractor login flow: middleware allowlist + dual-flow auth token handling
- **Status:** accepted
- **Context:** Contractors reported "I clicked the invite email and ended up on the staff login page with no way to set a password." Root cause investigation found two distinct bugs in series: (a) middleware redirected `/portal/reset-password` and `/portal/forgot-password` to `/portal/login` for any unauthenticated request, stripping the Supabase auth token in the redirect; (b) once the middleware was fixed, the reset-password form still failed because `@supabase/ssr`'s browser client doesn't auto-handle Supabase invite/recovery links — depending on the Supabase project's auth-flow setting (NOT the client's `flowType`), the link arrives with either `?code=…` (PKCE) or `#access_token=…&refresh_token=…` (implicit). Initial fix handled only PKCE; production used implicit. Required a second iteration.
- **Options:**
  1. Reconfigure Supabase project to use only PKCE flow, match client expectations — would still leave us blind if Supabase later changes the project, and doesn't address the middleware bug.
  2. Set `flowType: 'implicit'` on the browser client — affects every Supabase call site-wide, regression risk.
  3. Handle BOTH PKCE and implicit-hash explicitly on the reset-password page. Detect whichever the URL carries and call the matching `supabase.auth` method. Plus middleware allowlist for `/portal/reset-password` and `/portal/forgot-password`.
- **Decision:** Option 3. Two-stage middleware + form fix. ResetPasswordForm now branches: `?code` → `exchangeCodeForSession(code)` (PKCE), `#access_token + #refresh_token` → `setSession({…})` (implicit), `?error / #error` → straight to 'expired' state, else → defensive 50ms-wait fallback. URL gets cleaned via `history.replaceState` after success so refresh doesn't try to re-consume a single-use token. Safe `console.warn` diagnostics log only the *shape* of the URL (booleans + error codes), never tokens — useful for any future re-occurrence.
- **Consequences:** Resilient to either Supabase auth-flow config without further code changes. `console.warn` diagnostics OK to leave in (no PII; useful for incident triage). Secondary issue still pending: `contractors.auth_user_id` linkage may be null for some pre-existing rows, which would still bounce contractors to `/portal` after a successful password set — that's a self-heal in `markContractorInviteAccepted` to add later. Also discovered Sano's PWA has no service worker, so installed-app shell updates on next launch without uninstall (only the home-screen icon image stays baked).
- **Links:** PRs [#142](https://github.com/mikebrowne-sudo/sano-site/pull/142) (middleware, `eaa260d`), [#143](https://github.com/mikebrowne-sudo/sano-site/pull/143) (PKCE-only, `c4be3c8` — incomplete), [#144](https://github.com/mikebrowne-sudo/sano-site/pull/144) (dual-flow + diagnostics, `e93ac61`).

## 2026-05-12 - Invoice-existence lock for quote/job amendments (Phase 5B)
- **Status:** accepted
- **Context:** Quotes and jobs needed a lock point once an invoice was created so material billing fields couldn't drift away from what the customer was invoiced for. Operational fields (schedule, contractor, access notes) still needed to flow. Admin sometimes legitimately needs to reconcile a post-invoice amendment.
- **Options:**
  1. Hard lock on every field once invoiced — clean but breaks contractor reassignment and schedule edits.
  2. Status-based lock (e.g. quote.status === 'invoiced') — relies on a status enum that doesn't exist consistently across both entities and gets out of sync with reality.
  3. Invoice-existence lock on material fields only, admin-overridable via URL param, audit-logged on every override — the chosen path.
- **Decision:** Option 3. Lock resolves by checking the linked invoice row (`invoices.quote_id` / `jobs.invoice_id`), not by interpreting status. Material vs operational split is enforced server-side in the action; client UI just disables fields visually. Override is keyed by `?override=1` — visible in the URL, refresh-safe, server re-verifies admin before honouring it. Every override write lands an audit row with verbs `quote.amended_after_invoice` / `job.amended_after_invoice` carrying before/after JSON of the changed billing fields.
- **Consequences:** No schema migration needed. `assignJob` gets a partial guard (drops only `allowed_hours` when locked-without-override; everything else flows). `clients/[id]` activity timeline kept its inline implementation to preserve its Promise.all batching — dedup onto the new shared `<AuditTimelinePanel>` is deferred. Quote v2 / customer reissue flow / `operational_scope` jsonb split are out of scope for this phase.
- **Links:** branch `feat/phase-5b-amendment-lock`; spec `docs/superpowers/specs/quote-amendment-lifecycle.md`.

---

## 2026-05-06 - PDF render via puppeteer-core + @sparticuz/chromium (example/seed entry)
- **Status:** accepted
- **Context:** Phase J needed server-side PDF for proposals, quotes, invoices, and the public share routes. Local Chrome path wouldn't work on Netlify Functions (Lambda).
- **Options:**
  1. `puppeteer` full bundle - includes Chromium, too big for Lambda.
  2. `puppeteer-core` + `@sparticuz/chromium` - Lambda-compatible, used by similar projects.
  3. External PDF service (DocRaptor / PDFShift) - operational cost + latency + extra failure surface.
- **Decision:** Option 2. Local dev uses `PUPPETEER_EXECUTABLE_PATH`, production uses `@sparticuz/chromium`.
- **Consequences:** Single shared `src/lib/pdf/render-pdf.ts` for all 5 PDF routes. Fail-fast contract on send: render failure means no email, no status flip, canonical operator error. **Do NOT** set `PUPPETEER_EXECUTABLE_PATH` in Netlify production env.
- **Links:** `docs/superpowers/specs/2026-05-06-quote-invoice-pdf-design.md`, `docs/superpowers/plans/2026-05-06-quote-invoice-pdf.md`, `docs/PORTAL.md` Phase J section.

_(Replace this seed entry with real ones as decisions are made. The seed exists so the format is concrete.)_
