-- 2026-09-30 — recurring billing mode 'completed_visits'.
-- Bills last month's COMPLETED visits (rate per visit × visits done), one
-- invoice per month, jobs linked. Adds the value to the existing check.
-- Additive + idempotent. Run BEFORE saving any schedule with the new mode.

alter table public.recurring_jobs drop constraint if exists recurring_jobs_billing_mode_check;
alter table public.recurring_jobs add constraint recurring_jobs_billing_mode_check
  check (billing_mode = any (array['fixed'::text, 'per_visit'::text, 'completed_visits'::text]));
