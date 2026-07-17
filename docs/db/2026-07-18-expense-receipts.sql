-- Expense receipts (2026-07-18)
-- Attach one image/PDF receipt to an expense. Files live in a private
-- storage bucket and are served only via short-lived signed URLs, brokered
-- by the service-role client (same pattern as job-photos / worker-documents),
-- so no storage RLS policies are required.

alter table public.expenses
  add column if not exists receipt_path text,
  add column if not exists receipt_uploaded_at timestamptz;

insert into storage.buckets (id, name, public)
values ('expense-receipts', 'expense-receipts', false)
on conflict (id) do nothing;
