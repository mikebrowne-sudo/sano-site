-- 2026-07-08 — Online employment-agreement completion + e-sign.
--
-- An admin creates a casual employment agreement for a new employee (position,
-- rate, start date). A token-keyed public link lets the employee read it, fill
-- their details, and e-sign (typed name + timestamp). Stored for the record.
-- The signing route uses the service-role client (token-keyed), like the other
-- /share/* flows, so no public RLS policy is needed.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.employment_agreements (
  id                    uuid primary key default gen_random_uuid(),
  token                 text not null unique default encode(gen_random_bytes(16), 'hex'),
  person_label          text,
  position              text not null default 'Cleaner (Casual)',
  hourly_rate           numeric,
  start_date            date,
  -- Employee-completed fields (filled on the public page).
  employee_full_name    text,
  employee_address      text,
  employee_ird_number   text,
  employee_bank_account text,
  tax_code              text,
  kiwisaver_choice      text,   -- 'opt_out' | 'stay_in'
  -- E-signature.
  signed_name           text,
  signed_at             timestamptz,
  status                text not null default 'draft',  -- draft | sent | signed
  agreement_version     text not null default 'casual-v1',
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now()
);

alter table public.employment_agreements enable row level security;

drop policy if exists "employment_agreements staff" on public.employment_agreements;
create policy "employment_agreements staff"
  on public.employment_agreements for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

commit;
