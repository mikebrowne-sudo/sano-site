-- Card payment on quotes (Stripe "Pay for your booking").
-- An accepted one-off cash-sale quote can be paid upfront; the invoice made
-- from it is then created already paid. Run BEFORE merging the PR.

alter table public.quotes add column if not exists stripe_checkout_session_id text;
alter table public.quotes add column if not exists stripe_payment_intent_id text;
alter table public.quotes add column if not exists card_paid_at timestamptz;
alter table public.quotes add column if not exists card_amount_paid numeric(10,2);

-- verify: expect 4 rows
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'quotes'
  and column_name in ('stripe_checkout_session_id','stripe_payment_intent_id','card_paid_at','card_amount_paid');
