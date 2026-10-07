-- 2026-08-12 — Recurring jobs: per-job contractor rate override.
--
-- A contractor's pay for a recurring job is normally seeded from their profile
-- hourly_rate. For SELECT recurring jobs the agreed rate differs from their
-- default — so this adds an optional override. When set, the per-occurrence
-- job_workers row uses it instead of the contractor's profile rate; when null,
-- their normal rate applies (unchanged behaviour).
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.recurring_jobs
  add column if not exists contractor_rate_override numeric;

comment on column public.recurring_jobs.contractor_rate_override is
  'Optional per-recurring-job contractor pay rate. When set, the generated job''s worker pay uses this instead of the contractor''s default profile rate. Null = use their normal rate.';

commit;
