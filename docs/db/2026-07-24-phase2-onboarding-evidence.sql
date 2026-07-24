-- ============================================================================
-- Phase 2 — onboarding checklist EVIDENCE MODEL (Mike-run). ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Adds completion-source + override/evidence columns to contractor_onboarding so
-- the checklist becomes a summary of the evidence held (how each item was
-- completed, by whom, when, with what override reason). Backfills the existing
-- 97 completed rows as 'imported_legacy' (their true source can't be
-- reconstructed). Does NOT change any item's status or gating.
--
-- Run the PREFLIGHT first, then the MIGRATION.
-- ============================================================================

-- ---- PREFLIGHT (read-only) --------------------------------------------------
-- Current completion spread (before adding source):
select status, (completed_by is null) as system_completed, count(*)
from public.contractor_onboarding group by 1, 2 order by 1, 2;
-- Rows that will be backfilled to 'imported_legacy' (expect: all complete rows):
select count(*) as complete_rows_to_backfill
from public.contractor_onboarding where status = 'complete';


-- ---- MIGRATION --------------------------------------------------------------
begin;

alter table public.contractor_onboarding add column if not exists completion_source text;
alter table public.contractor_onboarding add column if not exists effective_date    date;
alter table public.contractor_onboarding add column if not exists confirmed_by       text;   -- who performed/confirmed the offline action (free text)
alter table public.contractor_onboarding add column if not exists evidence_ref       text;   -- optional pointer to evidence (doc/module/note)
alter table public.contractor_onboarding add column if not exists override_reason    text;
alter table public.contractor_onboarding add column if not exists override_by        uuid references auth.users(id) on delete set null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contractor_onboarding_completion_source_chk') then
    alter table public.contractor_onboarding add constraint contractor_onboarding_completion_source_chk
      check (completion_source is null or completion_source = any (array[
        'worker_submitted','worker_acknowledged','staff_verified',
        'system_completed','admin_override','imported_legacy']));
  end if;
end $$;

-- Backfill existing COMPLETE rows as imported_legacy (idempotent — only nulls).
-- Pending rows stay null. No status/gating change.
update public.contractor_onboarding
set completion_source = 'imported_legacy'
where status = 'complete' and completion_source is null;

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
-- New columns present:
select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_onboarding'
  and column_name in ('completion_source','effective_date','confirmed_by','evidence_ref','override_reason','override_by')
order by column_name;
-- Every complete row now has a source; no complete row left null (expect 0):
select count(*) as complete_without_source
from public.contractor_onboarding where status='complete' and completion_source is null;
-- Source breakdown:
select completion_source, count(*) from public.contractor_onboarding group by 1 order by 2 desc;


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   alter table public.contractor_onboarding drop constraint if exists contractor_onboarding_completion_source_chk;
--   alter table public.contractor_onboarding
--     drop column if exists completion_source,
--     drop column if exists effective_date,
--     drop column if exists confirmed_by,
--     drop column if exists evidence_ref,
--     drop column if exists override_reason,
--     drop column if exists override_by;
-- commit;
