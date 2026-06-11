-- 2026-06-12 — Contractor self-read on job_workers (pay statement).
--
-- The contractor pay statement (/contractor/payroll) reads each
-- contractor's own job_workers rows to compute their pay (allowed +
-- approved extra hours × snapshotted pay_rate). Most job_workers RLS
-- policies are staff-only (NOT public.is_contractor()), so without an
-- explicit self-read policy the statement would come back empty under
-- RLS.
--
-- This adds a PERMISSIVE select policy scoped to the signed-in
-- contractor's own rows (contractor_id maps to the contractor whose
-- contractors.auth_user_id = auth.uid()). Permissive policies are
-- OR'd with the existing staff policies, so this only GRANTS the
-- contractor access to their OWN rows — it cannot widen staff access
-- or expose other contractors' pay.
--
-- Additive + idempotent. Run in Supabase SQL Editor before deploying.

begin;

alter table public.job_workers enable row level security;

drop policy if exists "job_workers contractor reads own" on public.job_workers;
create policy "job_workers contractor reads own"
  on public.job_workers
  for select
  to authenticated
  using (
    contractor_id in (
      select c.id from public.contractors c
      where c.auth_user_id = auth.uid()
    )
  );

commit;
