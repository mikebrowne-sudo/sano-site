-- PR1 — cadence-aware employee pay runs + double-pay guard.
-- Run in the Supabase SQL editor BEFORE merging/deploying the PR1 code.
-- Safe + idempotent. No data backfill: existing runs keep pay_frequency = null
-- and are excluded from the guard (partial index), so nothing historical moves.

-- 1) Cadence on the run, so a weekly run pulls only weekly staff (and a
--    fortnightly run only fortnightly staff).
alter table public.pay_runs
  add column if not exists pay_frequency text;

alter table public.pay_runs
  drop constraint if exists pay_runs_pay_frequency_check;
alter table public.pay_runs
  add constraint pay_runs_pay_frequency_check
  check (pay_frequency is null or pay_frequency in ('weekly', 'fortnightly'));

-- 2) Double-pay guard: at most ONE employee run per cycle per period-end.
--    Partial (cadence-tagged employee runs only) so historical null-frequency
--    runs and contractor runs are untouched. A duplicate insert now fails with
--    23505, which createPayRun surfaces as a friendly message.
create unique index if not exists pay_runs_employee_cycle_period_uniq
  on public.pay_runs (pay_frequency, pay_period_end)
  where kind = 'employee' and pay_frequency is not null;
