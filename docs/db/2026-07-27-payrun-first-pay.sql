-- ============================================================================
-- Pay-run: terms snapshot, basis, and SEPARATE payday-filing status (PR B).
-- Mike-run. ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Keeps the three obligations distinct: a pay run's `status` (draft/approved/
-- paid) is EMPLOYEE PAYMENT only. Payday filing gets its OWN status here; IRD
-- remittance is a separate ledger (PR C). No generic "completed" that implies all
-- three happened.
--
-- `terms_snapshot` makes a run reproducible against the exact pay terms used
-- (PR A), independent of later versioning.
--
-- Run PREFLIGHT, then MIGRATION.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='pay_runs'
  and column_name in ('terms_snapshot','pay_terms_id','basis','payday_filing_status');  -- expect empty


-- ---- MIGRATION --------------------------------------------------------------
begin;

alter table public.pay_runs
  add column if not exists pay_terms_id   uuid references public.employee_pay_terms(id),
  add column if not exists terms_snapshot jsonb,
  add column if not exists basis          text,
  add column if not exists payday_filing_status text not null default 'not_filed',
  add column if not exists payday_filing_submitted_at timestamptz,
  add column if not exists payday_filing_accepted_at  timestamptz,
  add column if not exists ird_compared_at   timestamptz,
  add column if not exists ird_compared_note text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='pay_runs_basis_chk') then
    alter table public.pay_runs add constraint pay_runs_basis_chk
      check (basis is null or basis in ('advance','arrears'));
  end if;
  if not exists (select 1 from pg_constraint where conname='pay_runs_payday_filing_status_chk') then
    alter table public.pay_runs add constraint pay_runs_payday_filing_status_chk
      check (payday_filing_status in ('not_filed','queued','submitted','accepted','rejected','correction_required'));
  end if;
end $$;

-- Employer (EMP) registration status — pending until IRD activates the account.
-- Informational for the readiness check; never blocks a pay. Mike flips it once
-- the employer account is available.
alter table public.workforce_settings
  add column if not exists emp_registered boolean not null default false,
  add column if not exists emp_note text;

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select column_name from information_schema.columns
where table_schema='public' and table_name='pay_runs'
  and column_name in ('pay_terms_id','terms_snapshot','basis','payday_filing_status',
    'payday_filing_submitted_at','payday_filing_accepted_at','ird_compared_at','ird_compared_note')
order by column_name;   -- 8 rows
-- Existing runs default to 'not_filed' (payment status unaffected):
select status, payday_filing_status, count(*) from public.pay_runs group by 1,2 order by 1,2;


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   alter table public.pay_runs drop constraint if exists pay_runs_basis_chk;
--   alter table public.pay_runs drop constraint if exists pay_runs_payday_filing_status_chk;
--   alter table public.pay_runs
--     drop column if exists pay_terms_id, drop column if exists terms_snapshot,
--     drop column if exists basis, drop column if exists payday_filing_status,
--     drop column if exists payday_filing_submitted_at, drop column if exists payday_filing_accepted_at,
--     drop column if exists ird_compared_at, drop column if exists ird_compared_note;
-- commit;
