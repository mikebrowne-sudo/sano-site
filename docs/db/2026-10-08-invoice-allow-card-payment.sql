-- Per-invoice "Show Pay now" override. null = default (cash-sale on,
-- on-account off); true/false = staff override. Run BEFORE merging PR #637.

alter table public.invoices add column if not exists allow_card_payment boolean;

-- verify: expect 1 row
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'invoices' and column_name = 'allow_card_payment';
