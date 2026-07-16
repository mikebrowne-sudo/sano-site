# `id_sighted` — deprecation note (Phase 1)

Date: 2026-07-16
Decision: **deprecate now, drop later** (not dropped in Phase 1, per Mike).

## Audit performed

Full reference + live-data check across the codebase and database.

| Surface checked | Result |
|---|---|
| Application code (reads/writes) | **No** app code reads or writes `id_sighted`. Only the DDL migration files (`2026-07-04-contractor-agreement-fields.sql`, `2026-07-08-agreement-capture-link.sql`) mention it, where the columns are defined. |
| Database functions | None reference it (`pg_get_functiondef ilike '%id_sighted%'` → empty). |
| Views / materialized views | None reference it (`pg_get_viewdef` → empty). |
| Triggers | None reference it (`pg_get_triggerdef` → empty). |
| Migrations | Defined only (never populated by a backfill). |
| Reports / exports | No reference. |
| Agreement generation + PDFs | `EmploymentAgreementDocument` / `agreementViewFromRow` do **not** read it; not shown on the document or PDF. |
| Employee & contractor flows | Sign form + `ContractorForm` capture no `id_sighted` value; the sign action's update object never sets it. |
| Live rows with a value | `contractors` 0/11, `employment_agreements` 0/2, `employees` 0/0 → **zero non-null values anywhere**. |

## Meaning vs `id_verified`

`id_sighted` (a bare boolean "someone saw the ID") is **not** semantically
distinct from the onboarding checklist's `id_verified` step (staff confirmed the
ID). The upcoming verification flow splits this into `id_uploaded` (contractor
attaches ID) + `id_verified` (Sano confirms), which fully supersedes the intent
of `id_sighted`. It is therefore **genuinely redundant**.

## Action taken in Phase 1

- Nothing in code writes `id_sighted`, so there is nothing to stop writing — it is
  already inert. Marked deprecated here.
- **Columns left in place** on `contractors`, `employment_agreements`, `employees`.
- Removal deferred to a later cleanup migration, to run **after** the new
  `id_uploaded` / `id_verified` verification flow is live and tested.

## Later cleanup migration (do NOT run yet)

```sql
-- Run only after the id_uploaded/id_verified verification flow is live + tested.
alter table public.contractors            drop column if exists id_sighted;
alter table public.employment_agreements  drop column if exists id_sighted;
alter table public.employees              drop column if exists id_sighted;
```
