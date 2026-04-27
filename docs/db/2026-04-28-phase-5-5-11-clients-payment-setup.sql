-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.11 — Clients payment setup + business type.
--
--  Additive + idempotent. Adds three columns to `clients`:
--    payment_type   ∈ {prepaid, on_account}
--    payment_terms  ∈ {7_days, 14_days, 20_of_month, custom}  (only
--                     meaningful when payment_type='on_account')
--    business_type  ∈ {property_management, construction,
--                      office_commercial, retail_hospitality,
--                      body_corporate, other}
--
--  Quotes / invoices keep their existing `payment_type` column shape
--  ('cash_sale' | 'on_account') so PDFs / share routes / Stripe
--  checkout / proposal templates read it unchanged. When a quote is
--  created from a client, the app maps:
--      clients.payment_type='prepaid'    → quotes.payment_type='cash_sale'
--      clients.payment_type='on_account' → quotes.payment_type='on_account'
--
--  No data migration in this file — existing clients' new columns
--  stay NULL until an admin sets them via the new client modal /
--  edit form. Quote creation falls back to the operator's old per-
--  quote toggle when the client has no defaults set, so legacy rows
--  continue to behave the same.
-- ════════════════════════════════════════════════════════════════════

alter table public.clients
  add column if not exists payment_type text;

alter table public.clients
  add column if not exists payment_terms text;

alter table public.clients
  add column if not exists business_type text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clients_payment_type_check') then
    alter table public.clients
      add constraint clients_payment_type_check
      check (payment_type is null or payment_type in ('prepaid','on_account'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_payment_terms_check') then
    alter table public.clients
      add constraint clients_payment_terms_check
      check (payment_terms is null or payment_terms in ('7_days','14_days','20_of_month','custom'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_business_type_check') then
    alter table public.clients
      add constraint clients_business_type_check
      check (business_type is null or business_type in (
        'property_management','construction','office_commercial','retail_hospitality','body_corporate','other'
      ));
  end if;
end $$;
