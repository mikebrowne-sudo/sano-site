-- Phase D — payment-aware jobs + review step.
--
-- Adds four columns to `jobs` so we can:
--   • track whether a job has been paid, invoiced, or still on
--     account — without blocking the Draft → Invoiced workflow
--   • surface the access instructions captured during assignment
--   • record when/who reviewed a completed job before invoicing
--
-- Columns:
--   payment_status text         one of:
--                                 not_required, on_account,
--                                 invoice_sent, payment_pending, paid
--                               default 'on_account' for fresh rows
--                               so existing jobs read as account-
--                               billed until updated
--   access_instructions text    freeform; captured in the (future)
--                               assignment modal
--   reviewed_at timestamptz     set by the markJobReviewed server
--                               action; null means not yet reviewed
--   reviewed_by uuid            FK to auth.users; nullable
--
-- Safe to re-run: every add-column uses IF NOT EXISTS.

alter table public.jobs
  add column if not exists payment_status text default 'on_account';

alter table public.jobs
  add column if not exists access_instructions text;

alter table public.jobs
  add column if not exists reviewed_at timestamptz;

alter table public.jobs
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

-- Loose check constraint for the payment_status enum values. Done
-- via a named constraint so a future migration can drop/recreate
-- cleanly when we add new values.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'jobs'
      and constraint_name = 'jobs_payment_status_check'
  ) then
    alter table public.jobs
      add constraint jobs_payment_status_check
      check (payment_status in (
        'not_required',
        'on_account',
        'invoice_sent',
        'payment_pending',
        'paid'
      ));
  end if;
end $$;

comment on column public.jobs.payment_status is
  'Operational payment state. Values: not_required, on_account, invoice_sent, payment_pending, paid. Does not block workflow transitions.';
comment on column public.jobs.access_instructions is
  'Site-access notes captured during contractor assignment (keys, alarms, parking, etc.).';
comment on column public.jobs.reviewed_at is
  'Timestamp when a staff user marked the job as reviewed after completion.';
comment on column public.jobs.reviewed_by is
  'auth.users id of the staff user who marked the job as reviewed.';
