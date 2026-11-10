-- Contractor onboarding pack (Send onboarding pack + Your team declaration).
-- Additive + idempotent. Run in the Supabase SQL editor (project Sano) BEFORE
-- the PR is deployed — the sign flow writes these columns.

begin;

-- 1. Staff's GST expectation at send time (drives rate wording + wizard prefill),
--    and the contractor's confirmed answer at signing.
alter table public.employment_agreements
  add column if not exists contractor_gst_expected text,
  add column if not exists contractor_gst_registered boolean;

alter table public.employment_agreements
  drop constraint if exists employment_agreements_contractor_gst_expected_check;
alter table public.employment_agreements
  add constraint employment_agreements_contractor_gst_expected_check
  check (contractor_gst_expected is null or contractor_gst_expected in ('registered', 'not_registered', 'unsure'));

-- 2. "Your team" — people the contracting entity may send, plus the frozen
--    written declaration (text + version + time) confirmed at signing.
alter table public.employment_agreements
  add column if not exists contractor_personnel jsonb,
  add column if not exists personnel_declaration_text text,
  add column if not exists personnel_declaration_version text,
  add column if not exists personnel_declared_at timestamptz;

-- 3. The wizard offers "Other" as a contracting structure but the contractors
--    CHECK rejected it, so signing as "Other" failed. Allow it.
alter table public.contractors
  drop constraint if exists contractors_business_structure_check;
alter table public.contractors
  add constraint contractors_business_structure_check
  check (business_structure is null or business_structure in ('sole_trader', 'company', 'partnership', 'trust', 'other'));

commit;

-- Verify (expect 6 rows, then the updated CHECK):
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'employment_agreements'
--    and column_name in ('contractor_gst_expected','contractor_gst_registered','contractor_personnel',
--                        'personnel_declaration_text','personnel_declaration_version','personnel_declared_at');
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'contractors_business_structure_check';
