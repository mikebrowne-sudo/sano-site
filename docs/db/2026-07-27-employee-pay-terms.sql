-- ============================================================================
-- Effective-dated employee pay terms (PR A). Mike-run. ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Carol's (and any employee's) standing payroll config is versioned, never a
-- single mutable value. Changing hours/rate inserts a NEW version and closes the
-- prior one (effective_to = new effective_from − 1 day), so historical pay runs
-- resolve to the exact terms in force when calculated.
--
-- Includes a BACKFILL of Carol's v1 (20h × $30, weekly, Monday, advance,
-- effective 2026-07-27). Safe to re-run.
--
-- Run PREFLIGHT, then MIGRATION, then (optionally) VERIFICATION.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select to_regclass('public.employee_pay_terms');  -- expect null
select id, full_name, start_date, hourly_rate from public.contractors
where email ilike 'carol@sano.nz' and worker_type='employee';  -- confirm Carol


-- ---- MIGRATION --------------------------------------------------------------
begin;

create table if not exists public.employee_pay_terms (
  id                    uuid primary key default gen_random_uuid(),
  contractor_id         uuid not null references public.contractors(id) on delete restrict,
  standard_weekly_hours numeric not null,
  hourly_rate           numeric not null,
  working_pattern       text,
  pay_frequency         text not null check (pay_frequency in ('weekly','fortnightly')),
  payday                text not null,          -- e.g. 'monday'
  basis                 text not null check (basis in ('advance','arrears')),
  effective_from        date not null,
  effective_to          date,                   -- null = current
  created_by            uuid,
  created_at            timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

-- One CURRENT version per employee.
create unique index if not exists employee_pay_terms_one_current_idx
  on public.employee_pay_terms (contractor_id) where effective_to is null;
create index if not exists employee_pay_terms_worker_idx
  on public.employee_pay_terms (contractor_id, effective_from desc);

-- RLS: admin read (staff manage via service-role actions, Phase 5 rule).
alter table public.employee_pay_terms enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='employee_pay_terms' and policyname='ept_admin_read') then
    create policy ept_admin_read on public.employee_pay_terms
      for select to authenticated using (is_admin());
  end if;
end $$;

-- ---- BACKFILL: Carol v1 (idempotent — only if she has no terms yet) ---------
insert into public.employee_pay_terms
  (contractor_id, standard_weekly_hours, hourly_rate, working_pattern,
   pay_frequency, payday, basis, effective_from)
select c.id, 20, 30.00,
       'Monday to Sunday pay week; weekly hours as agreed',
       'weekly', 'monday', 'advance', date '2026-07-27'
from public.contractors c
where c.email ilike 'carol@sano.nz' and c.worker_type='employee'
  and not exists (select 1 from public.employee_pay_terms t where t.contractor_id = c.id);

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select to_regclass('public.employee_pay_terms');  -- not null
select relrowsecurity from pg_class where oid='public.employee_pay_terms'::regclass;  -- t
select c.full_name, t.standard_weekly_hours, t.hourly_rate, t.pay_frequency,
       t.payday, t.basis, t.effective_from, t.effective_to
from public.employee_pay_terms t
join public.contractors c on c.id = t.contractor_id
order by c.full_name, t.effective_from;  -- Carol: 20 / 30.00 / weekly / monday / advance / 2026-07-27 / (null)


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   drop table if exists public.employee_pay_terms;
-- commit;
