-- ════════════════════════════════════════════════════════════════════
--  Phase 5.1 — Applicant pipeline polish.
--
--  Replaces the original 6-status enum (new/reviewing/interview/
--  approved/rejected/converted_to_contractor) with the final design's
--  9-status linear pipeline.
--
--  Adds reason + trial fields. Additive otherwise. Idempotent.
--
--  Pipeline:
--    new → reviewing → phone_screen → approved → onboarding →
--      trial (optional) → ready_to_work
--    plus terminal `rejected` and reversible `on_hold`.
-- ════════════════════════════════════════════════════════════════════

-- Drop the old check constraint so we can reshape the enum.
alter table public.applicants drop constraint if exists applicants_status_check;

-- Migrate any pre-existing legacy values to their new equivalents.
update public.applicants set status='phone_screen'
  where status='interview';
update public.applicants set status='onboarding'
  where status='converted_to_contractor';

-- Re-add the constraint with the final 9-value enum.
alter table public.applicants add constraint applicants_status_check
  check (status in (
    'new','reviewing','phone_screen','approved','onboarding',
    'trial','ready_to_work','on_hold','rejected'
  ));

-- Trial gating + outcome fields.
alter table public.applicants
  add column if not exists trial_required boolean not null default true;
alter table public.applicants
  add column if not exists trial_scheduled_for timestamptz;
alter table public.applicants
  add column if not exists trial_outcome text;

-- Status-transition reason fields.
alter table public.applicants
  add column if not exists rejection_reason text;
alter table public.applicants
  add column if not exists on_hold_reason text;

-- Index to speed up "needs-action" sort (status filter + recency).
create index if not exists applicants_status_created_idx
  on public.applicants(status, created_at desc);
