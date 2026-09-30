-- 2026-09-30 — completed-visits billing: weekly cadence + GST-inclusive rates.
--   invoice_frequency  'monthly' (invoice day, last month) | 'weekly' (Mondays, last Mon–Sun)
--   rate_includes_gst  per_visit_rate already includes GST (e.g. $180 incl.)
-- Defaults keep every existing schedule exactly as it is. Additive + idempotent.
-- Run BEFORE merging (the recurring edit form reads/writes these columns).

alter table public.recurring_jobs
  add column if not exists invoice_frequency text not null default 'monthly',
  add column if not exists rate_includes_gst boolean not null default false;

alter table public.recurring_jobs drop constraint if exists recurring_jobs_invoice_frequency_check;
alter table public.recurring_jobs add constraint recurring_jobs_invoice_frequency_check
  check (invoice_frequency in ('monthly', 'weekly'));
