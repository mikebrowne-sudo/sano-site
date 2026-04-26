-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.3 — Contractor portal access fields + staff RLS tweak.
--
--  A. contractors gains the access lifecycle columns mirroring the
--     staff table (invite_accepted_at, access_disabled_at,
--     access_disabled_reason). invite_sent_at + auth_user_id already
--     exist from earlier phases.
--  B. staff RLS extended so any authenticated staff (anyone with a
--     staff row) can read all staff records — needed for the staff
--     list page to show the team. Writes still admin-only.
--
--  Additive + idempotent.
-- ════════════════════════════════════════════════════════════════════

-- A. Contractor access lifecycle columns

alter table public.contractors
  add column if not exists invite_accepted_at timestamptz;

alter table public.contractors
  add column if not exists access_disabled_at timestamptz;

alter table public.contractors
  add column if not exists access_disabled_reason text;

create index if not exists contractors_auth_user_idx
  on public.contractors(auth_user_id) where auth_user_id is not null;

-- B. Staff RLS — allow staff (anyone with a staff row) to read the
-- whole table. Without this, the list page only shows the user's
-- own row even for non-admin staff.

drop policy if exists staff_all_read on public.staff;
create policy staff_all_read on public.staff
  for select
  using (exists (
    select 1 from public.staff s
    where s.auth_user_id = auth.uid()
  ));
