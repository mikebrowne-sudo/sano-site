-- 2026-07-08 — Casual employee pay runs (portal payroll helper).
--
-- Records each pay for a casual employee: hours × rate (rate inclusive of 8%
-- holiday pay), the computed PAYE (income tax + ACC earner levy — verify-gated
-- rates), KiwiSaver, and net. Backs the payslip + IRD payday-filing figures.
-- Optionally links the wages expense it created (for P&L / reconciliation).
--
-- NOT authoritative payroll software — a helper. PAYE rates must be verified
-- against IRD before real pay. Additive + idempotent.

begin;

create extension if not exists pgcrypto;

create table if not exists public.employee_pay_runs (
  id                     uuid primary key default gen_random_uuid(),
  person_label           text not null,
  tax_code               text not null default 'M',
  pay_period             text not null default 'weekly',   -- weekly | fortnightly | monthly
  period_start           date,
  period_end             date,
  pay_date               date not null,
  hours                  numeric not null default 0,
  rate                   numeric not null default 0,        -- inclusive of 8% holiday pay
  gross                  numeric not null default 0,
  holiday_pay_component  numeric not null default 0,
  income_tax             numeric not null default 0,
  acc_levy               numeric not null default 0,
  paye                   numeric not null default 0,
  kiwisaver              numeric not null default 0,
  net                    numeric not null default 0,
  notes                  text,
  expense_id             uuid references public.expenses(id) on delete set null,
  created_by             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now()
);

create index if not exists idx_employee_pay_runs_pay_date on public.employee_pay_runs (pay_date desc);

alter table public.employee_pay_runs enable row level security;

drop policy if exists "employee_pay_runs staff read" on public.employee_pay_runs;
create policy "employee_pay_runs staff read"
  on public.employee_pay_runs for select to authenticated
  using (not public.is_contractor());

drop policy if exists "employee_pay_runs staff write" on public.employee_pay_runs;
create policy "employee_pay_runs staff write"
  on public.employee_pay_runs for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

commit;
