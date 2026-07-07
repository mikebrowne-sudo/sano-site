-- 2026-07-07 — KiwiSaver opt-out tracking (casual employee onboarding).
--
-- A new employee is auto-enrolled in KiwiSaver and can only opt out between
-- day 14 and day 56 of starting (via a KS10). This tiny table records an
-- employee's start date + whether the opt-out has been filed, so the portal
-- can surface a reminder inside the opt-out window and stop once it's done.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

create extension if not exists pgcrypto;

create table if not exists public.kiwisaver_optout (
  id             uuid primary key default gen_random_uuid(),
  person_label   text not null unique,      -- e.g. 'Carol'
  start_date     date,
  opt_out_filed  boolean not null default false,
  notes          text,
  updated_at     timestamptz not null default now()
);

comment on table public.kiwisaver_optout is
  'Tracks a new employee''s KiwiSaver opt-out window (day 14–56 from start). Drives a portal reminder.';

alter table public.kiwisaver_optout enable row level security;

drop policy if exists "kiwisaver_optout staff" on public.kiwisaver_optout;
create policy "kiwisaver_optout staff"
  on public.kiwisaver_optout for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

commit;
