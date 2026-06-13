-- 2026-06-13 — Job photos (contractor proof-of-completion).
--
-- Contractors upload photos of finished work on their own jobs; Sano
-- staff view them on the portal job page. Not shown to clients (v1).
--
-- Storage + access model:
--   • Private bucket `job-photos` (no public URLs).
--   • All uploads / reads / deletes go through SERVER ACTIONS using the
--     service-role client, with job ownership enforced in code (the
--     contractor must own the job). So the app never relies on storage
--     RLS — but we still enable table RLS as defence-in-depth so any
--     stray user-session query is safe by default.
--
-- Additive + idempotent. Run in Supabase SQL Editor before deploying.

begin;

-- 1. Private storage bucket (10 MB/file). Created via SQL so it exists
--    in every environment; service-role handles all object access.
insert into storage.buckets (id, name, public, file_size_limit)
values ('job-photos', 'job-photos', false, 10485760)
on conflict (id) do nothing;

-- 2. Metadata table.
create table if not exists public.job_photos (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs(id)        on delete cascade,
  -- Keep the photo if the contractor record is later removed.
  contractor_id uuid          references public.contractors(id) on delete set null,
  file_path     text not null,
  caption       text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_job_photos_job on public.job_photos (job_id);
create index if not exists idx_job_photos_contractor on public.job_photos (contractor_id);

comment on table public.job_photos is
  'Contractor proof-of-completion photos. Objects live in the private job-photos storage bucket at file_path; access is brokered by service-role server actions.';

-- 3. RLS (defence-in-depth; app reads go via service-role).
alter table public.job_photos enable row level security;

-- Staff (non-contractor authenticated users) read everything.
drop policy if exists "job_photos staff read" on public.job_photos;
create policy "job_photos staff read"
  on public.job_photos for select to authenticated
  using (not public.is_contractor());

-- Contractor reads only their own photos.
drop policy if exists "job_photos contractor read own" on public.job_photos;
create policy "job_photos contractor read own"
  on public.job_photos for select to authenticated
  using (
    contractor_id in (select c.id from public.contractors c where c.auth_user_id = auth.uid())
  );

-- Contractor inserts only for their own contractor id, and only on a
-- job that is actually assigned to them.
drop policy if exists "job_photos contractor insert own" on public.job_photos;
create policy "job_photos contractor insert own"
  on public.job_photos for insert to authenticated
  with check (
    contractor_id in (select c.id from public.contractors c where c.auth_user_id = auth.uid())
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.contractor_id = job_photos.contractor_id
    )
  );

-- Contractor deletes only their own photos.
drop policy if exists "job_photos contractor delete own" on public.job_photos;
create policy "job_photos contractor delete own"
  on public.job_photos for delete to authenticated
  using (
    contractor_id in (select c.id from public.contractors c where c.auth_user_id = auth.uid())
  );

commit;
