-- ════════════════════════════════════════════════════════════════════
--  Phase D.2 — jobs soft-delete + job_settings table.
--
--  Two changes so the control layer can land:
--
--   1. jobs.deleted_at + jobs.deleted_by
--      Matches the soft-delete pattern already on quotes + invoices
--      (see the 2026-04-26 quote-versioning migration). Archive pages
--      can surface deleted jobs; restore clears deleted_at.
--
--   2. public.job_settings — single key/value/jsonb table for the
--      five operational toggles from Phase D.2:
--        default_payment_status       ('on_account' | 'not_required')
--        allow_job_before_payment     (bool)
--        auto_create_job_on_invoice   (bool)
--        require_review_before_invoicing (bool)
--        contractor_notification_method ('email')
--      Mirrors the proposal_settings pattern: staff read, admin write.
--      App falls back to in-code defaults if the row is missing, so
--      this migration is non-destructive on first run.
--
--  Safe + idempotent. Every statement uses IF NOT EXISTS / DROP …
--  IF EXISTS where applicable.
-- ════════════════════════════════════════════════════════════════════

-- ── Jobs soft-delete ─────────────────────────────────────────────

alter table public.jobs
  add column if not exists deleted_at timestamptz;

alter table public.jobs
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

comment on column public.jobs.deleted_at is
  'Soft-delete timestamp. When set, job is excluded from default lists and considered archived.';
comment on column public.jobs.deleted_by is
  'auth.users id of the staff member who archived the job.';

-- Partial index for archive queries (only indexes archived rows).
create index if not exists jobs_deleted_at_idx
  on public.jobs (deleted_at)
  where deleted_at is not null;

-- ── job_settings ─────────────────────────────────────────────────

create table if not exists public.job_settings (
  key         text         primary key,
  value       jsonb        not null default '{}'::jsonb,
  updated_at  timestamptz  not null default now(),
  updated_by  uuid         references auth.users(id) on delete set null
);

alter table public.job_settings enable row level security;

drop policy if exists "job_settings staff read" on public.job_settings;
create policy "job_settings staff read"
  on public.job_settings
  for select to authenticated
  using (not public.is_contractor());

drop policy if exists "job_settings admin write" on public.job_settings;
create policy "job_settings admin write"
  on public.job_settings
  for all to authenticated
  using      ((select auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((select auth.jwt() ->> 'email') = 'michael@sano.nz');

comment on table  public.job_settings is 'Phase D.2: operational job settings (payment defaults, review rules, notification method).';
comment on column public.job_settings.key   is 'Settings key — currently always "default".';
comment on column public.job_settings.value is 'Settings JSON. Validated server-side on write; loader merges with code defaults on read.';
