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
--    ON DELETE RESTRICT on every FK: this is retained evidence — a worker,
--    module or assignment with acknowledgement history CANNOT be hard-deleted
--    (archive/deactivate instead). This prevents cascade-erasure of evidence.
create table if not exists public.worker_training_acknowledgements (
  id                  uuid primary key default gen_random_uuid(),
  assignment_id       uuid not null references public.worker_training_assignments(id) on delete restrict,
  contractor_id       uuid not null references public.contractors(id) on delete restrict,
  training_module_id  uuid not null references public.training_modules(id) on delete restrict,
  module_version      text,
  acknowledged_at     timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index if not exists wta_ack_assignment_idx on public.worker_training_acknowledgements (assignment_id);
create index if not exists wta_ack_contractor_idx on public.worker_training_acknowledgements (contractor_id);
-- Duplicate-evidence guard: one history row per (assignment, version). Legacy
-- rows (null version) are exempt. The RPC inserts ON CONFLICT DO NOTHING, so a
-- retry / double-click is idempotent (no duplicate evidence, no error).
create unique index if not exists wta_ack_assignment_version_unique
  on public.worker_training_acknowledgements (assignment_id, module_version)
  where module_version is not null;

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

-- 3b. Tighten training_modules access. READ is restricted to staff, OR a worker
--     who actually has an assignment for that module (no browsing unassigned
--     modules; no public/anon exposure). WRITE (incl. versions) is staff-only.
--     Ownership is checked via a SECURITY DEFINER helper to avoid RLS recursion.
create or replace function public.worker_has_module_assignment(p_module_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.worker_training_assignments a
    join public.contractors c on c.id = a.contractor_id
    where a.training_module_id = p_module_id and c.auth_user_id = auth.uid()
  );
$$;

drop policy if exists "Staff full access to training_modules" on public.training_modules;
drop policy if exists "Anon can read active training_modules" on public.training_modules;  -- removed: no public/anon module read
drop policy if exists tm_authenticated_read on public.training_modules;                     -- removed: was USING(true)
drop policy if exists tm_read on public.training_modules;
create policy tm_read on public.training_modules for select using (
  public.is_admin()
  or exists (select 1 from public.staff s where s.auth_user_id = auth.uid() and s.access_disabled_at is null)
  or public.worker_has_module_assignment(id)
);
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

-- 5. ATOMIC acknowledgement RPC — the ONLY write path. security definer (so it
--    can write past the worker's read-only RLS), but it derives identity from
--    the caller's JWT (auth.uid()) and re-validates ownership + module state, so
--    it trusts NOTHING from the client except the assignment id. The whole body
--    runs in one transaction: the history insert + the assignment update commit
--    together, or both roll back. Idempotent via the unique index (a duplicate
--    ack for the same version writes no new evidence and is not an error).
create or replace function public.record_training_acknowledgement(
  p_assignment_id uuid,
  p_complete boolean default false
) returns table (module_version text, contractor_id uuid, is_new boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_contractor_id uuid;
  v_module_id     uuid;
  v_version       text;
  v_module_status text;
  v_now           timestamptz := now();   -- database/server timestamp
  v_inserted      integer;
begin
  -- Identity from the caller's JWT — never a client-supplied id.
  select c.id into v_contractor_id from public.contractors c where c.auth_user_id = auth.uid();
  if v_contractor_id is null then
    raise exception 'not a worker' using errcode = '42501';
  end if;

  -- Ownership + module (lock the assignment row for this transaction).
  select a.training_module_id, m.version, m.status
    into v_module_id, v_version, v_module_status
  from public.worker_training_assignments a
  join public.training_modules m on m.id = a.training_module_id
  where a.id = p_assignment_id and a.contractor_id = v_contractor_id
  for update of a;
  if v_module_id is null then
    raise exception 'assignment not found for this worker' using errcode = 'P0002';
  end if;
  if v_module_status is distinct from 'active' then
    raise exception 'module not active' using errcode = 'P0001';
  end if;

  -- Append evidence (idempotent for the same assignment+version).
  insert into public.worker_training_acknowledgements (assignment_id, contractor_id, training_module_id, module_version, acknowledged_at)
  values (p_assignment_id, v_contractor_id, v_module_id, v_version, v_now)
  on conflict (assignment_id, module_version) where module_version is not null do nothing;
  get diagnostics v_inserted = row_count;

  -- Update ONLY the intended assignment fields. Same transaction as the insert.
  update public.worker_training_assignments
  set acknowledged_at = v_now,
      acknowledged_version = v_version,
      reacknowledgement_required = false,
      status = case when p_complete then 'completed' else status end,
      completed_at = case when p_complete then coalesce(completed_at, v_now) else completed_at end
  where id = p_assignment_id and contractor_id = v_contractor_id;

  return query select v_version, v_contractor_id, (v_inserted > 0);
end;
$$;

revoke all on function public.record_training_acknowledgement(uuid, boolean) from public;
grant execute on function public.record_training_acknowledgement(uuid, boolean) to authenticated;

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
-- Module read is restricted (tm_read; NOT USING(true)); write staff-only:
select policyname, cmd, qual from pg_policies where schemaname='public' and tablename='training_modules' order by policyname;
-- The atomic RPC + ownership helper exist:
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('record_training_acknowledgement','worker_has_module_assignment');
-- Duplicate-evidence unique index exists:
select indexname from pg_indexes where schemaname='public' and tablename='worker_training_acknowledgements' and indexname='wta_ack_assignment_version_unique';
-- Evidence FKs are ON DELETE RESTRICT (expect three 'r'):
select conname, confdeltype from pg_constraint where conrelid='public.worker_training_acknowledgements'::regclass and contype='f' order by conname;
-- Existing completions preserved + not versioned (legacy):
select count(*) as legacy_acked_no_version from public.worker_training_assignments
where acknowledged_at is not null and acknowledged_version is null;
select count(*) as reack_flagged from public.worker_training_assignments where reacknowledgement_required;  -- expect 0


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   drop function if exists public.record_training_acknowledgement(uuid, boolean);
--   drop table if exists public.worker_training_acknowledgements cascade;  -- (RESTRICT FKs point INTO this table; dropping the table itself is fine)
--   alter table public.worker_training_assignments
--     drop column if exists acknowledged_version,
--     drop column if exists reacknowledgement_required;
--   -- training_modules policy revert:
--   drop policy if exists tm_read on public.training_modules;
--   drop policy if exists tm_staff_write on public.training_modules;
--   drop function if exists public.worker_has_module_assignment(uuid);
--   create policy "Anon can read active training_modules" on public.training_modules for select to anon using (status = 'active');
--   create policy "Staff full access to training_modules" on public.training_modules for all to authenticated using (true) with check (true);
--   -- worker_training_assignments policy revert:
--   drop policy if exists wta_worker_read_own on public.worker_training_assignments;
--   drop policy if exists wta_staff_all on public.worker_training_assignments;
--   create policy "Staff full access to worker_training_assignments" on public.worker_training_assignments for all to authenticated using (true) with check (true);
-- commit;
