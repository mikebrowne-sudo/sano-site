-- 2026-07-29 — Remittance payment allocations (durable bank↔remittance reconciliation).
--
-- The outgoing mirror of invoice_payment_allocations. Until now, a contractor
-- remittance being "paid" was a manual paid_at stamp with NO link to the actual
-- outgoing bank debit — creating/scheduling a remittance, or clicking "mark
-- paid", proved nothing about the money leaving the ASB account. (As at
-- 2026-07-29: 10 of 11 remittances are "paid" by stamp; 0 of 29 outgoing bank
-- lines are cleared; nothing links them.)
--
-- This table is the durable source of truth for "this outgoing bank money paid
-- this remittance". The link is to the REMITTANCE, not to each contractor
-- invoice, because the remittance already contains the invoice items
-- (contractor_remittance_items). Example:
--   bank debit −$630  →  RA-0016 (Marina)  →  CI-0040 + CI-0049 + CI-0060.
--
-- It supports PARTIAL / SPLIT payments:
--   • one bank debit split across several remittances, and
--   • one remittance paid by several bank debits,
-- because a (bank_txn, remittance) pair carries its own amount_allocated.
-- Running totals (sum per bank txn ≤ |txn amount|; sum per remittance ≤
-- remittance total) are enforced in the server action; the constraints below
-- cover the hard rules (positive amount, one live allocation per pair).
--
-- It also adds contractor_remittances.payment_confirmed — TRUE only once the
-- remittance is fully matched to outgoing bank money. paid_at semantics are
-- UNCHANGED (statements/payables still key off paid_at); payment_confirmed is a
-- strictly-additive "the bank proves it" flag the UI surfaces so a manual
-- mark-paid reads as unconfirmed until reconciled.
--
-- Additive + idempotent. No backfill. Admin-only RLS, same identity as
-- bank_transactions. Run in the Supabase SQL Editor before deploying the app.

-- ── Read-only preflight (expect 0 rows / absent column) ─────────────────────
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'remittance_payment_allocations';
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'contractor_remittances' and column_name = 'payment_confirmed';

begin;

create table if not exists public.remittance_payment_allocations (
  id                  uuid primary key default gen_random_uuid(),
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  remittance_id       uuid not null references public.contractor_remittances(id) on delete restrict,
  amount_allocated    numeric not null check (amount_allocated > 0),
  -- How the allocation was made: 'manual' (user picked the remittance),
  -- 'reference' (memo/payee reference stem), 'amount_match' (unique amount+date).
  method              text not null default 'manual'
                        check (method in ('manual','reference','amount_match')),
  match_reason        text,                       -- free-text why this matched
  reconciled_at       timestamptz not null default now(),
  reconciled_by       uuid references auth.users(id) on delete set null,
  -- Reversal (soft): a reversed allocation stays for audit but no longer counts.
  reversed_at         timestamptz,
  reversed_by         uuid references auth.users(id) on delete set null,
  reversal_reason     text
);

create index if not exists idx_rpa_bank_txn   on public.remittance_payment_allocations (bank_transaction_id);
create index if not exists idx_rpa_remittance on public.remittance_payment_allocations (remittance_id);

-- One LIVE (un-reversed) allocation per (bank txn, remittance) pair — you can
-- re-allocate the same pair after reversing the old one, but never hold two
-- live rows for it. Prevents double-allocating the same money to the same
-- remittance. (Split across DIFFERENT remittances is still allowed.)
create unique index if not exists uq_rpa_live_pair
  on public.remittance_payment_allocations (bank_transaction_id, remittance_id)
  where reversed_at is null;

comment on table public.remittance_payment_allocations is
  'Durable link: outgoing bank money allocated to a contractor remittance (which already carries its invoice items). Supports partial/split. Reversal is soft (reversed_at). Running-total limits enforced in the reconcile server action. See src/app/portal/finance/reconcile-out/_actions.ts.';

-- Additive "the bank proves this was paid" flag. Distinct from paid_at (which
-- keeps its existing meaning + downstream statement/payable effects). Set TRUE
-- only when the remittance is fully allocated to outgoing bank money.
alter table public.contractor_remittances
  add column if not exists payment_confirmed boolean not null default false,
  add column if not exists payment_confirmed_at timestamptz;

comment on column public.contractor_remittances.payment_confirmed is
  'True only once fully matched to outgoing bank debit(s) via remittance_payment_allocations. paid_at can be set (manual) while this stays false = "paid, unconfirmed".';

-- RLS — admin-only, same gate as bank_transactions.
alter table public.remittance_payment_allocations enable row level security;

drop policy if exists "remittance_payment_allocations admin all" on public.remittance_payment_allocations;
create policy "remittance_payment_allocations admin all"
  on public.remittance_payment_allocations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'remittance_payment_allocations'
order by ordinal_position;

select indexname from pg_indexes
where schemaname = 'public' and tablename = 'remittance_payment_allocations'
order by indexname;
-- Expect: idx_rpa_bank_txn, idx_rpa_remittance, remittance_payment_allocations_pkey, uq_rpa_live_pair

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'contractor_remittances'
  and column_name in ('payment_confirmed','payment_confirmed_at')
order by column_name;   -- expect 2 rows

-- ── Rollback (commented — only if you need to reverse) ──────────────────────
-- begin;
--   drop table if exists public.remittance_payment_allocations;
--   alter table public.contractor_remittances
--     drop column if exists payment_confirmed,
--     drop column if exists payment_confirmed_at;
-- commit;
