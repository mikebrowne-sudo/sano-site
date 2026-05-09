# Sano Execution Mode (Persistent Working Instructions)

You are operating inside an existing production-grade Sano portal system.

Before starting any work:

* Read and respect `docs/PORTAL.md` as the primary architecture and system-state reference.
* Review any referenced spec/plan files before implementation.
* Understand the existing patterns before introducing new ones.

Core priorities:

1. Stability
2. No regressions
3. Maintainability
4. Momentum and execution speed
5. Minimal architectural drift

Execution style:

* Prefer implementation over prolonged consultation.
* Do not repeatedly ask for approval during normal safe execution.
* Assume approval for routine development work within the agreed scope.
* Continue automatically through:

  * coding
  * refactors
  * tests
  * reviews
  * commits
  * documentation updates
  * subagent dispatch
  * UI polish
  * route creation
  * helper extraction
  * loading states
  * bug fixes discovered during implementation

Only stop if:

* scope materially changes
* architecture materially changes
* database schema/migrations are required
* production behaviour may unexpectedly change
* there is meaningful regression risk outside the approved scope
* secrets/env/infrastructure changes are required
* multiple materially different implementation paths exist
* destructive actions are required

Development principles:

* Reuse existing patterns before creating new abstractions.
* Keep the portal visually and architecturally consistent.
* Do not rewrite working systems unless explicitly instructed.
* Avoid over-engineering.
* Prefer incremental improvements over large rewrites.
* Keep commits focused and logically grouped.
* Keep changes easy to review and revert if needed.

Testing approach:

* Follow TDD where practical.
* Add targeted tests around changed behaviour.
* Avoid unnecessary snapshot complexity.
* Preserve existing test baselines unless intentionally fixing them.
* Typecheck must remain clean.

UI/UX expectations:

* Maintain the premium Sano CRM feel.
* Respect existing spacing, typography, card/table patterns, and interaction models.
* Avoid introducing inconsistent UI paradigms.
* Prefer clarity and operational usability over flashy design.

Architecture expectations:

* Respect existing route structure, server action patterns, Supabase usage, and shared helpers.
* Extend existing systems before introducing parallel systems.
* Prefer shared helpers for repeated logic.
* Keep customer-facing and internal/staff behaviour clearly separated where appropriate.

Performance expectations:

* Avoid unnecessary client-side complexity.
* Be mindful of Netlify function limits and Puppeteer/runtime costs.
* Prefer practical solutions over theoretically perfect abstractions.

Communication style:

* Be concise and action-oriented.
* Surface meaningful risks early.
* Avoid unnecessary recaps or re-explaining approved decisions.
* Give short progress updates focused on:

  * what changed
  * what matters
  * blockers/risk
  * next step

Hard-stop workflow:

* Use hard stops only at genuinely risky or irreversible points.
* Otherwise continue phase-by-phase automatically.

Branch/PR workflow:

* Follow the repo’s established PR-based workflow unless explicitly instructed otherwise.
* Keep unrelated work isolated from feature branches.
* Avoid mixing large unrelated feature sets into one PR.

When in doubt:

* Preserve the existing system.
* Choose the lower-risk implementation.
* Optimise for shipping stable production improvements quickly.

Deployment parity:
- Local verification must mirror Netlify production verification as closely as possible.
- Do not rely on tests + typecheck alone — `next build` runs ESLint as **errors**, but `npm test` and `npx tsc --noEmit` do not.
- Run `npx next lint` before any `git push`.
- Treat ESLint/build failures as blocking, not optional polish.
- Documented test-suite baseline: 3 pre-existing failing suites (`submit-application`, `services`, `Header`). Anything above that count is a regression.

Workflow tooling:
- **Pre-push gauntlet hook** (`~/.claude/hooks/sano-pre-push-gauntlet.sh`, wired in user-level settings.json as a `PreToolUse` hook on Bash with `if: "Bash(git push*)"`). Auto-runs `npx next lint` + `npm test` before every `git push` from this repo. Lint errors or test-suite failures above the baseline block the push and surface a `{"continue": false, "stopReason": "..."}` JSON output. Cwd-scoped — silent on non-Sano repos.
- **`/sano-ship` slash command** (at `~/.claude/commands/sano-ship.md`). Verifies clean working tree → not on main → fresh `origin/main` → merge-base hygiene → push (gauntlet auto-fires) → opens PR via `gh pr create` (or surfaces the new-PR URL if `gh` isn't installed) → returns the link. Optional argument: PR title override.
- If the gauntlet hook fails to fire on a fresh-install session (the harness's settings watcher only picks up hooks present at session start), open `/hooks` to reload or run the gauntlet manually before pushing — never use `--no-verify` to bypass.

Branch and PR hygiene:
- Open PRs from a topical branch off latest `origin/main`, rebased clean.
- Don't open PRs from branches carrying unrelated commits — split with `git rebase --onto origin/main <fork-point>` onto a fresh feature-named branch first.
- Repo uses GitHub PR-based merges (merge commits, not squash). No direct local merges to main.
- `docs/compliance/` and the empty `docs/AI/New Text Document.txt` placeholder are pre-existing operational scratch — never `git add` them.
