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
