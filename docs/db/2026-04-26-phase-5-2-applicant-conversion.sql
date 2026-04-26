-- ════════════════════════════════════════════════════════════════════
--  Phase 5.2 — Applicant → Contractor conversion + onboarding fields.
--
--  Extends contractors with the columns needed to start an onboarding
--  flow when an applicant is converted. The conversion server action
--  (startContractorOnboarding) creates the contractor row and links
--  it back via source_applicant_id; applicants.converted_contractor_id
--  closes the loop.
--
--  Additive only. CHECK constraint on `status` is replaced to include
--  the new `onboarding` value.
-- ════════════════════════════════════════════════════════════════════

alter table public.contractors
  add column if not exists source_applicant_id uuid references public.applicants(id) on delete set null;

alter table public.contractors
  add column if not exists onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started','in_progress','complete'));

alter table public.contractors
  add column if not exists onboarding_started_at timestamptz;

alter table public.contractors
  add column if not exists onboarding_completed_at timestamptz;

alter table public.contractors
  add column if not exists trial_required boolean not null default true;

alter table public.contractors
  add column if not exists suburb text;

-- Extend status enum to include 'onboarding' (existed: active, inactive).
alter table public.contractors drop constraint if exists contractors_status_check;
alter table public.contractors add constraint contractors_status_check
  check (status in ('active','inactive','onboarding'));

-- Lookup index for the conversion path + future onboarding dashboard.
create index if not exists contractors_source_applicant_idx
  on public.contractors(source_applicant_id) where source_applicant_id is not null;
create index if not exists contractors_onboarding_status_idx
  on public.contractors(onboarding_status) where onboarding_status <> 'not_started';
