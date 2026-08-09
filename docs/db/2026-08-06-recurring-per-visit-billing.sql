-- 2026-08-06 — Recurring jobs: per-visit billing option.
--
-- A recurring job can now bill in one of two modes:
--   • 'fixed'     — the existing flat monthly_value every month (default).
--   • 'per_visit' — per_visit_rate × the actual number of scheduled service days
--                   in the billing month, so months with more/fewer visits cost
--                   more/less. service_days_of_week lists which weekdays it runs.
--
-- Additive + idempotent. Existing contracts keep 'fixed' with no change.

begin;

alter table public.recurring_jobs
  add column if not exists billing_mode text not null default 'fixed'
    check (billing_mode in ('fixed','per_visit')),
  add column if not exists per_visit_rate numeric,          -- $ per service day (ex-GST), used when billing_mode='per_visit'
  add column if not exists service_days_of_week smallint[]; -- ISO weekdays 1=Mon..7=Sun the job runs on (per_visit only)

comment on column public.recurring_jobs.billing_mode is
  'fixed = flat monthly_value each month; per_visit = per_visit_rate × scheduled service days in the billing month.';
comment on column public.recurring_jobs.per_visit_rate is
  'Price per service visit/day (ex-GST). Used only when billing_mode = per_visit.';
comment on column public.recurring_jobs.service_days_of_week is
  'ISO weekdays (1=Mon..7=Sun) the job is performed on. Used to count visits in the billing month for per_visit billing.';

commit;
