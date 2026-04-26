-- ════════════════════════════════════════════════════════════════════
--  Phase 5.3 — Onboarding system + worker_type restructure.
--
--  Two related changes:
--    A. contractors.worker_type collapses from 4 values to 2; the old
--       sub-classification (casual / part_time / full_time) moves to a
--       new contractors.employment_type column.
--    B. New contractor_onboarding table holds the per-contractor
--       checklist that drives onboarding completion.
--
--  Additive + migrating, no destructive operations. Idempotent —
--  every constraint / column / table / index is guarded.
-- ════════════════════════════════════════════════════════════════════

-- ── A. worker_type restructure ────────────────────────────────────

alter table public.contractors
  add column if not exists employment_type text;

-- Drop the old worker_type CHECK first so the migration UPDATEs are
-- not rejected by the pre-existing 4-value constraint.
alter table public.contractors drop constraint if exists contractors_worker_type_check;

-- Migrate existing rows: any non-'contractor' worker_type maps to
-- worker_type='employee' + employment_type=<old value>.
update public.contractors
   set employment_type = worker_type
 where worker_type in ('casual','part_time','full_time')
   and employment_type is null;

update public.contractors
   set worker_type = 'employee'
 where worker_type in ('casual','part_time','full_time');

-- Re-add worker_type CHECK as the new 2-value enum.
alter table public.contractors add constraint contractors_worker_type_check
  check (worker_type in ('contractor','employee'));

-- New employment_type CHECK — nullable for contractors, restricted
-- enum for employees.
alter table public.contractors drop constraint if exists contractors_employment_type_check;
alter table public.contractors add constraint contractors_employment_type_check
  check (employment_type is null or employment_type in ('casual','part_time','full_time'));

-- ── B. contractor_onboarding ─────────────────────────────────────

create table if not exists public.contractor_onboarding (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid not null references public.contractors(id) on delete cascade,
  section         text not null,           -- "Personal Details" / "Payment Details" / "Compliance" / "Documents" / "Training"
  item_key        text not null,           -- stable code, e.g. "confirm_details"
  label           text not null,           -- human-readable label
  status          text not null default 'pending'
                    check (status in ('pending','complete')),
  sort_order      integer not null default 0,
  completed_at    timestamptz,
  completed_by    uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (contractor_id, item_key)
);

create index if not exists contractor_onboarding_contractor_idx
  on public.contractor_onboarding(contractor_id);
create index if not exists contractor_onboarding_pending_idx
  on public.contractor_onboarding(contractor_id) where status = 'pending';

alter table public.contractor_onboarding enable row level security;

drop policy if exists co_staff_select on public.contractor_onboarding;
create policy co_staff_select on public.contractor_onboarding
  for select using (not public.is_contractor());

drop policy if exists co_admin_write on public.contractor_onboarding;
create policy co_admin_write on public.contractor_onboarding
  for all
  using ((auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((auth.jwt() ->> 'email') = 'michael@sano.nz');
