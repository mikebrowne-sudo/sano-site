-- 2026-06-15 — Add an 'excluded' contractor pay state.
--
-- Lets staff write off a job's contractor pay in the Tidy-up section
-- (e.g. an old test/duplicate job that can't be priced) so it leaves
-- every pay list without being paid. Extends the existing pay_status
-- CHECK to allow 'excluded'.
--
-- Additive + idempotent. Run in Supabase SQL Editor before deploying.

begin;

alter table public.job_workers drop constraint if exists job_workers_pay_status_check;
alter table public.job_workers
  add constraint job_workers_pay_status_check
  check (pay_status in ('pending', 'approved', 'included_in_pay_run', 'paid', 'excluded'));

commit;
