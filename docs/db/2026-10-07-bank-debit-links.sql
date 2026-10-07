-- 2026-10-07 — bank_debit_links: durable link from an outgoing bank debit to
-- what it paid, for everything that ISN'T a contractor remittance (those keep
-- using remittance_payment_allocations).
--
-- kinds:
--   expense            → an existing expenses row (one debit ↔ one expense)
--   pay_run            → an employee pay run (net pay transferred)
--   internal_transfer  → money moved to Sano's own account (e.g. -51 tax savings)
--   created_expense    → an expense auto-created for a well-known payee
--                        (IRD payments, IRD card fees) and linked here
--
-- One LIVE link per debit and per expense / pay run; reversible (soft) like the
-- other allocation tables. Admin-only, accountants read.
--
-- Additive only. Run BEFORE merging the "money-out auto-reconcile" PR.

begin;

create table if not exists public.bank_debit_links (
  id                  uuid primary key default gen_random_uuid(),
  bank_transaction_id uuid not null references public.bank_transactions(id) on delete cascade,
  kind                text not null check (kind in ('expense', 'pay_run', 'internal_transfer', 'created_expense')),
  expense_id          uuid references public.expenses(id) on delete set null,
  pay_run_id          uuid references public.pay_runs(id) on delete set null,
  amount              numeric not null check (amount > 0),
  method              text not null default 'auto' check (method in ('auto', 'manual')),
  match_reason        text,
  linked_at           timestamptz not null default now(),
  linked_by           uuid references auth.users(id) on delete set null,
  reversed_at         timestamptz,
  reversed_by         uuid references auth.users(id) on delete set null,
  reversal_reason     text
);

create unique index if not exists uq_bdl_live_txn     on public.bank_debit_links (bank_transaction_id) where reversed_at is null;
create unique index if not exists uq_bdl_live_expense on public.bank_debit_links (expense_id)          where reversed_at is null and expense_id is not null;
create unique index if not exists uq_bdl_live_payrun  on public.bank_debit_links (pay_run_id)          where reversed_at is null and pay_run_id is not null;

alter table public.bank_debit_links enable row level security;
drop policy if exists "bank_debit_links admin only" on public.bank_debit_links;
create policy "bank_debit_links admin only" on public.bank_debit_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "bank_debit_links finance read" on public.bank_debit_links;
create policy "bank_debit_links finance read" on public.bank_debit_links
  for select to authenticated using (public.is_finance());

commit;

-- Verify: expect 1 row
select count(*) as table_exists from information_schema.tables where table_name = 'bank_debit_links';
