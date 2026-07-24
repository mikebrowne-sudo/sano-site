# Schema baseline — 2026-07-24 (Onboarding & Compliance programme, Phase 0)

Read-only capture of production structures that had **no tracked migration**
(created directly in Supabase / via hand-run SQL). Committed so the repo
accurately represents the live DB before later phases layer changes on top.

The `.sql` files here are **idempotent and non-destructive** (`create/alter … if
not exists`) — running them against production is a no-op. They exist for an
accurate record and fresh-environment reproducibility, not to be "applied".

## Files
- `2026-07-24-baseline-training.sql` — `training_modules`, `worker_training_assignments`
- `2026-07-24-baseline-contractor-incidents.sql` — `contractor_incidents` (staff performance/complaint log)
- `2026-07-24-baseline-contractor-payroll-tax.sql` — employee payroll/tax/KiwiSaver + contractor tax-treatment columns on `contractors`

## Live snapshot at capture
| Table | Rows | Notes |
|---|---|---|
| `training_modules` | 4 | all `auto_assign`; only worker-type targeting |
| `worker_training_assignments` | 0 | **no worker has ever done a module** — clean slate for H&S |
| `contractor_onboarding` | 97 | already migrated (phase-5-3); no baseline needed |
| `contractor_incidents` | 0 | staff log; not the worker H&S model |
| `contractors` | 9 contractor + 3 employee | all 9 contractors `tax_treatment='pending_review'` (no schedular) |

## Flagged issues (addressed in later phases, NOT by this baseline)
1. **Stale KiwiSaver defaults** — `kiwisaver_employee_rate` & `kiwisaver_employer_rate` both `DEFAULT 3` at the column level (pre-1-Apr-2026). → Phase 1.
2. **Employee KS data-quality** — 1 enrolled employee at `employee_rate=3` with `rate_source='standard'` (invalid from 1 Apr 2026 unless a temporary reduction). → compliance confirmation required; not auto-changed.
3. **RLS holes (`FOR ALL TO authenticated USING(true)`)** on `contractor_incidents`, `worker_training_assignments`, `training_modules` — admit contractor logins. 0 rows today. → `contractor_incidents` + `training_modules` tightened in Phase 1; `worker_training_assignments` gets contractor-owns-row RLS in Phase 5.
4. **`kiwisaver_optout` table does not exist in prod** — the repo migration file was never applied. → retire the stale file (Phase 4); no competing live data source.
