-- 2026-07-08 — Recurring invoicing for commercial contracts.
--
-- recurring_jobs already carries monthly_value (the client's monthly price).
-- This adds the scheduling/config so the portal can raise a monthly invoice
-- automatically: which day of the month to invoice, whether to auto-send, and
-- when the next invoice is due. invoices.recurring_job_id ties a generated
-- invoice back to its contract (traceability + idempotency).
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.recurring_jobs
  add column if not exists invoice_auto_send boolean not null default false,
  add column if not exists invoice_send_day  int,           -- day of month 1–28
  add column if not exists next_invoice_date date;          -- next date to raise an invoice

alter table public.invoices
  add column if not exists recurring_job_id uuid references public.recurring_jobs(id) on delete set null;

create index if not exists idx_invoices_recurring_job on public.invoices (recurring_job_id);

commit;
