-- ============================================================================
-- IRD liability ledger (PR C). Mike-run. ADDITIVE + IDEMPOTENT. One paste-and-run.
-- ============================================================================
-- The accumulated PAYE + KiwiSaver Sano owes IRD, grouped by IRD payment period.
-- SEPARATE from employee payment + payday filing. A pay run belongs to at most
-- ONE liability period (unique pay_run_id). Approved runs are immutable — this
-- only READS their frozen figures; corrections are separate adjustment lines.
-- Includes an idempotent backfill of Carol's already-approved/paid run.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select to_regclass('public.ird_liabilities') as liabilities_tbl,
       to_regclass('public.ird_liability_lines') as lines_tbl;   -- expect null, null
-- Approved/paid employee runs eligible for a liability (context):
select pr.id, pr.pay_date, pr.status from public.pay_runs pr
where pr.status in ('approved','paid') and (pr.kind is null or pr.kind='employee') order by pr.pay_date;


-- ---- MIGRATION --------------------------------------------------------------
begin;

-- One row per IRD payment period (e.g. 2026-07 → due 2026-08-20).
create table if not exists public.ird_liabilities (
  id           uuid primary key default gen_random_uuid(),
  period_key   text not null unique,          -- 'YYYY-MM'
  period_start date not null,
  period_end   date not null,
  due_date     date not null,
  ird_payment_reference text,
  created_at   timestamptz not null default now()
);

-- One immutable line per approved pay run (a run is in at most ONE period/batch).
create table if not exists public.ird_liability_lines (
  id                 uuid primary key default gen_random_uuid(),
  ird_liability_id   uuid not null references public.ird_liabilities(id) on delete restrict,
  pay_run_id         uuid not null unique references public.pay_runs(id) on delete restrict,
  worker_id          uuid references public.contractors(id),
  payday             date not null,
  paye               numeric not null,
  employee_ks        numeric not null,
  employer_ks_gross  numeric not null,
  esct               numeric,
  employer_ks_net    numeric,
  total_payable      numeric not null,         -- paye + employee_ks + employer_ks_gross
  snapshot           jsonb,                    -- source calculation snapshot
  created_at         timestamptz not null default now()
);
create index if not exists ird_liability_lines_period_idx on public.ird_liability_lines (ird_liability_id);

-- Recorded IRD payments (supports partial payments — never falsely marks paid).
create table if not exists public.ird_liability_payments (
  id               uuid primary key default gen_random_uuid(),
  ird_liability_id uuid not null references public.ird_liabilities(id) on delete restrict,
  payment_date     date not null,
  amount           numeric not null,
  ird_reference    text,
  notes            text,
  recorded_by      uuid,
  created_at       timestamptz not null default now()
);
create index if not exists ird_liability_payments_period_idx on public.ird_liability_payments (ird_liability_id);

-- Adjustment lines (payroll corrections / KiwiSaver refunds / ESCT corrections).
-- Positive or negative; never rewrite the original line. explains the balance change.
create table if not exists public.ird_liability_adjustments (
  id               uuid primary key default gen_random_uuid(),
  ird_liability_id uuid not null references public.ird_liabilities(id) on delete restrict,
  pay_run_id       uuid references public.pay_runs(id),
  kind             text not null,              -- e.g. 'kiwisaver_refund','esct_correction','payroll_correction'
  amount           numeric not null,           -- +/- against total payable
  reason           text not null,
  created_by       uuid,
  created_at       timestamptz not null default now()
);

-- RLS: admins read; service-role writes (Phase 5 rule) — no worker access.
alter table public.ird_liabilities            enable row level security;
alter table public.ird_liability_lines        enable row level security;
alter table public.ird_liability_payments     enable row level security;
alter table public.ird_liability_adjustments  enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='ird_liabilities' and policyname='irdl_admin_read') then
    create policy irdl_admin_read on public.ird_liabilities for select to authenticated using (is_admin()); end if;
  if not exists (select 1 from pg_policies where tablename='ird_liability_lines' and policyname='irdll_admin_read') then
    create policy irdll_admin_read on public.ird_liability_lines for select to authenticated using (is_admin()); end if;
  if not exists (select 1 from pg_policies where tablename='ird_liability_payments' and policyname='irdlp_admin_read') then
    create policy irdlp_admin_read on public.ird_liability_payments for select to authenticated using (is_admin()); end if;
  if not exists (select 1 from pg_policies where tablename='ird_liability_adjustments' and policyname='irdla_admin_read') then
    create policy irdla_admin_read on public.ird_liability_adjustments for select to authenticated using (is_admin()); end if;
end $$;

-- ---- BACKFILL: Carol's approved/paid run (idempotent) -----------------------
-- Uses the run's FROZEN line figures. Does NOT recreate/recalculate/alter the run.
do $$
declare
  r record; v_period_id uuid;
begin
  for r in
    select pr.id as pay_run_id, pr.pay_date, l.contractor_id, l.paye, l.kiwisaver_employee,
           l.kiwisaver_employer as er_gross, l.esct, l.kiwisaver_employer_net as er_net
    from public.pay_runs pr
    join public.pay_run_lines l on l.pay_run_id = pr.id
    where pr.status in ('approved','paid') and (pr.kind is null or pr.kind='employee')
      and not exists (select 1 from public.ird_liability_lines x where x.pay_run_id = pr.id)
  loop
    -- Ensure the period exists (2026-07 style; due 20th of following month).
    insert into public.ird_liabilities (period_key, period_start, period_end, due_date)
    values (
      to_char(r.pay_date, 'YYYY-MM'),
      date_trunc('month', r.pay_date)::date,
      (date_trunc('month', r.pay_date) + interval '1 month - 1 day')::date,
      (date_trunc('month', r.pay_date) + interval '1 month' + interval '19 days')::date
    )
    on conflict (period_key) do nothing;
    select id into v_period_id from public.ird_liabilities where period_key = to_char(r.pay_date, 'YYYY-MM');

    insert into public.ird_liability_lines
      (ird_liability_id, pay_run_id, worker_id, payday, paye, employee_ks, employer_ks_gross, esct, employer_ks_net, total_payable, snapshot)
    values (
      v_period_id, r.pay_run_id, r.contractor_id, r.pay_date,
      r.paye, r.kiwisaver_employee, r.er_gross, r.esct, r.er_net,
      round(coalesce(r.paye,0) + coalesce(r.kiwisaver_employee,0) + coalesce(r.er_gross,0), 2),
      jsonb_build_object('paye', r.paye, 'employee_ks', r.kiwisaver_employee, 'employer_ks_gross', r.er_gross, 'esct', r.esct, 'employer_ks_net', r.er_net, 'backfilled', true)
    )
    on conflict (pay_run_id) do nothing;
  end loop;
end $$;

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
-- Period 2026-07 for Carol: total_payable 136.50, due 2026-08-20, one line.
select li.period_key, li.period_start, li.period_end, li.due_date,
       count(ll.id) as lines, sum(ll.total_payable) as total_payable,
       sum(ll.paye) as paye, sum(ll.employee_ks) as employee_ks, sum(ll.employer_ks_gross) as employer_ks_gross
from public.ird_liabilities li
left join public.ird_liability_lines ll on ll.ird_liability_id = li.id
group by li.id order by li.period_key;   -- expect 2026-07 / 1 line / 136.50 / 94.50 / 21.00 / 21.00
-- One line per pay run (no duplicates):
select pay_run_id, count(*) from public.ird_liability_lines group by pay_run_id having count(*) > 1;  -- expect 0 rows
select relrowsecurity from pg_class where oid='public.ird_liability_lines'::regclass;  -- t


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   drop table if exists public.ird_liability_adjustments;
--   drop table if exists public.ird_liability_payments;
--   drop table if exists public.ird_liability_lines;
--   drop table if exists public.ird_liabilities;
-- commit;
