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
