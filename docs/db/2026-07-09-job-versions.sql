-- Job amendment versioning — reversible edits with an audit reason.
--
-- Every edit to a job that changes a tracked field snapshots the PRE-edit
-- job row into this table before the change is applied, so any amendment is
-- fully reversible. Amendments to an invoiced (locked) job additionally
-- carry the operator's override reason (captured at the "Edit anyway" gate).
-- Restoring a version writes the chosen snapshot back onto the job AND
-- records the pre-restore state as a new version, so a restore is itself
-- reversible.
--
-- Append-only: rows are never updated or deleted (no update/delete policy).
-- Safe to re-run.

create table if not exists public.job_versions (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references public.jobs(id) on delete cascade,
  version_no     integer not null,
  snapshot       jsonb not null,                 -- full job row as it was BEFORE this amendment
  reason         text,                           -- operator reason (locked/invoiced edits)
  changed_fields text[] not null default '{}',   -- which tracked fields changed
  is_restore     boolean not null default false, -- true when this snapshot was taken during a restore
  actor_id       uuid,
  actor_email    text,
  created_at     timestamptz not null default now(),
  unique (job_id, version_no)
);

create index if not exists job_versions_job_idx
  on public.job_versions (job_id, version_no desc);

comment on table public.job_versions is
  'Pre-edit snapshots of job rows for reversible amendments. Append-only. See src/lib/job-versions.ts, updateJob in src/app/portal/jobs/_actions.ts, and restoreJobVersion in src/app/portal/jobs/[id]/_actions-restore.ts.';

-- RLS — staff read + staff insert. Snapshots are written server-side during
-- a staff user's edit (the server uses the anon key + the user's session, so
-- RLS applies). Append-only: no update/delete policies. Restore is admin-
-- gated in application code, not at the row level.
alter table public.job_versions enable row level security;

drop policy if exists "job_versions staff read" on public.job_versions;
create policy "job_versions staff read"
  on public.job_versions
  for select to authenticated
  using (not public.is_contractor());

drop policy if exists "job_versions staff insert" on public.job_versions;
create policy "job_versions staff insert"
  on public.job_versions
  for insert to authenticated
  with check (not public.is_contractor());
