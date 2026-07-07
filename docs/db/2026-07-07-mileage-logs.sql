-- 2026-07-07 — Mileage logbook (IRD-friendly km records).
--
-- Lets a staff member log a day's driving: home base → stops → home base,
-- with the actual driving distance (km) computed via Mapbox Directions. Kept
-- for tax compliance (3-month logbook / reimbursement at the IRD km rate) and
-- visible to the accountant. Home base + rate live in app config, not here.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.mileage_logs (
  id            uuid primary key default gen_random_uuid(),
  log_date      date not null,
  -- Who the mileage is for (v1: 'Carol'). Free text so it's not coupled to
  -- the contractor/employee records.
  person_label  text,
  home_base     text,
  -- Ordered stops for the day: [{ "label": "...", "address": "..." }, ...].
  stops         jsonb not null default '[]'::jsonb,
  distance_km   numeric not null default 0,
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_mileage_logs_date on public.mileage_logs (log_date desc);

comment on table public.mileage_logs is
  'Staff mileage logbook — home base → stops → home base, actual driving km. For tax/reimbursement (IRD km rate). Accountant-visible.';

-- RLS: staff (non-contractor) can read; the server actions gate writes to
-- admins. Contractors never see it.
alter table public.mileage_logs enable row level security;

drop policy if exists "mileage_logs staff read" on public.mileage_logs;
create policy "mileage_logs staff read"
  on public.mileage_logs for select to authenticated
  using (not public.is_contractor());

drop policy if exists "mileage_logs staff write" on public.mileage_logs;
create policy "mileage_logs staff write"
  on public.mileage_logs for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

commit;
