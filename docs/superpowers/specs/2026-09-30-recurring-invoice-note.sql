-- 2026-09-30 — recurring_jobs.invoice_note: a note printed in the Notes box of
-- every invoice the schedule raises (e.g. "Contract rate: $630.00 + GST per
-- week"). Kept separate from `description`, which is copied onto generated
-- jobs and visible to contractors. Additive + idempotent.
-- Run BEFORE merging the PR (the recurring edit form reads/writes it).

alter table public.recurring_jobs add column if not exists invoice_note text;

comment on column public.recurring_jobs.invoice_note is
  'Printed in the Notes of every invoice this schedule raises. Staff/customer-facing only — never copied to jobs.';
