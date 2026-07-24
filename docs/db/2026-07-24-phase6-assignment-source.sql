-- ============================================================================
-- Phase 6 — assignment traceability. Mike-run. ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Adds a single `assignment_source` marker to worker_training_assignments so
-- every assignment is attributable and bulk operations (like the Phase 6
-- existing-worker backfill) can be rolled back precisely — without touching any
-- pre-existing / manually created assignment. Does NOT change any assignment's
-- status or completion.
--
-- Existing rows keep assignment_source = NULL (unstamped legacy). Going forward
-- the assignment actions stamp:
--   automatic_on_sign            — auto-assigned when a worker signs
--   manual_staff_assignment      — a staff member assigned it in the portal
--   phase6_existing_worker_backfill — the one-off backfill of existing workers
--   phase7_role_targeting        — (future) role/service-targeted assignment
--   site_specific_assignment     — (future) per-site/job assignment
--   imported_legacy              — (future) an imported record
--
-- RUN ORDER: run THIS migration before deploying the code that stamps the source,
-- and before the existing-worker backfill script. (Signing won't break if it
-- isn't yet applied — the sign-flow auto-assign is wrapped in try/catch — but the
-- source won't be recorded until it is.)
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='worker_training_assignments' and column_name='assignment_source';  -- expect empty


-- ---- MIGRATION --------------------------------------------------------------
begin;

alter table public.worker_training_assignments add column if not exists assignment_source text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='wta_assignment_source_chk') then
    alter table public.worker_training_assignments add constraint wta_assignment_source_chk
      check (assignment_source is null or assignment_source in (
        'automatic_on_sign',
        'manual_staff_assignment',
        'phase6_existing_worker_backfill',
        'phase7_role_targeting',
        'site_specific_assignment',
        'imported_legacy'));
  end if;
end $$;

create index if not exists wta_assignment_source_idx on public.worker_training_assignments (assignment_source);

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='worker_training_assignments' and column_name='assignment_source';  -- 1 row
select conname, pg_get_constraintdef(oid) from pg_constraint where conname='wta_assignment_source_chk';
-- Existing rows are unstamped (null) — nothing was changed:
select assignment_source, count(*) from public.worker_training_assignments group by 1 order by 1 nulls first;


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   alter table public.worker_training_assignments drop constraint if exists wta_assignment_source_chk;
--   drop index if exists public.wta_assignment_source_idx;
--   alter table public.worker_training_assignments drop column if exists assignment_source;
-- commit;
