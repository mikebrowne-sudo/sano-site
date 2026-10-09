-- 2.5% card fee: the fee inside a quote's card payment, carried onto the
-- invoice as a line when the invoice is created. Run BEFORE merging the PR.

alter table public.quotes add column if not exists card_fee_amount numeric(10,2);

-- verify: expect 1 row
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'quotes' and column_name = 'card_fee_amount';
