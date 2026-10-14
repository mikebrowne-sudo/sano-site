-- Automatic payments by NZ direct debit (Stripe NZ BECS) — 2026-10-15
--
-- A client saves their bank account once through a Stripe setup page (they
-- accept the direct debit authority there). From then on, each invoice of
-- theirs that is SENT is collected automatically from that account; Stripe
-- tells us when the money clears and the invoice flips to paid.
--
-- Mike-run. Safe to re-run (IF NOT EXISTS / guarded constraints).

alter table public.clients
  add column if not exists stripe_customer_id         text,
  add column if not exists autopay_payment_method_id  text,
  add column if not exists autopay_status             text not null default 'none',
  add column if not exists autopay_setup_at           timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clients_autopay_status_check') then
    alter table public.clients add constraint clients_autopay_status_check
      check (autopay_status in ('none', 'active', 'paused', 'failed'));
  end if;
end $$;

alter table public.invoices
  add column if not exists autopay_payment_intent_id  text,
  add column if not exists autopay_status             text,
  add column if not exists autopay_error              text,
  add column if not exists autopay_requested_at       timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_autopay_status_check') then
    alter table public.invoices add constraint invoices_autopay_status_check
      check (autopay_status is null or autopay_status in ('processing', 'succeeded', 'failed'));
  end if;
end $$;

-- Check
select column_name from information_schema.columns
where table_schema = 'public' and table_name in ('clients', 'invoices')
  and (column_name like 'autopay%' or column_name = 'stripe_customer_id')
order by table_name, column_name;
