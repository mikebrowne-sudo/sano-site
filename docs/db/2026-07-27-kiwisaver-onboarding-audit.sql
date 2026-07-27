-- ============================================================================
-- KiwiSaver onboarding + compliance audit store. Mike-run. ADDITIVE + IDEMPOTENT.
-- ============================================================================
-- Extends the Phase 4 membership-status model with the auditable record the
-- policy requires: KS2 completion, automatic-enrolment date, KS10 date, IRD
-- opt-out confirmation, savings-suspension notice + effective dates, and a
-- non-operative "intention to opt out" note. Adds worker_kiwisaver_events as the
-- immutable "who did what, and when" trail.
--
-- Does NOT change any existing kiwisaver_status / kiwisaver_enrolled / rate, and
-- does NOT touch Carol or any employee's payroll status. No backfill.
--
-- Run PREFLIGHT first, then MIGRATION.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
-- New columns must not already exist:
select column_name from information_schema.columns
where table_schema='public' and table_name='contractors'
  and column_name in ('kiwisaver_ks2_completed','kiwisaver_auto_enrolment_date',
    'kiwisaver_optout_effective_date','kiwisaver_savings_suspension_ref',
    'kiwisaver_optout_intention_note');   -- expect empty
-- Events table must not already exist:
select to_regclass('public.worker_kiwisaver_events');   -- expect null
-- Current employee KiwiSaver state (context — will be unchanged):
select full_name, kiwisaver_status, kiwisaver_enrolled, kiwisaver_employee_rate
from public.contractors where worker_type='employee' order by full_name;


-- ---- MIGRATION --------------------------------------------------------------
begin;

-- Current-state audit columns on the worker record.
alter table public.contractors
  -- KS2 (deduction form) + auto-enrolment information-pack (KS3 + KS10) delivery.
  add column if not exists kiwisaver_ks2_completed            boolean not null default false,
  add column if not exists kiwisaver_ks2_completed_date       date,
  add column if not exists kiwisaver_auto_enrolment_date      date,
  add column if not exists kiwisaver_info_pack_delivered_date date,
  -- Employer-received opt-out (KS10): both dates recorded.
  add column if not exists kiwisaver_ks10_signed_date         date,
  add column if not exists kiwisaver_ks10_received_date       date,
  add column if not exists kiwisaver_optout_submitted_to_ird_date date,
  -- IRD-managed opt-out (myIR / late): only effective on IRD approval.
  add column if not exists kiwisaver_ird_approval_reference   text,
  add column if not exists kiwisaver_ird_approval_date        date,
  -- Effective date payroll deductions stop (from a valid KS10 or IRD instruction).
  add column if not exists kiwisaver_payroll_stop_effective_date date,
  -- Savings suspension — evidence required before deductions stop.
  add column if not exists kiwisaver_savings_suspension_ref   text,
  add column if not exists kiwisaver_savings_suspension_from  date,
  add column if not exists kiwisaver_savings_suspension_to    date,
  -- NON-OPERATIVE: a stated intention to opt out. Never affects status,
  -- enrolment, deductions or employer contributions.
  add column if not exists kiwisaver_optout_intention_note        text,
  add column if not exists kiwisaver_optout_intention_recorded_at date;

-- Store the KiwiSaver status determined at signing on the agreement itself, so
-- the signed document reflects the employee's status at issue (point-in-time),
-- independent of any later live change on the worker record.
alter table public.employment_agreements
  add column if not exists kiwisaver_status text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='employment_agreements_kiwisaver_status_chk') then
    alter table public.employment_agreements add constraint employment_agreements_kiwisaver_status_chk
      check (kiwisaver_status is null or kiwisaver_status = any (array[
        'existing_member','auto_enrolled','opted_in','not_eligible',
        'savings_suspension','opted_out','review_required']));
  end if;
end $$;

-- Immutable audit trail — who recorded each KiwiSaver event, and when.
create table if not exists public.worker_kiwisaver_events (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references public.contractors(id) on delete restrict,
  event_type    text not null check (event_type = any (array[
                  'ks2_completed','existing_member_recorded','auto_enrolled',
                  'optout_ks10','optout_ird_confirmed',
                  'savings_suspension_start','savings_suspension_end',
                  'intention_noted','not_eligible_recorded','status_changed'])),
  evidence_ref  text,          -- KS10 ref / IRD confirmation ref / suspension notice ref
  effective_date date,
  note          text,
  performed_by  uuid,          -- auth.users id of the admin who recorded it (null = system)
  performed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists worker_kiwisaver_events_worker_idx
  on public.worker_kiwisaver_events (worker_id, performed_at desc);

-- RLS: admins read; only the service-role (which bypasses RLS) writes. No
-- worker/authenticated write path — this is a compliance record (Phase 5 rule).
alter table public.worker_kiwisaver_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies
    where schemaname='public' and tablename='worker_kiwisaver_events' and policyname='wke_admin_read') then
    create policy wke_admin_read on public.worker_kiwisaver_events
      for select to authenticated using (is_admin());
  end if;
end $$;

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
-- 15 new columns on contractors:
select count(*) as new_contractor_cols from information_schema.columns
where table_schema='public' and table_name='contractors' and column_name like 'kiwisaver_%'
  and column_name in ('kiwisaver_ks2_completed','kiwisaver_ks2_completed_date','kiwisaver_auto_enrolment_date',
    'kiwisaver_info_pack_delivered_date','kiwisaver_ks10_signed_date','kiwisaver_ks10_received_date',
    'kiwisaver_optout_submitted_to_ird_date','kiwisaver_ird_approval_reference','kiwisaver_ird_approval_date',
    'kiwisaver_payroll_stop_effective_date','kiwisaver_savings_suspension_ref','kiwisaver_savings_suspension_from',
    'kiwisaver_savings_suspension_to','kiwisaver_optout_intention_note','kiwisaver_optout_intention_recorded_at');  -- 15
-- Agreement status column + constraint:
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements' and column_name='kiwisaver_status';  -- 1 row
-- Events table + RLS on + policy:
select to_regclass('public.worker_kiwisaver_events');  -- not null
select relrowsecurity from pg_class where oid='public.worker_kiwisaver_events'::regclass;  -- t
select policyname from pg_policies where tablename='worker_kiwisaver_events';  -- wke_admin_read
-- Employee payroll state UNCHANGED (no status/enrolment/rate touched, no events):
select full_name, kiwisaver_status, kiwisaver_enrolled, kiwisaver_employee_rate
from public.contractors where worker_type='employee' order by full_name;
select count(*) as events from public.worker_kiwisaver_events;  -- expect 0


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   drop table if exists public.worker_kiwisaver_events;
--   alter table public.employment_agreements drop constraint if exists employment_agreements_kiwisaver_status_chk;
--   alter table public.employment_agreements drop column if exists kiwisaver_status;
--   alter table public.contractors
--     drop column if exists kiwisaver_ks2_completed,
--     drop column if exists kiwisaver_ks2_completed_date,
--     drop column if exists kiwisaver_auto_enrolment_date,
--     drop column if exists kiwisaver_info_pack_delivered_date,
--     drop column if exists kiwisaver_ks10_signed_date,
--     drop column if exists kiwisaver_ks10_received_date,
--     drop column if exists kiwisaver_optout_submitted_to_ird_date,
--     drop column if exists kiwisaver_ird_approval_reference,
--     drop column if exists kiwisaver_ird_approval_date,
--     drop column if exists kiwisaver_payroll_stop_effective_date,
--     drop column if exists kiwisaver_savings_suspension_ref,
--     drop column if exists kiwisaver_savings_suspension_from,
--     drop column if exists kiwisaver_savings_suspension_to,
--     drop column if exists kiwisaver_optout_intention_note,
--     drop column if exists kiwisaver_optout_intention_recorded_at;
-- commit;
