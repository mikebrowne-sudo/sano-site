-- ============================================================================
-- Phase 5 — H&S acknowledgement foundation. Mike-run. ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Adds module-version snapshots + controlled re-acknowledgement to training
-- assignments, an append-only acknowledgement HISTORY (attributable per version),
-- and CLOSES the worker_training_assignments RLS hole (was FOR ALL USING(true) —
-- any authenticated user, incl. contractors, could read/write ALL rows).
--
-- Preserves existing assignments + completions. Does NOT reset any completion,
-- invent a version, or re-gate any worker. Existing acknowledged/completed
-- assignments keep acknowledged_version = NULL (legacy — version not recorded).
--
-- RLS uses the ACTUAL model: is_admin() / is_contractor() exist; "staff" =
-- admin OR active row in the `staff` registry. Workers link via
-- contractors.auth_user_id.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='worker_training_assignments'
  and column_name in ('acknowledged_version','reacknowledgement_required');   -- expect empty
select to_regclass('public.worker_training_acknowledgements') as ack_table;    -- expect null
-- Existing acknowledged/completed assignments that will be treated as legacy:
select count(*) as existing_acked
from public.worker_training_assignments where acknowledged_at is not null or status='completed';
select policyname, cmd, qual from pg_policies
where schemaname='public' and tablename='worker_training_assignments' order by policyname;  -- shows the USING(true) hole


-- ---- MIGRATION --------------------------------------------------------------
begin;

-- 1. Version snapshot + re-ack flag on the assignment.
alter table public.worker_training_assignments add column if not exists acknowledged_version       text;
alter table public.worker_training_assignments add column if not exists reacknowledgement_required  boolean not null default false;

-- 2. Append-only acknowledgement history (one row per ack / re-ack).
create table if not exists public.worker_training_acknowledgements (
  id                  uuid primary key default gen_random_uuid(),
  assignment_id       uuid not null references public.worker_training_assignments(id) on delete cascade,
  contractor_id       uuid not null references public.contractors(id) on delete cascade,
  training_module_id  uuid not null references public.training_modules(id) on delete cascade,
  module_version      text,
  acknowledged_at     timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index if not exists wta_ack_assignment_idx on public.worker_training_acknowledgements (assignment_id);
create index if not exists wta_ack_contractor_idx on public.worker_training_acknowledgements (contractor_id);

-- 3. Close the RLS hole on worker_training_assignments.
--    Workers get READ-ONLY on their own rows. They have NO direct UPDATE — the
--    acknowledge server action performs the write via the service-role path
--    after deriving everything itself, so a worker cannot set status / clear a
--    re-ack flag / fabricate a version / backdate a timestamp via the API.
alter table public.worker_training_assignments enable row level security;
drop policy if exists "Staff full access to worker_training_assignments" on public.worker_training_assignments;
drop policy if exists wta_worker_update_own on public.worker_training_assignments;  -- removed: no worker direct UPDATE
drop policy if exists wta_worker_read_own on public.worker_training_assignments;
create policy wta_worker_read_own on public.worker_training_assignments
  for select using (exists (select 1 from public.contractors c where c.id = contractor_id and c.auth_user_id = auth.uid()));
drop policy if exists wta_staff_all on public.worker_training_assignments;
create policy wta_staff_all on public.worker_training_assignments
  for all using (
    public.is_admin() or exists (select 1 from public.staff s where s.auth_user_id = auth.uid() and s.access_disabled_at is null)
  ) with check (
    public.is_admin() or exists (select 1 from public.staff s where s.auth_user_id = auth.uid() and s.access_disabled_at is null)
  );

-- 3b. Close the training_modules WRITE hole (was FOR ALL USING(true)): anyone
--     authenticated may READ modules (workers need their content), but only
--     staff may EDIT (incl. module versions).
drop policy if exists "Staff full access to training_modules" on public.training_modules;
drop policy if exists tm_authenticated_read on public.training_modules;
create policy tm_authenticated_read on public.training_modules for select to authenticated using (true);
drop policy if exists tm_staff_write on public.training_modules;
create policy tm_staff_write on public.training_modules
  for all using (
    public.is_admin() or exists (select 1 from public.staff s where s.auth_user_id = auth.uid() and s.access_disabled_at is null)
  ) with check (
    public.is_admin() or exists (select 1 from public.staff s where s.auth_user_id = auth.uid() and s.access_disabled_at is null)
  );

-- 4. RLS for the acknowledgement history: worker own READ only; staff read.
--    Workers have NO direct INSERT — history rows are written only by the
--    service-role acknowledge action, from DB-derived IDs + version + server
--    timestamp. This prevents a worker fabricating / backdating a record.
alter table public.worker_training_acknowledgements enable row level security;
drop policy if exists wta_ack_worker_insert on public.worker_training_acknowledgements;  -- removed: no worker direct INSERT
drop policy if exists wta_ack_worker_read on public.worker_training_acknowledgements;
create policy wta_ack_worker_read on public.worker_training_acknowledgements
  for select using (exists (select 1 from public.contractors c where c.id = contractor_id and c.auth_user_id = auth.uid()));
drop policy if exists wta_ack_staff_read on public.worker_training_acknowledgements;
create policy wta_ack_staff_read on public.worker_training_acknowledgements
  for select using (
    public.is_admin() or exists (select 1 from public.staff s where s.auth_user_id = auth.uid() and s.access_disabled_at is null)
  );

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select column_name from information_schema.columns where table_schema='public' and table_name='worker_training_assignments'
  and column_name in ('acknowledged_version','reacknowledgement_required') order by column_name;   -- 2 rows
select to_regclass('public.worker_training_acknowledgements') as ack_table;    -- not null
-- Assignments: worker gets ONLY a SELECT policy; NO worker UPDATE; staff = ALL.
-- (Expect wta_worker_read_own=SELECT, wta_staff_all=ALL. No worker cmd='UPDATE'.)
select policyname, cmd from pg_policies where schemaname='public' and tablename='worker_training_assignments' order by policyname;
-- Ack history: worker gets ONLY a SELECT policy; NO worker INSERT; staff read.
-- (Expect wta_ack_worker_read=SELECT, wta_ack_staff_read=SELECT. No cmd='INSERT'.)
select policyname, cmd from pg_policies where schemaname='public' and tablename='worker_training_acknowledgements' order by policyname;
-- Existing completions preserved + not versioned (legacy):
select count(*) as legacy_acked_no_version from public.worker_training_assignments
where acknowledged_at is not null and acknowledged_version is null;
select count(*) as reack_flagged from public.worker_training_assignments where reacknowledgement_required;  -- expect 0


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   drop table if exists public.worker_training_acknowledgements cascade;
--   alter table public.worker_training_assignments
--     drop column if exists acknowledged_version,
--     drop column if exists reacknowledgement_required;
--   -- Restore the prior (permissive) policy if you must revert access:
--   drop policy if exists wta_worker_read_own on public.worker_training_assignments;
--   drop policy if exists wta_worker_update_own on public.worker_training_assignments;
--   drop policy if exists wta_staff_all on public.worker_training_assignments;
--   create policy "Staff full access to worker_training_assignments" on public.worker_training_assignments for all to authenticated using (true) with check (true);
-- commit;
