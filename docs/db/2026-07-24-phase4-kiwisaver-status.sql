-- ============================================================================
-- Phase 4 — KiwiSaver membership status model. Mike-run. ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Adds a proper KiwiSaver membership-status model + KS3-provided + KS10 opt-out
-- filed flags to contractors (employees). Does NOT change the payroll
-- kiwisaver_enrolled flag or any rate — existing payroll is preserved. Backfills
-- a best-effort status for existing employees ONLY (contractors stay null):
--   enrolled  -> 'existing_member'  (they are contributing; accurate)
--   not enrolled -> 'review_required'  (staff/fresh declaration to confirm)
-- No opt-out / not-eligible status is INVENTED for a non-enrolled employee.
--
-- Run PREFLIGHT first, then MIGRATION.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
-- Current employee KiwiSaver spread (context for the backfill):
select full_name, kiwisaver_enrolled, kiwisaver_employee_rate, kiwisaver_rate_source, status
from public.contractors where worker_type='employee' order by full_name;
-- Column must not already exist:
select column_name from information_schema.columns
where table_schema='public' and table_name='contractors' and column_name='kiwisaver_status';   -- expect empty


-- ---- MIGRATION --------------------------------------------------------------
begin;

alter table public.contractors add column if not exists kiwisaver_status         text;
alter table public.contractors add column if not exists kiwisaver_ks3_provided   boolean not null default false;
alter table public.contractors add column if not exists kiwisaver_optout_filed   boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='contractors_kiwisaver_status_chk') then
    alter table public.contractors add constraint contractors_kiwisaver_status_chk
      check (kiwisaver_status is null or kiwisaver_status = any (array[
        'existing_member','auto_enrolled','opted_in','not_eligible',
        'savings_suspension','opted_out','review_required']));
  end if;
end $$;

-- Backfill EMPLOYEES only, best-effort, without touching kiwisaver_enrolled.
update public.contractors
set kiwisaver_status = case when kiwisaver_enrolled then 'existing_member' else 'review_required' end
where worker_type = 'employee' and kiwisaver_status is null;

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='contractors'
  and column_name in ('kiwisaver_status','kiwisaver_ks3_provided','kiwisaver_optout_filed')
order by column_name;   -- 3 rows
select conname, pg_get_constraintdef(oid) from pg_constraint where conname='contractors_kiwisaver_status_chk';
-- Employee status backfill + confirm payroll flag UNCHANGED:
select full_name, kiwisaver_enrolled, kiwisaver_status from public.contractors where worker_type='employee' order by full_name;
-- No contractor got a status (KiwiSaver is employee-only):
select count(*) as contractors_with_status from public.contractors where worker_type='contractor' and kiwisaver_status is not null;  -- expect 0


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   alter table public.contractors drop constraint if exists contractors_kiwisaver_status_chk;
--   alter table public.contractors
--     drop column if exists kiwisaver_status,
--     drop column if exists kiwisaver_ks3_provided,
--     drop column if exists kiwisaver_optout_filed;
-- commit;
