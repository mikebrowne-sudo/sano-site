-- ============================================================================
-- Employment type on the agreement (casual / part-time / full-time). Mike-run.
-- ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Lets the create-agreement form offer Casual / Part-time / Full-time and record
-- which was chosen, so the signed document shows "Permanent full-time" vs
-- "Permanent part-time" (and the sign flow sets the worker's employment_type).
-- The legal clause set still comes from agreement_type (casual_employee vs
-- permanent_employee); this column is the sub-classification only.
--
-- No backfill. Existing agreements keep employment_type = null (the document
-- falls back to "Permanent part-time" for permanent, as before).
--
-- Run PREFLIGHT first, then MIGRATION.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements' and column_name='employment_type';  -- expect empty


-- ---- MIGRATION --------------------------------------------------------------
begin;

alter table public.employment_agreements add column if not exists employment_type text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='employment_agreements_employment_type_chk') then
    alter table public.employment_agreements add constraint employment_agreements_employment_type_chk
      check (employment_type is null or employment_type in ('casual','part_time','full_time'));
  end if;
end $$;

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements' and column_name='employment_type';  -- 1 row
select conname, pg_get_constraintdef(oid) from pg_constraint where conname='employment_agreements_employment_type_chk';


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   alter table public.employment_agreements drop constraint if exists employment_agreements_employment_type_chk;
--   alter table public.employment_agreements drop column if exists employment_type;
-- commit;
