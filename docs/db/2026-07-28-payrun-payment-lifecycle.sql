-- ============================================================================
-- Pay-run payment lifecycle: draft → approved → paid. Mike-run. ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Replaces the single draft → completed step with a proper employee-payment
-- lifecycle (draft → approved → paid), SEPARATE from payday filing and IRD
-- remittance. Adds the payment metadata recorded at "paid", and a legacy flag on
-- mileage so weekly-settled trips can't be paid again in the monthly workflow.
--
-- Existing 'completed' runs are NOT silently reinterpreted — see the
-- CLASSIFICATION query. As at 2026-07-28 there are 0 completed runs (all drafts),
-- so nothing is reclassified.
--
-- Run PREFLIGHT, then MIGRATION, then CLASSIFICATION (read-only).
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
select status, count(*) from public.pay_runs group by 1 order by 1;   -- expect all 'draft' now
select column_name from information_schema.columns
where table_schema='public' and table_name='pay_runs' and column_name in ('payment_reference','payment_method','payment_date');  -- expect empty


-- ---- MIGRATION --------------------------------------------------------------
begin;

-- Payment metadata recorded when a run is marked paid (recording an EXISTING
-- bank transfer — never initiating a payment).
alter table public.pay_runs
  add column if not exists payment_reference text,
  add column if not exists payment_method    text,
  add column if not exists payment_date       date;

-- Status set: draft/approved/paid + legacy 'completed' (kept, never a new target).
-- The existing constraint is named pay_runs_status_check and allows only
-- (draft, completed) — drop it (and any stray variant) and replace it.
alter table public.pay_runs drop constraint if exists pay_runs_status_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='pay_runs_status_check') then
    alter table public.pay_runs add constraint pay_runs_status_check
      check (status in ('draft','approved','paid','completed'));
  end if;
end $$;

-- Legacy mileage flag: any weekly-reimbursed mileage is marked so the monthly
-- reimbursement workflow (PR F) can exclude it and never pay it twice.
alter table public.mileage_logs
  add column if not exists legacy_weekly_settled boolean not null default false;
update public.mileage_logs
set legacy_weekly_settled = true
where status = 'reimbursed' and pay_run_id is not null and legacy_weekly_settled = false;

commit;


-- ---- CLASSIFICATION of existing 'completed' runs (read-only) ----------------
-- Do NOT auto-migrate. Inspect each and decide: clearly-paid → 'paid'
-- (a targeted, guarded update per id); unconfirmable → leave for admin review.
select pr.id, pr.pay_period_start, pr.pay_period_end, pr.pay_date, pr.status,
       (select count(*) from public.pay_run_lines l where l.pay_run_id=pr.id) as lines,
       (select count(*) from public.payslips p where p.pay_run_id=pr.id and p.sent_at is not null) as payslips_sent,
       (select count(*) from public.mileage_logs m where m.pay_run_id=pr.id) as mileage_settled,
       (select count(*) from public.expenses e where e.description ilike 'Mileage reimbursement%' and e.expense_date=pr.pay_date) as mileage_expenses
from public.pay_runs pr
where pr.status = 'completed'
order by pr.pay_date;   -- as at 2026-07-28: 0 rows → nothing to reclassify


-- ---- VERIFICATION (read-only) -----------------------------------------------
select conname, pg_get_constraintdef(oid) from pg_constraint where conname='pay_runs_status_check';
select column_name from information_schema.columns
where table_schema='public' and table_name='pay_runs' and column_name in ('payment_reference','payment_method','payment_date') order by column_name;  -- 3 rows
select column_name from information_schema.columns
where table_schema='public' and table_name='mileage_logs' and column_name='legacy_weekly_settled';  -- 1 row


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   alter table public.pay_runs drop constraint if exists pay_runs_status_check;
--   alter table public.pay_runs drop column if exists payment_reference, drop column if exists payment_method, drop column if exists payment_date;
--   alter table public.mileage_logs drop column if exists legacy_weekly_settled;
-- commit;
