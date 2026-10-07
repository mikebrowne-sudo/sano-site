-- 2026-07-29 — Invoice payment allocations (durable bank↔invoice reconciliation).
--
-- Until now, reconciling a bank credit to an invoice left NO durable record:
-- the reconcile action set bank_transactions.cleared = true and (for unpaid
-- invoices) flipped invoices.status = 'paid', but stored no link between the
-- two. Match results were recomputed live each page load. That made it
-- impossible to reconcile a payment against an already-paid invoice (e.g.
-- manual invoice INV-26022, paid before the bank line was reconciled), and
-- left no audit trail of who allocated what to which invoice.
--
-- This table is the durable source of truth for "this bank money paid this
-- invoice". It supports PARTIAL / SPLIT allocations:
--   • one bank transaction split across several invoices, and
--   • one invoice paid by several bank transactions,
-- because a transaction/invoice pair carries its own amount_allocated. Running
-- totals (sum per bank txn ≤ txn amount; sum per invoice ≤ invoice total) are
-- enforced in the server action; the constraints below cover the hard rules
-- (positive amount, one live allocation per pair).
--
-- Additive + idempotent. Existing reconciliations (the cleared flag) keep
-- working untouched — allocations layer on top. No backfill. Admin-only RLS,
-- same identity as bank_transactions. Run in the Supabase SQL Editor before
-- deploying the app change.

-- ── Read-only preflight (expect 0 rows) ─────────────────────────────────────
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'invoice_payment_allocations';

begin;

create table if not exists public.invoice_payment_allocations (
  id                  uuid primary key default gen_random_uuid(),
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  invoice_id          uuid not null references public.invoices(id) on delete restrict,
  amount_allocated    numeric not null check (amount_allocated > 0),
  -- How the allocation was made: 'manual' (user picked the invoice),
  -- 'invoice_ref' (memo/payee invoice number), 'amount_match' (unique amount).
  method              text not null default 'manual'
                        check (method in ('manual','invoice_ref','amount_match')),
  match_reason        text,                       -- free-text why this matched
  reconciled_at       timestamptz not null default now(),
  reconciled_by       uuid references auth.users(id) on delete set null,
  -- Reversal (soft): a reversed allocation stays for audit but no longer counts.
  reversed_at         timestamptz,
  reversed_by         uuid references auth.users(id) on delete set null,
  reversal_reason     text
);

create index if not exists idx_ipa_bank_txn on public.invoice_payment_allocations (bank_transaction_id);
create index if not exists idx_ipa_invoice   on public.invoice_payment_allocations (invoice_id);

-- One LIVE (un-reversed) allocation per (bank txn, invoice) pair — you can
-- re-allocate the same pair after reversing the old one, but never hold two
-- live rows for it. Prevents accidental double-allocation of the same money to
-- the same invoice. (Split across DIFFERENT invoices is still allowed.)
create unique index if not exists uq_ipa_live_pair
  on public.invoice_payment_allocations (bank_transaction_id, invoice_id)
  where reversed_at is null;

comment on table public.invoice_payment_allocations is
  'Durable link: bank money allocated to an invoice. Supports partial/split allocations. Reversal is soft (reversed_at set). Running-total limits (per txn / per invoice) enforced in the reconcile server action. See src/app/portal/finance/reconcile/_actions.ts.';

-- RLS — admin-only, same gate as bank_transactions.
alter table public.invoice_payment_allocations enable row level security;

drop policy if exists "invoice_payment_allocations admin all" on public.invoice_payment_allocations;
create policy "invoice_payment_allocations admin all"
  on public.invoice_payment_allocations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Read-only verification (expect the table + 3 indexes) ───────────────────
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'invoice_payment_allocations'
order by ordinal_position;

select indexname from pg_indexes
where schemaname = 'public' and tablename = 'invoice_payment_allocations'
order by indexname;
-- Expect: idx_ipa_bank_txn, idx_ipa_invoice, invoice_payment_allocations_pkey, uq_ipa_live_pair

-- ── Rollback (commented — only if you need to reverse) ──────────────────────
-- begin;
--   drop table if exists public.invoice_payment_allocations;
-- commit;
