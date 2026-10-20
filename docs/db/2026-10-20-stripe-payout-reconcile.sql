-- Stripe payout reconciliation (2026-10-20).
--
-- A Stripe payout reaches the bank NET of Stripe's fees (e.g. $569.14 =
-- $585.25 of card payments − $16.11 fees). Auto-reconcile now looks the payout
-- up in Stripe, allocates each invoice its GROSS amount and records the fees as
-- a "Bank fees" expense. The bank line records the fee + the payout id so the
-- line can carry gross allocations, and the fee expense is never re-matched to
-- a debit.
--
-- Idempotent — safe to re-run.

alter table public.bank_transactions
  add column if not exists fee_amount numeric(12,2),
  add column if not exists fee_expense_id uuid references public.expenses(id) on delete set null,
  add column if not exists stripe_payout_id text;

create unique index if not exists bank_transactions_stripe_payout_id_key
  on public.bank_transactions (stripe_payout_id)
  where stripe_payout_id is not null;

alter table public.invoice_payment_allocations
  drop constraint if exists invoice_payment_allocations_method_check;
alter table public.invoice_payment_allocations
  add constraint invoice_payment_allocations_method_check
  check (method in ('manual', 'invoice_ref', 'amount_match', 'stripe_payout'));
