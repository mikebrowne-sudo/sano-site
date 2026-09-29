-- 2026-09-30 — Contractor confirmation that a completed job went to plan.
--
-- Under the allowed-hours model (2026-06) a job's pay basis is
-- hours_allocated × rate. The contractor has had NO way to say whether the
-- job actually took that long: the clock-in/out flow was archived, and
-- actual_hours / approved_hours are null on every job. So Carol approves pay
-- with no signal from the person who did the work, and nothing chases it —
-- $4,068 across 21 completed jobs sat unapproved, some since May.
--
-- This adds a lightweight confirmation the contractor gives from their own
-- portal the evening of the clean:
--
--   unconfirmed  — default; no answer yet (the state that gets reminded)
--   as_planned   — "yes, it went to plan" → Carol can bulk-approve these
--   took_longer  — contractor flagged an overrun; the EXISTING extra-hours
--                  flow (job_workers.extra_hours*) carries the figure and
--                  its admin sign-off, so nothing about pay changes here
--
-- Deliberately NOT a timesheet. The contractor is not re-entering hours;
-- they are answering one yes/no about the allowed hours already agreed.
-- Nothing here feeds pay directly — extra_hours_status remains the only
-- thing that moves the pay basis, and it still needs admin approval.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.job_workers
  add column if not exists hours_confirmed_status text not null default 'unconfirmed',
  add column if not exists hours_confirmed_at timestamptz,
  add column if not exists hours_confirmed_note text;

-- Guard the state machine at the DB layer so a bad write can't invent a state.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'job_workers_hours_confirmed_status_check'
  ) then
    alter table public.job_workers
      add constraint job_workers_hours_confirmed_status_check
      check (hours_confirmed_status in ('unconfirmed', 'as_planned', 'took_longer'));
  end if;
end $$;

comment on column public.job_workers.hours_confirmed_status is
  'Contractor''s answer on a completed job: unconfirmed (default, gets reminded) | as_planned | took_longer. Descriptive only - the pay basis is still hours_allocated + admin-approved extra_hours.';
comment on column public.job_workers.hours_confirmed_at is
  'When the contractor answered. Null while unconfirmed; drives the evening reminder and the ageing view.';
comment on column public.job_workers.hours_confirmed_note is
  'Optional free-text the contractor added when confirming (e.g. what made it run over).';

-- The reminder cron and Carol's queue both filter on
-- (status, confirmed) for completed jobs.
create index if not exists idx_job_workers_hours_confirmed
  on public.job_workers (hours_confirmed_status, job_id);

-- Seed the reminder SMS. sendNotification has NO hard-coded fallback body:
-- a missing row means the send fails with "No template", so the template must
-- exist before the cron runs. Operator-editable afterwards in
-- Settings -> Notifications like every other template.
insert into public.notification_templates (type, channel, audience, subject, body, enabled)
select 'confirm_hours', 'sms', 'contractor', null,
       'Sano: {{job_title}} on {{scheduled_date}} is done. Please confirm your {{allowed_hours}}h so we can pay it: {{job_link}}',
       true
where not exists (
  select 1 from public.notification_templates
  where type = 'confirm_hours' and channel = 'sms' and audience = 'contractor'
);

commit;
