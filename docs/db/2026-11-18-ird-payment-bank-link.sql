-- IRD payments recorded from the bank feed (PR: payroll paid from bank).
-- Links each IRD ledger payment to the bank line it came from, so a bank line
-- is applied at most once. Additive + nullable: existing payments unaffected.

alter table public.ird_liability_payments
  add column if not exists bank_transaction_id uuid references public.bank_transactions(id) on delete set null;

create index if not exists ird_liability_payments_bank_txn_idx
  on public.ird_liability_payments (bank_transaction_id)
  where bank_transaction_id is not null;

-- Check: should return one row, data_type uuid.
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'ird_liability_payments' and column_name = 'bank_transaction_id';
