-- ============================================================================
-- Phase 1 — KiwiSaver consistency (Mike-run). ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Aligns the database with the 1 April 2026 KiwiSaver rules (standard/minimum
-- 3.5% for both employee and employer; 3% valid only under a temporary rate
-- reduction). It changes only column DEFAULTS and adds ONE CHECK constraint.
--
-- It does NOT modify any existing contractor/employee row. In particular it does
-- NOT touch the one employee currently stored at 3% (Radhika Dhungel) — that is
-- left for a separate, informed decision (valid temporary reduction vs 3.5%).
--
-- Run the PREFLIGHT block first (read-only) and review the results before
-- applying the MIGRATION block.
-- ============================================================================


-- ============================================================================
-- PREFLIGHT (read-only — run and review BEFORE the migration)
-- ============================================================================
-- (a) Employees at a 3% employee rate:
select id, full_name, kiwisaver_employee_rate, kiwisaver_rate_source, kiwisaver_temp_reduction_expiry
from public.contractors
where worker_type = 'employee' and kiwisaver_employee_rate = 3;

-- (b) Employees with an employer rate below 3.5%:
select id, full_name, kiwisaver_enrolled, kiwisaver_employer_rate
from public.contractors
where worker_type = 'employee' and kiwisaver_employer_rate < 3.5;

-- (c) Any KiwiSaver employee rate outside the proposed allowed set {3,3.5,4,6,8,10}:
select id, full_name, kiwisaver_employee_rate
from public.contractors
where kiwisaver_employee_rate is not null
  and kiwisaver_employee_rate not in (3, 3.5, 4, 6, 8, 10);

-- (d) Any null rate-source values:
select id, full_name from public.contractors where kiwisaver_rate_source is null;

-- (e) Temporary-reduction rows without an expiry date:
select id, full_name, kiwisaver_temp_reduction_expiry
from public.contractors
where kiwisaver_rate_source = 'temporary_reduction' and kiwisaver_temp_reduction_expiry is null;

-- (f) Expired temporary reductions (as of today):
select id, full_name, kiwisaver_temp_reduction_expiry
from public.contractors
where kiwisaver_rate_source = 'temporary_reduction' and kiwisaver_temp_reduction_expiry < current_date;


-- ============================================================================
-- MIGRATION (apply after reviewing the preflight)
-- ============================================================================
begin;

-- 1) Compliant column defaults (1 Apr 2026 standard/minimum = 3.5%). Affects
--    only NEW rows; existing rows are untouched.
alter table public.contractors alter column kiwisaver_employee_rate set default 3.5;
alter table public.contractors alter column kiwisaver_employer_rate set default 3.5;

-- 2) Allowed-set CHECK on the employee rate. Existing rows are 3 / 3.5 (both in
--    the set) so this validates WITHOUT touching data. NULL is allowed (not
--    enrolled / not set). The finer "3% only under a temporary reduction" rule
--    is enforced in the application, so a historical 3% row stays editable.
--    NOTE: no employer-floor CHECK — existing contractor rows carry a legacy
--    employer 3 (they don't use KiwiSaver), so a hard >= 3.5 CHECK would fail;
--    the floor is enforced in application + at pay time instead.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contractors_kiwisaver_employee_rate_chk') then
    alter table public.contractors add constraint contractors_kiwisaver_employee_rate_chk
      check (kiwisaver_employee_rate is null or kiwisaver_employee_rate in (3, 3.5, 4, 6, 8, 10));
  end if;
end $$;

commit;


-- ============================================================================
-- POST-MIGRATION VERIFICATION (read-only)
-- ============================================================================
-- Defaults are now 3.5 for both columns:
select column_name, column_default from information_schema.columns
where table_schema = 'public' and table_name = 'contractors'
  and column_name in ('kiwisaver_employee_rate', 'kiwisaver_employer_rate');

-- The CHECK constraint exists:
select conname, pg_get_constraintdef(oid)
from pg_constraint where conname = 'contractors_kiwisaver_employee_rate_chk';

-- No employee rate outside the allowed set (expect 0):
select count(*) as invalid_rates from public.contractors
where kiwisaver_employee_rate is not null
  and kiwisaver_employee_rate not in (3, 3.5, 4, 6, 8, 10);

-- Radhika's row is UNCHANGED (still 3 / standard):
select full_name, kiwisaver_employee_rate, kiwisaver_rate_source
from public.contractors where worker_type = 'employee' and kiwisaver_employee_rate = 3;


-- ============================================================================
-- ROLLBACK (if needed — additive migration, clean revert)
-- ============================================================================
-- begin;
--   alter table public.contractors alter column kiwisaver_employee_rate set default 3;
--   alter table public.contractors alter column kiwisaver_employer_rate set default 3;
--   alter table public.contractors drop constraint if exists contractors_kiwisaver_employee_rate_chk;
-- commit;
