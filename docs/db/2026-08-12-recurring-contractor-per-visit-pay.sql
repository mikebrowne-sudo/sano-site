-- 2026-08-12 — Recurring jobs: per-visit contractor pay.
--
-- Customer billing can already be per-visit (billing_mode = 'per_visit'). The
-- CONTRACTOR payable was always a flat contractor_monthly_pay. This adds the
-- same option on the pay side so a contractor paid per clean is paid the actual
-- number of cleans that month (which varies), not a flat figure.
--
--   contractor_pay_mode      'fixed' (flat contractor_monthly_pay, default) or
--                            'per_visit' (contractor_per_visit_rate × service days that month).
--   contractor_per_visit_rate  $ per clean paid to the contractor (ex-GST).
--
-- Reuses the existing service_days_of_week (the cleans are the cleans regardless
-- of who is charged/paid). Existing contracts stay 'fixed' — no change.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.recurring_jobs
  add column if not exists contractor_pay_mode text not null default 'fixed'
    check (contractor_pay_mode in ('fixed','per_visit')),
  add column if not exists contractor_per_visit_rate numeric;

comment on column public.recurring_jobs.contractor_pay_mode is
  'fixed = flat contractor_monthly_pay each month; per_visit = contractor_per_visit_rate × service days in the billing month.';
comment on column public.recurring_jobs.contractor_per_visit_rate is
  'Amount paid to the contractor per clean/visit (ex-GST). Used only when contractor_pay_mode = per_visit.';

commit;
