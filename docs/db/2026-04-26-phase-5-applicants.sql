-- ════════════════════════════════════════════════════════════════════
--  Phase 5 — Applicant pipeline foundation.
--
--  Stores submissions from the public Join Our Team flow
--  (`/api/submit-application`) and exposes them in the staff portal at
--  `/portal/applicants`. Schema mirrors the existing
--  `ApplicationFormData` type so the wizard's full payload lands in
--  the row verbatim — no field loss.
--
--  Additive only — no existing tables touched. Safe to re-apply
--  (every column / index / table is guarded by IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.applicants (
  id                          uuid primary key default gen_random_uuid(),

  -- Pipeline state
  status                      text not null default 'new'
                                 check (status in ('new','reviewing','interview','approved','rejected','converted_to_contractor')),
  status_updated_at           timestamptz,
  status_updated_by           uuid references auth.users(id) on delete set null,
  staff_notes                 text,

  -- Personal details (mirrors ApplicationFormData)
  first_name                  text not null,
  last_name                   text not null,
  phone                       text not null,
  email                       text not null,
  suburb                      text not null,
  date_of_birth               date,

  -- Role type
  application_type            text not null
                                 check (application_type in ('contractor','employee')),

  -- Licence + transport
  has_license                 boolean,
  has_vehicle                 boolean,
  can_travel                  boolean,

  -- Experience
  has_experience              boolean,
  experience_types            text[],
  experience_notes            text,

  -- Equipment
  has_equipment               boolean,

  -- Availability
  available_days              text[],
  preferred_hours             text,
  travel_areas                text,

  -- Independent + compliance
  independent_work            boolean,
  work_rights_nz              boolean,
  has_insurance               boolean,
  willing_to_get_insurance    boolean,

  -- Motivation
  why_join_sano               text,

  -- Declaration
  confirm_truth               boolean not null default false,

  -- Conversion link (when status flips to converted_to_contractor)
  converted_contractor_id     uuid references public.contractors(id) on delete set null,
  converted_at                timestamptz,

  -- Timestamps
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists applicants_status_idx        on public.applicants(status);
create index if not exists applicants_created_at_idx    on public.applicants(created_at desc);
create index if not exists applicants_email_idx         on public.applicants(lower(email));
create index if not exists applicants_converted_idx     on public.applicants(converted_contractor_id)
  where converted_contractor_id is not null;

-- Auto-update updated_at on row mutation.
create or replace function public.applicants_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists applicants_set_updated_at on public.applicants;
create trigger applicants_set_updated_at
  before update on public.applicants
  for each row execute function public.applicants_set_updated_at();

-- RLS — staff can read; admin can write. Public form inserts go via the
-- service-role client and bypass RLS. Contractors never see this table.
alter table public.applicants enable row level security;

drop policy if exists applicants_staff_select on public.applicants;
create policy applicants_staff_select on public.applicants
  for select
  using ( not public.is_contractor() );

drop policy if exists applicants_admin_update on public.applicants;
create policy applicants_admin_update on public.applicants
  for update
  using ( (auth.jwt() ->> 'email') = 'michael@sano.nz' );

drop policy if exists applicants_admin_delete on public.applicants;
create policy applicants_admin_delete on public.applicants
  for delete
  using ( (auth.jwt() ->> 'email') = 'michael@sano.nz' );
