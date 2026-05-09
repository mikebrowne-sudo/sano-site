# Obsidian Second Brain - Pointer

This repo is the source of truth for the Sano portal. Personal/cross-project notes, prompts, decisions outside the portal, Mammoth/Warmwise/Insulation Direct/Insulation Ecosystem knowledge, and Claude Code session logs live in an Obsidian vault outside this repo.

## Vault location
- **Path:** `F:\Second Brain\`
- **Form:** Plain Markdown vault. Human-readable. Not a database, not a RAG system, not a backup of this repo.

## Vault structure (top-level)
```
00 Inbox
01 Life & Personal
02 Business & Work       (Sano, Mammoth, Insulation Direct, Warmwise, Insulation Ecosystem)
03 Active Projects        (Sano Portal, Insulation Direct Build, Warmwise Build,
                           Insulation Ecosystem Shared Platform, Mum's House Build)
04 Claude Sessions        (per-area session logs)
05 Decisions              (personal / cross-project ADRs)
06 Prompts                (per-area reusable prompts)
07 Code Notes             (cross-project tech patterns)
08 Business Ideas
09 Sales & Marketing
10 Technical Knowledge
11 Reference Library
99 System                 (templates, log archive, vault rules)
```

## Source-of-truth split

| Topic | Lives in |
|---|---|
| Sano portal architecture, phased history, schema | This repo - [`docs/PORTAL.md`](../PORTAL.md) |
| Sano operating mode | This repo - [`docs/AI/SANO_EXECUTION_MODE.md`](./SANO_EXECUTION_MODE.md) |
| Sano current/upcoming/decisions | This repo - [`STATE.md`](./STATE.md), [`NEXT.md`](./NEXT.md), [`DECISIONS.md`](./DECISIONS.md) |
| Sano specs/plans (per-feature) | This repo - `docs/superpowers/specs/` and `plans/` |
| Sano migrations | This repo - `docs/db/` |
| Mammoth durable knowledge | Vault - `02 Business & Work\Mammoth\` |
| Mammoth operational files | Disk - `F:\Mammoth\` |
| Warmwise durable knowledge | Vault - `02 Business & Work\Warmwise\` |
| Warmwise operational files | Disk - `F:\WarmWise\` |
| Insulation Direct knowledge | Vault - `02 Business & Work\Insulation Direct\` (no disk folder yet) |
| Insulation Ecosystem (shared layer) | Vault - `02 Business & Work\Insulation Ecosystem\` |
| Personal/cross-project notes, prompts, sessions, decisions | Vault |

## Key rule
**Vault links to repo content. Never duplicates it.** If a fact lives in `docs/PORTAL.md`, the vault hub for Sano Portal should link to it - never copy it.

## How Claude Code uses the vault
- The vault is **outside** this repo. It is not loaded by Claude Code session start.
- Vault is for *durable* knowledge across all the user's businesses and projects.
- For Sano portal work, this repo's [`CLAUDE.md`](../../CLAUDE.md) is the entry point. The vault is referenced when the user explicitly invokes it.

## Where Claude Code session logs go
Session logs (one per session, dated `YYYY-MM-DD-<slug>.md`) live at `F:\Second Brain\99 System\Claude Code Logs\` once a session-end hook is wired (deferred). Until then, drop sessions manually into the matching `04 Claude Sessions\<area>\` folder.
