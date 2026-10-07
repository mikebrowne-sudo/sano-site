-- ============================================================================
-- BASELINE (Phase 0) — contractors: payroll / tax / KiwiSaver / tax-treatment
-- ============================================================================
-- Employees are `contractors` rows with worker_type='employee'. The employee
-- payroll/tax/KiwiSaver column set, and the contractor tax-treatment set, were
-- added by hand (via app writes and Mike-run spec SQL) with NO tracked
-- docs/db migration. This file documents their EXACT live schema (captured
-- read-only from production 2026-07-24).
--
-- Idempotent + NON-DESTRUCTIVE: every statement is `add column if not exists` /
-- guarded `add constraint if not exists`. It does NOT create the contractors
-- table (which already exists and has its own tracked migrations for other
-- columns) and alters no data. Running it on prod is a no-op.
--
-- ⚠ KNOWN DATA-QUALITY ISSUES AT CAPTURE (addressed in Phase 1, NOT here):
--   • kiwisaver_employee_rate / kiwisaver_employer_rate both DEFAULT 3 — a
--     stale pre-1-Apr-2026 value. The standard/minimum is 3.5% from 1 Apr 2026.
--   • 1 of 3 employees is KiwiSaver-enrolled at employee_rate=3 with
--     rate_source='standard' (should be 'temporary_reduction'+expiry, or 3.5%)
--     — flagged for compliance confirmation; NOT changed by any migration.
--   • No CHECK on tax_code or the KiwiSaver rate columns.
-- ============================================================================

-- --- Worker classification / employment -------------------------------------
alter table public.contractors add column if not exists worker_type      text not null default 'contractor';
alter table public.contractors add column if not exists employment_type  text;   -- null | casual | part_time | full_time

-- --- Pay configuration -------------------------------------------------------
alter table public.contractors add column if not exists hourly_rate         numeric(10,2);
alter table public.contractors add column if not exists base_hourly_rate    numeric(10,2);
alter table public.contractors add column if not exists loaded_hourly_rate  numeric(10,2);
alter table public.contractors add column if not exists pay_frequency       text;
alter table public.contractors add column if not exists standard_hours      numeric(6,2);
alter table public.contractors add column if not exists holiday_pay_method  text;
alter table public.contractors add column if not exists holiday_pay_percent numeric(5,2) default 8;

-- --- Employee tax (IR330 data — mutable scalars; immutable declaration record
--     is added in Phase 3) ---------------------------------------------------
alter table public.contractors add column if not exists ird_number     text;
alter table public.contractors add column if not exists tax_code       text default 'M';
alter table public.contractors add column if not exists ir330_received boolean not null default false;

-- --- Employee KiwiSaver ------------------------------------------------------
alter table public.contractors add column if not exists kiwisaver_enrolled              boolean not null default false;
alter table public.contractors add column if not exists kiwisaver_employee_rate         numeric(5,2) default 3;  -- ⚠ stale default; corrected in Phase 1
alter table public.contractors add column if not exists kiwisaver_employer_rate         numeric(5,2) default 3;  -- ⚠ stale default; corrected in Phase 1
alter table public.contractors add column if not exists kiwisaver_rate_source           text not null default 'standard';
alter table public.contractors add column if not exists kiwisaver_rate_effective_date   date;
alter table public.contractors add column if not exists kiwisaver_temp_reduction_expiry date;

-- --- Contractor business / GST ----------------------------------------------
alter table public.contractors add column if not exists business_structure text;
alter table public.contractors add column if not exists legal_name         text;
alter table public.contractors add column if not exists company_number     text;
alter table public.contractors add column if not exists nzbn               text;
alter table public.contractors add column if not exists gst_registered     boolean not null default false;
alter table public.contractors add column if not exists gst_number         text;
alter table public.contractors add column if not exists gst_effective_date date;
alter table public.contractors add column if not exists gst_end_date       date;

-- --- Contractor tax treatment (staff-decided; withholding NOT implemented) ---
alter table public.contractors add column if not exists tax_treatment     text not null default 'pending_review';
alter table public.contractors add column if not exists tax_review_status text;
alter table public.contractors add column if not exists tax_review_notes  text;
alter table public.contractors add column if not exists ir330c_requested  boolean;

-- --- Capability (drives competency; NOT yet wired to module targeting) -------
alter table public.contractors add column if not exists approved_services    text[] not null default '{}'::text[];
alter table public.contractors add column if not exists experience_level     text;
alter table public.contractors add column if not exists can_work_solo        boolean not null default true;
alter table public.contractors add column if not exists can_lead_jobs        boolean not null default false;
alter table public.contractors add column if not exists can_supervise_others boolean not null default false;

-- --- CHECK constraints (as live) --------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contractors_worker_type_check') then
    alter table public.contractors add constraint contractors_worker_type_check
      check (worker_type = any (array['contractor','employee']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contractors_employment_type_check') then
    alter table public.contractors add constraint contractors_employment_type_check
      check (employment_type is null or employment_type = any (array['casual','part_time','full_time']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contractors_kiwisaver_rate_source_chk') then
    alter table public.contractors add constraint contractors_kiwisaver_rate_source_chk
      check (kiwisaver_rate_source = any (array['standard','temporary_reduction','employee_election']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'contractors_tax_treatment_chk') then
    alter table public.contractors add constraint contractors_tax_treatment_chk
      check (tax_treatment = any (array['ordinary_trade_creditor','schedular_payment','certificate_of_exemption','pending_review']));
  end if;
end $$;
