-- ════════════════════════════════════════════════════════════════════
--  Phase E — contractor payroll foundation.
--
--  Adds the hours-approval snapshot layer on job_workers + a sibling
--  pay_run_items table that tracks contractor-hours-based pay run
--  lines. Keeps the existing employee payroll path (pay_runs +
--  pay_run_lines + payslips via nz-paye) untouched.
--
--  Flow:
--    1. Completed job → admin opens job page → clicks Approve Hours
--       per worker. approveJobWorkerHours snapshots pay_rate (from
--       contractors.hourly_rate at approval time) + approved_hours
--       + approved_at + approved_by, sets pay_status='approved'.
--    2. Approved rows surface on /portal/payroll/contractor-pending.
--    3. (Phase E.1) Admin creates a contractor pay run → bundles
--       approved rows into pay_run_items → marks paid.
--
--  job_workers additions (all nullable so existing rows stay valid):
--    pay_rate         numeric — rate at approval; never overwritten
--    pay_type         text    — typically 'hourly' (future: 'fixed')
--    approved_hours   numeric — admin-adjustable, defaults to actual
--    approved_at      timestamptz
--    approved_by      uuid    → auth.users
--    pay_status       text    default 'pending', CHECK in the five
--                              allowed values.
--
--  pay_runs additions:
--    kind text default 'employee' — distinguishes the legacy
--    employee salary run ('employee', uses pay_run_lines) from the
--    new contractor hours run ('contractor', uses pay_run_items).
--
--  pay_run_items (new):
--    Per-job_worker line in a contractor pay run. composite unique
--    (pay_run_id, job_id, contractor_id) — a worker's job hours
--    can only appear once per pay run.
--
--  Safe to re-run: every statement uses IF NOT EXISTS / checks
--  before adding constraints.
-- ════════════════════════════════════════════════════════════════════

-- ── job_workers pay snapshot ────────────────────────────────────

alter table public.job_workers
  add column if not exists pay_rate numeric;
alter table public.job_workers
  add column if not exists pay_type text default 'hourly';
alter table public.job_workers
  add column if not exists approved_hours numeric;
alter table public.job_workers
  add column if not exists approved_at timestamptz;
alter table public.job_workers
  add column if not exists approved_by uuid
    references auth.users(id) on delete set null;
alter table public.job_workers
  add column if not exists pay_status text default 'pending';

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'job_workers'
      and constraint_name = 'job_workers_pay_status_check'
  ) then
    alter table public.job_workers
      add constraint job_workers_pay_status_check
      check (pay_status in (
        'pending',
        'approved',
        'included_in_pay_run',
        'paid'
      ));
  end if;
end $$;

comment on column public.job_workers.pay_rate is
  'Rate snapshot at approval time. Never overwritten once set — preserves pay history even when contractors.hourly_rate changes.';
comment on column public.job_workers.pay_type is
  'Rate basis. Currently "hourly"; extension point for "fixed" / per-visit pay later.';
comment on column public.job_workers.approved_hours is
  'Admin-approved hours for pay. Defaults to actual_hours at approval but can be adjusted.';
comment on column public.job_workers.pay_status is
  'pending → approved → included_in_pay_run → paid. Set by approveJobWorkerHours + pay-run actions.';

-- Partial index for the pending-pay dashboard query.
create index if not exists job_workers_pay_status_approved_idx
  on public.job_workers (pay_status)
  where pay_status = 'approved';

-- ── pay_runs.kind ───────────────────────────────────────────────

alter table public.pay_runs
  add column if not exists kind text default 'employee';

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'pay_runs'
      and constraint_name = 'pay_runs_kind_check'
  ) then
    alter table public.pay_runs
      add constraint pay_runs_kind_check
      check (kind in ('employee', 'contractor'));
  end if;
end $$;

comment on column public.pay_runs.kind is
  'employee = uses pay_run_lines via nz-paye. contractor = uses pay_run_items with approved job hours.';

-- ── pay_run_items (new) ─────────────────────────────────────────

create table if not exists public.pay_run_items (
  id              uuid         primary key default gen_random_uuid(),
  pay_run_id      uuid         not null
                               references public.pay_runs(id) on delete cascade,
  job_id          uuid         not null
                               references public.jobs(id) on delete restrict,
  contractor_id   uuid         not null
                               references public.contractors(id) on delete restrict,
  approved_hours  numeric      not null,
  pay_rate        numeric      not null,
  amount          numeric      not null,
  status          text         not null default 'pending',
  note            text,
  created_at      timestamptz  not null default now(),
  unique (pay_run_id, job_id, contractor_id)
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'pay_run_items'
      and constraint_name = 'pay_run_items_status_check'
  ) then
    alter table public.pay_run_items
      add constraint pay_run_items_status_check
      check (status in ('pending', 'approved', 'paid', 'void'));
  end if;
end $$;

comment on table public.pay_run_items is
  'Phase E: contractor-side pay run lines. One row per (pay_run, job, contractor). amount = approved_hours × pay_rate at snapshot time.';

create index if not exists pay_run_items_pay_run_id_idx
  on public.pay_run_items (pay_run_id);
create index if not exists pay_run_items_contractor_id_idx
  on public.pay_run_items (contractor_id);
create index if not exists pay_run_items_job_id_idx
  on public.pay_run_items (job_id);

-- ── RLS ─────────────────────────────────────────────────────────
-- Staff read; admin write. Contractors never see pay_run_items at
-- all (they view their own jobs via the contractor portal which
-- never queries this table).

alter table public.pay_run_items enable row level security;

drop policy if exists "pay_run_items staff read" on public.pay_run_items;
create policy "pay_run_items staff read"
  on public.pay_run_items
  for select to authenticated
  using (not public.is_contractor());

drop policy if exists "pay_run_items admin write" on public.pay_run_items;
create policy "pay_run_items admin write"
  on public.pay_run_items
  for all to authenticated
  using      ((select auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((select auth.jwt() ->> 'email') = 'michael@sano.nz');
