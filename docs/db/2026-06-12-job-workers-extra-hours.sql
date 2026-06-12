-- 2026-06-12 — Extra-hours sign-off on job_workers (allowed-hours pay model).
--
-- New labour model: a job's labour cost / margin / contractor pay are driven
-- by `jobs.allowed_hours × contractor rate` by default. Only when a job
-- genuinely runs over do staff/admin record EXTRA hours, which an admin must
-- sign off before they affect margin/pay. These columns hold that exception.
--
-- The legacy actual_start_time / actual_end_time / actual_hours columns stay
-- for history but stop being the pay basis.
--
-- Additive + safe. Run in Supabase SQL Editor before deploying the code.

begin;

alter table public.job_workers
  add column if not exists extra_hours numeric not null default 0,
  add column if not exists extra_hours_reason text,
  add column if not exists extra_hours_status text not null default 'none',
  add column if not exists extra_hours_approved_at timestamptz,
  add column if not exists extra_hours_approved_by uuid references auth.users(id) on delete set null;

-- Allowed states: none (default) | pending (recorded, awaiting admin) |
-- approved (counts toward margin/pay) | rejected.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_workers_extra_hours_status_chk') then
    alter table public.job_workers
      add constraint job_workers_extra_hours_status_chk
      check (extra_hours_status in ('none', 'pending', 'approved', 'rejected'));
  end if;
end $$;

comment on column public.job_workers.extra_hours is 'Hours beyond allowed_hours that a job genuinely ran over. Counts toward margin/pay only once extra_hours_status = approved.';
comment on column public.job_workers.extra_hours_status is 'none | pending | approved | rejected. Admin sign-off gate for extra hours.';

create index if not exists idx_job_workers_extra_hours_approved
  on public.job_workers (contractor_id, extra_hours_status)
  where extra_hours_status = 'approved';

commit;
