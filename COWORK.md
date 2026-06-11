# COWORK.md — Sano Portal (code repo)

> **Paths:** `C:\Projects\...` is canonical on this machine. `D:\` is the old read-only safety/source copy. `F:\` does not exist — ignore old `F:\` paths unless clearly marked as historical.

> **For Claude Cowork desktop sessions starting in `C:\Projects\Sano\01-Site\` (the Sano website / portal / CRM code repo).** Read this first; it overrides the generic [Cowork Session Starter](C:\Second Brain\06 Prompts\General\Cowork Session Starter.md).
>
> **Claude Code is preferred for actual code changes.** Cowork is for thinking, planning, reviewing, and documentation. If the task requires editing files in this repo, redirect to Claude Code (open VS Code via the Sano launcher, run `/start-session`).

## Project identity

Sano website + portal + CRM. Production at https://sano.nz. Two surfaces in one Next.js codebase (Next.js 14, TypeScript, Tailwind, Supabase, Resend, Stripe, Twilio, Mapbox, Puppeteer). Deployed via Netlify (`sanonz1`) from `main`.

For wider Sano business work (branding, accounting, contractors, ops), use [C:\Projects\Sano\COWORK.md](C:\Projects\Sano\COWORK.md) instead.

## What Cowork is good for here

- Planning a feature before coding it (architecture, edge cases, decision tree)
- Reviewing changes Claude Code made (read the diff, give feedback)
- Drafting docs (PORTAL.md updates, ADRs, READMEs, PR descriptions)
- Summarising sessions (run an end-of-session summary on completed work)
- UX / UI thinking (page flows, copy review, conversion thinking)
- Project management (state of phases, what to ship next, sequencing)
- Generating prompts for the actual Claude Code session that will do the work

## What Cowork should NOT do here

- Edit source code, tests, migrations, or repo docs directly. That's Claude Code's job.
- Run git commands.
- Run `npm`, `npx`, or any build / test command.
- Edit `.env` or any secrets.
- Commit or push.

If a task drifts into code-editing, stop and tell me to switch to Claude Code.

## Start of Cowork session — checklist

Before doing anything substantive:

1. Confirm scope: is this code-editing or planning / review / docs? If code-editing → redirect to Claude Code.
2. Confirm current branch and working tree (ask me — Cowork doesn't have live git access). **Normal work should start from `main`.** If I'm already on a feature branch, confirm that's intentional.
3. Read the relevant repo docs as needed:
   - `C:\Projects\Sano\01-Site\CLAUDE.md` — first 60 seconds of repo orientation
   - `C:\Projects\Sano\01-Site\docs\AI\SANO_EXECUTION_MODE.md` — operating mode + hard-stop list
   - `C:\Projects\Sano\01-Site\docs\PORTAL.md` — master architecture brief
   - `C:\Projects\Sano\01-Site\docs\AI\STATE.md`, `NEXT.md`, `DECISIONS.md`, `ROADMAP.md` — current status
4. Confirm the summary save path: `C:\Second Brain\04 Claude Sessions\Sano\YYYY-MM-DD-<short-slug>.md`.
5. Wait for the actual task.

## CI parity reminders (before calling code work complete)

When code work has happened (in Claude Code, then reviewed here, or vice versa), Cowork should remind me before I claim complete:

- `npm test` — Jest. **Documented baseline: 3 failing suites** (`submit-application`, `services`, `Header`). Anything above 3 is a regression.
- `npx tsc --noEmit` — type check.
- `npx next lint` — Netlify-equivalent lint. **Errors fail Netlify build; warnings don't.**
- `npm run build` — full Netlify-equivalent build. Heavy; reserve for pre-merge sanity.

The Sano pre-push gauntlet hook (`~/.claude/hooks/sano-pre-push-gauntlet.sh`) runs `npx next lint` + `npm test` automatically on every `git push` from this repo. Don't bypass it.

## Repo doc update reminders

If the session produced anything load-bearing, suggest updates to:

- `C:\Projects\Sano\01-Site\docs\PORTAL.md` — master architecture; phase history; recently-shipped features
- `C:\Projects\Sano\01-Site\docs\AI\STATE.md` — what's currently live
- `C:\Projects\Sano\01-Site\docs\AI\NEXT.md` — immediate queue
- `C:\Projects\Sano\01-Site\docs\AI\DECISIONS.md` — architectural decisions log
- `C:\Projects\Sano\01-Site\docs\AI\ROADMAP.md` — sequencing

Suggest exact 1-2 line snippets I can paste; don't edit them from Cowork.

## Second Brain capture rules

- **Session summaries**: `C:\Second Brain\04 Claude Sessions\Sano\YYYY-MM-DD-<short-slug>.md`
- **Reusable prompts** (e.g., the actual Claude Code prompt to run after this Cowork planning session): `C:\Second Brain\06 Prompts\Sano\<name>.md`
- **Cross-project / personal decisions**: vault `C:\Second Brain\05 Decisions\YYYY-MM-DD-<slug>.md`
- **Portal architecture decisions**: repo `C:\Projects\Sano\01-Site\docs\AI\DECISIONS.md` (canonical — point at it, suggest the snippet, don't edit yourself)

## End-of-session summary requirement

At the end of meaningful sessions, produce a summary and save to `C:\Second Brain\04 Claude Sessions\Sano\YYYY-MM-DD-<short-slug>.md`:

```
---
type: claude-session
project: Sano
source: claude-cowork
date: YYYY-MM-DD
scope: <planning | review | docs | UX | project-mgmt | other>
---

# <short title>

## Task goal
<one paragraph>

## What was discussed or created
<bullets>

## Files discussed (proposed for editing in Claude Code later)
<paths, with note: "Cowork did not edit these. Claude Code session will.">

## Decisions made
<non-trivial calls with the *why*>

## Recommended Claude Code prompt
<the literal prompt to paste into Claude Code in C:\Projects\Sano\01-Site to do the actual work>

## CI parity reminder (before claiming done)
- npm test (baseline 3 failures — submit-application, services, Header)
- npx tsc --noEmit
- npx next lint (Errors fail Netlify build)
- npm run build (pre-merge sanity)

## Suggested doc updates (yes/no with exact 1-2 line snippet)
- repo docs/PORTAL.md
- repo docs/AI/STATE.md
- repo docs/AI/NEXT.md
- repo docs/AI/DECISIONS.md
- repo docs/AI/ROADMAP.md
- vault 03 Active Projects/Sano Portal/Open Questions.md
- vault 03 Active Projects/Sano Portal/Follow-ups.md

## Follow-up tasks
<bullets>
```

## Safety rules

- **Do not save raw transcripts.** Summarise instead.
- **No secrets in any saved file.** No credentials, tokens, API keys, `.env` values, customer-identifying data.
- **No destructive operations.** Don't propose `git reset --hard`, `git push --force`, branch deletions, etc., unless I explicitly ask AND the safety case is clear.
- **No `.env` edits.** Ever.
- **No commits.** Cowork shouldn't propose commits. If a commit is the right next step, say "this should be committed by Claude Code" and provide the recommended commit message.

## Style guidance

- Concise. The Sano repo `CLAUDE.md` is the pattern — slim navigation hub, link-out for depth.
- NZ English (organise, colour, fibre, metres).
- Brand non-negotiables (per `CLAUDE.md`): forbidden phrases "premium", "eco-friendly", "industry-leading"; sage palette only; Noto Serif + Outfit (marketing) / Inter (portal); portal UX = clarity over flashy.
- For PR descriptions and commit messages, follow the conventional-commit-ish style of recent commits (`docs:`, `fix(send):`, `feat(invoices):`, etc.).

## See also

- Wider Sano business: `C:\Projects\Sano\COWORK.md`
- Sano repo orientation: `C:\Projects\Sano\01-Site\CLAUDE.md`
- Operating mode: `C:\Projects\Sano\01-Site\docs\AI\SANO_EXECUTION_MODE.md`
- Architecture brief: `C:\Projects\Sano\01-Site\docs\PORTAL.md`
- Sano Portal hub: `C:\Second Brain\03 Active Projects\Sano Portal\Sano Portal.md`
- Generic Cowork starter: `C:\Second Brain\06 Prompts\General\Cowork Session Starter.md`
- Workflow: `C:\Second Brain\99 System\Session Workflow.md`
