# Sano Site + Portal — Codex Context

> Auto-loaded by Codex when working in this repo. This file is a
> **navigation hub** — it tells Codex where to find the deep info,
> not the info itself. Keep it slim.
>
> **Paths:** `C:\Projects\...` is canonical on this machine. `D:\` is the old read-only safety/source copy. `F:\` does not exist — ignore old `F:\` paths unless clearly marked as historical.

## Read these first (in this order)

1. **[`docs/AI/SANO_EXECUTION_MODE.md`](docs/AI/SANO_EXECUTION_MODE.md)** — how to work in this repo (operating mode, hard-stop list, deployment parity, workflow tooling).
2. **[`docs/PORTAL.md`](docs/PORTAL.md)** — what's built (current portal state, data structures, phased history).
3. **This file** — quick reference + cross-links.

If something below contradicts those two docs, the dedicated doc wins.

## Status pointers

Short, current. Link to PORTAL.md for depth.

- **[`docs/AI/PROJECT.md`](docs/AI/PROJECT.md)** — 1-page elevator pitch.
- **[`docs/AI/STATE.md`](docs/AI/STATE.md)** — what's currently live (last verified date).
- **[`docs/AI/NEXT.md`](docs/AI/NEXT.md)** — immediate queue.
- **[`docs/AI/ROADMAP.md`](docs/AI/ROADMAP.md)** — sequencing.
- **[`docs/AI/DECISIONS.md`](docs/AI/DECISIONS.md)** — architectural decisions log.
- **[`docs/AI/OBSIDIAN_SECOND_BRAIN.md`](docs/AI/OBSIDIAN_SECOND_BRAIN.md)** — Obsidian vault pointer (`C:\Second Brain\`).

---

## Quick orient

- **Repo root:** `C:\Projects\Sano\01-Site\`
- **GitHub:** `mikebrowne-sudo/sano-site`
- **Live site:** https://sano.nz
- **Netlify project:** `sanonz1` — auto-deploys from GitHub `main`, PR previews per branch
- **Two surfaces in one repo:**
  - Marketing site at `/` (lives under `src/app/(public)/*`)
  - Portal CRM at `/portal` (staff), `/contractor` (mobile contractor views), `/share` (token-keyed public deliverables)
- **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · Supabase (Auth + Postgres + RLS) · Resend (email) · Stripe (payments) · Twilio (SMS) · Mapbox (NZ-biased address autocomplete) · Puppeteer (server-side PDF) · Jest

---

## Operating mode (one-paragraph summary)

Phased execution, hard stops only at risky/irreversible points, defer
reviewer Minor + non-security Important findings, lint before push,
PR-based merges via GitHub. Full rules and the hard-stop list live in
[`docs/AI/SANO_EXECUTION_MODE.md`](docs/AI/SANO_EXECUTION_MODE.md).

---

## Repo conventions

### Test / lint / typecheck (the local gauntlet)

| Command | What it checks |
|---|---|
| `npm test` | Jest. **Documented baseline: 3 failing suites** (`submit-application`, `services`, `Header`) — pre-existing, leave them alone. Anything above 3 is a regression. |
| `npx next lint` | Netlify-equivalent lint. **Errors fail Netlify build; Warnings don't.** |
| `npx tsc --noEmit` | Type check. |
| `npm run build` | Full Netlify-equivalent build. Heavy; reserve for pre-merge sanity. |

The first three together are "the gauntlet" and run automatically before any `git push` from this repo via a `PreToolUse` hook. Don't bypass with `--no-verify`.

### Workflow tooling

- **Pre-push gauntlet hook** at `~/.Codex/hooks/sano-pre-push-gauntlet.sh`. Runs lint + tests before every `git push`. Blocks the push on lint errors or above-baseline test failures.
- **`/sano-ship`** slash command at `~/.Codex/commands/sano-ship.md`. Pushes the current branch + opens a PR against `main` + returns the link. Verifies branch hygiene first.

Both are documented in [`docs/AI/SANO_EXECUTION_MODE.md`](docs/AI/SANO_EXECUTION_MODE.md) "Workflow tooling".

### Branch / PR workflow

- Feature branches off latest `origin/main`, rebased clean before PR.
- PRs go to `main` via GitHub. Merge commits (not squash).
- Don't open PRs from branches carrying unrelated commits — split first via `git rebase --onto origin/main <fork-point>` onto a fresh feature-named branch.
- Don't trust local `main` — always `git fetch origin main` first.

### What "done" means

- Full test suite at baseline (3 failed)
- `npx next lint` zero **Error:** lines
- `npx tsc --noEmit` clean
- Manual smoke per the spec's verification path (where applicable)
- Netlify deploy preview confirmed before merge

---

## Where things live

### Source tree (key paths)

```
src/
  app/
    (public)/            — marketing site (homepage, services, about, contact, FAQ)
    portal/              — staff CRM (auth-gated; /portal/quotes, /invoices, /jobs, /clients, /people, /payroll, /settings, ...)
    contractor/          — contractor mobile-first views
    share/               — public share routes (token-keyed: /share/quote/[token], /share/invoice/[token])
    api/                 — API routes (PDF, webhooks, submit-quote, submit-application, etc.)
    proposals/           — public-facing proposal print routes (Puppeteer target)
  lib/
    pdf/                 — shared PDF infrastructure (Phase J): render-pdf.ts, sanitize-filename.ts
    proposals/           — commercial-quote proposal pack
    invoice-dates.ts     — canonical due-date / service-date computation (used by every conversion + send + Stripe path)
    *                    — kebab-case file names; one responsibility per file
  __tests__/             — Jest tests (some colocated under src/app/.../__tests__)
public/
  brand/                 — logos
  images/                — photography
docs/
  PORTAL.md                              — master architecture brief
  AI/SANO_EXECUTION_MODE.md              — operating rules
  superpowers/specs/YYYY-MM-DD-*.md      — feature specs (write before implementing non-trivial features)
  superpowers/plans/YYYY-MM-DD-*.md      — TDD execution plans (subagent-executable)
```

Tailwind tokens live in `tailwind.config.ts` (sage palette). Type styles in `src/app/globals.css`.

---

## Infrastructure quick-reference

### Netlify (`sanonz1`)

- Auto-deploys from GitHub `main`; PR previews per branch.
- Required env (verify via `netlify env:list` — never read `.env*` files directly):
  - `RESEND_API_KEY`, `SANO_NOTIFY_EMAIL`, `SANO_EMAIL_REPLY_TO`
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SITE_URL`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID`
  - `NEXT_PUBLIC_MAPBOX_TOKEN`
  - `CRON_SECRET`, `NEXT_TELEMETRY_DISABLED`
- **Do NOT set `PUPPETEER_EXECUTABLE_PATH` in production** — it forces a local Chrome path; `@sparticuz/chromium` handles Lambda. Only set in local `.env.local` for dev.

### Supabase

- **Never insert into `auth.users` directly** — use Supabase Auth API or Dashboard. Never expose passwords in queries.
- RLS is enforced on most tables. Share routes use the service-role client with token-keyed queries (see `src/app/share/*` for the pattern).
- Audit log: `public.audit_log` records sensitive actions.

### Other

- Resend: `noreply@sano.nz` from address; admin notifications go to `SANO_NOTIFY_EMAIL` (`hello@sano.nz`).
- Stripe: invoice payment via the share-page Pay-Now button → Stripe Checkout → webhook flips `invoices.status: 'paid'`.
- Twilio: SMS notifications to clients (Phase H) and the workforce.
- Mapbox: NZ-biased address autocomplete on quote/job/client forms; graceful fallback to plain text when no token.

---

## PDF architecture (Phase J — recently shipped to branch)

5 server-rendered PDF routes share `src/lib/pdf/render-pdf.ts` (`puppeteer-core` + `@sparticuz/chromium`):

| Route | Auth | Filename |
|---|---|---|
| `/api/proposals/[id]/pdf` | Staff | `proposal-QT-xxxx.pdf` |
| `/api/quotes/[id]/pdf` | Staff (residential only — commercial returns 400) | `Sano Quote - QT-xxxx.pdf` |
| `/api/invoices/[id]/pdf` | Staff | `Sano Tax Invoice - INV-xxxx.pdf` |
| `/api/share/quote/[token]/pdf` | Public (token) | `Sano Quote - QT-xxxx.pdf` |
| `/api/share/invoice/[token]/pdf` | Public (token) | `Sano Tax Invoice - INV-xxxx.pdf` |

Share pages support `?pdf=1` mode that hides interactive panels (`<AcceptQuote>`, `<PayNowButton>`), suppresses `<AutoPrint>`, and short-circuits the `sent → viewed` status promotion + audit row on quote share renders.

Send Quote / Send Invoice emails auto-attach the share-page PDF with a fail-fast contract: render failure means no email + no status flip + canonical operator error `"PDF generation failed, so the email was not sent. Please try again."` Send-flow stamps any missing `date_issued` / `valid_until` / `due_date` **before** the render so attachments always show populated dates. Invoice `due_date` reuses `computeInvoiceDueDate` from `src/lib/invoice-dates`.

Deeper detail and remaining work → [`docs/PORTAL.md`](docs/PORTAL.md) "Phase J — Quote & Invoice PDF".

---

## Brand / UI non-negotiables

- **Forbidden phrases:** "premium", "eco-friendly", "industry-leading". No fake testimonials. No pricing on homepage.
- **Tagline:** Clean spaces — Healthy living
- **Positioning:** Reliable, detail-focused Auckland cleaning. Cleaning that improves how a space feels, not just how it looks.
- **Sage palette only.** Don't introduce new colours without explicit approval. Tokens in `tailwind.config.ts`.
- **Typography:** Noto Serif (display) + Outfit (body) on the marketing site; Inter on the portal. Don't mix.
- **Portal UX:** clarity over flashy. Full-page forms, large labels, dropdowns over typing, avoid modals where possible.

---

## What NOT to commit

- Anything from `C:\Projects\Sano\30-Accounting\`, `C:\Projects\Sano\40-Business\`, or outside this repo root.
- `docs/compliance/` and `docs/AI/New Text Document.txt` — pre-existing untracked operational scratch dirs/files. Treat as human-managed.
- `.env`, `.env.local`, `.env.production` — secrets.
- `.next/`, `node_modules/`.

---

## Memory entries that apply here

The user maintains durable rules at `~/.Codex/projects/.../memory/`. The high-relevance ones for this repo:

- `feedback_lint_before_push.md` — `next build` runs ESLint as errors; lint before push.
- `feedback_pr_branch_hygiene.md` — rebase onto fresh `origin/main`; no carry-along commits.
- `feedback_no_per_phase_pauses.md` — continue through user-named hard stops only.
- `feedback_reviewer_findings.md` — defer Minor + non-security Important reviewer findings.
- `feedback_brief_live_vs_implemented.md` — only mark items live in PORTAL.md after Netlify deploy + verification.
- `feedback_sano_high_velocity.md` — don't ask approval on routine safe ops.
- `feedback_no_env_files.md` — never read `.env*` files; use `netlify env:list` or verbal confirmation.
- `feedback_git_add_brackets.md` — Windows shell: bracket paths in `git add` silently match nothing; use `:(literal)` prefix or `git add -A`.

The MEMORY.md index in that directory is the source of truth.
