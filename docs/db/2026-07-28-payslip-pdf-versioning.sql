-- ============================================================================
-- Payslip PDF foundation — immutable snapshot + versioning (Payslip PR1).
-- Mike-run. ADDITIVE + IDEMPOTENT. One paste-and-run.
-- ============================================================================
-- Extends payslips so a run can have MULTIPLE versions (an official v1 at paid,
-- then corrected versions), with exactly ONE current per pay-run line enforced by
-- the DB. The official PDF is generated only once a run is paid, from the frozen
-- approved figures + payment metadata captured in `snapshot`. Private storage
-- (reuses the existing private `worker-documents` bucket, `payslips/` prefix).
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='payslips'
  and column_name in ('reference','version','snapshot','storage_path','generated_at','superseded_by','is_current');  -- expect empty
select conname from pg_constraint where conrelid='public.payslips'::regclass and contype='u';  -- note the pay_run_line_id unique


-- ---- MIGRATION --------------------------------------------------------------
begin;

alter table public.payslips
  add column if not exists reference     text,
  add column if not exists version       int  not null default 1,
  add column if not exists snapshot      jsonb,
  add column if not exists storage_path  text,
  add column if not exists generated_at  timestamptz,
  add column if not exists superseded_by uuid references public.payslips(id),
  add column if not exists is_current    boolean not null default true;

-- Enforce exactly ONE CURRENT version per line (DB-enforced). This coexists
-- safely with the existing unique(pay_run_line_id) while that constraint remains.
create unique index if not exists payslips_current_per_line_uniq
  on public.payslips (pay_run_line_id) where is_current;

-- NOTE: the old unique(pay_run_line_id) is NOT dropped here — the currently-live
-- approvePayRun upserts on it, so dropping it before PR #450 deploys would break
-- approvals in production. It's dropped by a one-line follow-up AFTER #450 merges
-- (once no code relies on it). Until then only version 1 exists per line, which
-- the old unique permits — nothing is blocked for PR1.

-- A payslip reference (permanent document ID) is unique when assigned.
create unique index if not exists payslips_reference_uniq
  on public.payslips (reference) where reference is not null;

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='payslips'
  and column_name in ('reference','version','snapshot','storage_path','generated_at','superseded_by','is_current')
order by column_name;   -- 7 rows
-- The current-per-line + reference partial uniques exist (old unique still present):
select indexname from pg_indexes where schemaname='public' and tablename='payslips'
  and indexname in ('payslips_current_per_line_uniq','payslips_reference_uniq');   -- 2 rows


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   drop index if exists public.payslips_current_per_line_uniq;
--   drop index if exists public.payslips_reference_uniq;
--   alter table public.payslips
--     drop column if exists reference, drop column if exists version, drop column if exists snapshot,
--     drop column if exists storage_path, drop column if exists generated_at,
--     drop column if exists superseded_by, drop column if exists is_current;
--   -- (the original payslips_pay_run_line_id_key unique is NOT restored automatically)
-- commit;
