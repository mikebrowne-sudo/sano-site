-- 2026-06-24 — Bank transactions (ASB import, phase 2).
--
-- Stores rows imported from an ASB CSV export so reconciliation persists
-- across sessions and re-imports are idempotent. The ASB "Unique Id" is a
-- stable per-transaction key, so a UNIQUE constraint on it lets us
-- INSERT ... ON CONFLICT DO NOTHING — uploading an overlapping export twice
-- never duplicates.
--
-- We store only the raw bank line + a user-controlled `cleared` flag. Match
-- results (which invoice / expense a line ties to) are NOT stored — they are
-- recomputed live against current invoices/expenses each time the page loads,
-- so they stay correct as records change. See src/lib/bank-reconcile.ts.
--
-- Admin-only via RLS (public.is_admin(), see
-- docs/db/2026-06-12-admin-is-admin-function.sql). Additive + idempotent.
-- Run in the Supabase SQL Editor before deploying.

begin;

create table if not exists public.bank_transactions (
  id          uuid primary key default gen_random_uuid(),
  unique_id   text not null,                 -- ASB per-transaction Unique Id
  account     text,                          -- account label from the export header
  txn_date    date,
  tran_type   text,                          -- CREDIT, D/C, BILLPAY, D/D, TFR IN, EFTPOS, …
  payee       text,
  memo        text,
  amount      numeric not null default 0,    -- signed: + money in, − money out
  direction   text not null check (direction in ('in','out')),
  cleared     boolean not null default false,-- user has reconciled/handled this line
  cleared_at  timestamptz,
  cleared_by  uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now(),
  imported_by uuid references auth.users(id) on delete set null,
  constraint bank_transactions_unique_id_key unique (unique_id)
);

create index if not exists idx_bank_txn_date on public.bank_transactions (txn_date);

comment on table public.bank_transactions is
  'Raw bank lines imported from ASB CSV exports. Idempotent on unique_id. Reconciliation matches are recomputed live (not stored); only the cleared flag is user state. See src/lib/asb-import.ts + bank-reconcile.ts.';

-- RLS — admin-only (same identity as the app-layer isAdminUser gate).
alter table public.bank_transactions enable row level security;

drop policy if exists "bank_transactions admin all" on public.bank_transactions;
create policy "bank_transactions admin all"
  on public.bank_transactions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

commit;
