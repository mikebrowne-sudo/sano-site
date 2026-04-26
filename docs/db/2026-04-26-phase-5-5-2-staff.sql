-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.2 — Staff table for portal access management.
--
--  Replaces the current admin-by-hardcoded-email pattern with a
--  proper staff table. Each row maps to a Supabase Auth user (once
--  invited). Activation status is derived from the lifecycle
--  timestamps (invite_sent_at / invite_accepted_at / access_disabled_at).
--
--  Additive only. RLS: admin read/write, staff self-read, contractors
--  blocked.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.staff (
  id                       uuid primary key default gen_random_uuid(),
  full_name                text not null,
  email                    text not null unique,
  role                     text not null default 'staff'
                              check (role in ('admin','staff')),
  auth_user_id             uuid references auth.users(id) on delete set null,
  invite_sent_at           timestamptz,
  invite_accepted_at       timestamptz,
  access_disabled_at       timestamptz,
  access_disabled_reason   text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists staff_email_idx
  on public.staff(lower(email));
create index if not exists staff_auth_user_idx
  on public.staff(auth_user_id) where auth_user_id is not null;

-- updated_at trigger
create or replace function public.staff_set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists staff_set_updated_at on public.staff;
create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function public.staff_set_updated_at();

-- RLS — admin (hardcoded admin email pattern, mirroring other tables)
-- + staff self-read.
alter table public.staff enable row level security;

drop policy if exists staff_admin_all on public.staff;
create policy staff_admin_all on public.staff
  for all
  using ((auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((auth.jwt() ->> 'email') = 'michael@sano.nz');

drop policy if exists staff_self_read on public.staff;
create policy staff_self_read on public.staff
  for select
  using (auth_user_id = auth.uid());

-- Contractors get nothing — no policy granted to them, RLS denies by default.
