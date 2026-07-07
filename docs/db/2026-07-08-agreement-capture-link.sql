-- 2026-07-08 — Agreement onboarding capture + link to contractor/employee.
--
-- Expands the online agreement to capture the full onboarding details (from the
-- employee / contractor details forms), and links a signed agreement to a
-- contractor record (existing table) or a new employees record. On signing,
-- the details are pushed into that record so they live in the workforce area.
--
-- Additive + idempotent.

begin;

-- Extra captured fields on the agreement.
alter table public.employment_agreements
  add column if not exists preferred_name                text,
  add column if not exists employee_phone                text,
  add column if not exists employee_email                text,
  add column if not exists date_of_birth                 date,
  add column if not exists id_sighted                    boolean,
  add column if not exists bank_account_name             text,
  add column if not exists emergency_contact_name        text,
  add column if not exists emergency_contact_phone       text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists insurer_name                  text,
  add column if not exists insurance_cover               text,
  add column if not exists insurance_expiry              date,
  add column if not exists contractor_id                 uuid references public.contractors(id) on delete set null,
  add column if not exists employee_id                   uuid;

-- Lightweight employee record (the staff table is portal-login only).
create table if not exists public.employees (
  id                             uuid primary key default gen_random_uuid(),
  full_name                      text not null,
  preferred_name                 text,
  phone                          text,
  email                          text,
  address                        text,
  date_of_birth                  date,
  start_date                     date,
  position                       text,
  hourly_rate                    numeric,
  ird_number                     text,
  tax_code                       text,
  kiwisaver_opt_out              boolean,
  bank_account_name              text,
  bank_account_number            text,
  emergency_contact_name         text,
  emergency_contact_phone        text,
  emergency_contact_relationship text,
  id_sighted                     boolean,
  status                         text not null default 'active',
  agreement_id                   uuid references public.employment_agreements(id) on delete set null,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);

alter table public.employees enable row level security;
drop policy if exists "employees staff" on public.employees;
create policy "employees staff"
  on public.employees for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

commit;
