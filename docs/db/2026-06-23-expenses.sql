-- 2026-06-23 — Expenses V1 (simple manual expense capture).
--
-- A small, flat expenses table so the portal can record business
-- expenses (insurance, software, fuel, etc.), categorise bank payments,
-- and show a clearer current position before the accountant meeting.
--
-- Deliberately simple: ONE flat table, category is free text constrained
-- by the app dropdown (src/lib/expense-categories.ts) — no category table,
-- no chart of accounts, no GST math, no reconciliation. No tax treatment
-- is implied: 'capital_expense' and 'owner_equity' are capture-only and
-- flagged in the UI for accountant confirmation.
--
-- Admin-only via RLS (public.is_admin(), see
-- docs/db/2026-06-12-admin-is-admin-function.sql). Additive + idempotent.
-- Run in the Supabase SQL Editor before deploying.

begin;

create table if not exists public.expenses (
  id                uuid primary key default gen_random_uuid(),
  expense_date      date not null,
  amount            numeric not null,            -- as paid (see gst_inclusive)
  category          text not null default 'other',
  vendor            text,                         -- supplier / payee
  description       text,
  payment_reference text,                         -- bank reference, for manual matching
  gst_inclusive     boolean not null default true,
  notes             text,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_expenses_date on public.expenses (expense_date);

comment on table public.expenses is
  'Simple manually-entered business expenses (V1). Category is free text, constrained by the app dropdown in src/lib/expense-categories.ts. No tax treatment implied — capital_expense and owner_equity are capture-only, accountant-confirm.';
comment on column public.expenses.gst_inclusive is
  'Whether the amount is GST-inclusive. Captured only; the portal does no GST reporting (V1).';
comment on column public.expenses.payment_reference is
  'Free-text bank/payment reference, used when manually matching expenses to bank lines.';

-- RLS — admin-only (same identity as the app-layer isAdminUser gate).
alter table public.expenses enable row level security;

drop policy if exists "expenses admin all" on public.expenses;
create policy "expenses admin all"
  on public.expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

commit;
