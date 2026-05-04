-- Phase 5.5.X — Custom invoice service description.
-- Adds a nullable text column for an explicit, multi-line "Service
-- description" string that overrides the computed buildServiceDescription
-- output on the print / share / detail views. Mirrors the existing
-- quotes.generated_scope override pattern.
--
-- Strictly additive. Existing inserts (createInvoiceFromJob,
-- convertToInvoice, createJobAndInvoiceFromQuote) don't set the column,
-- so it stays null and the existing fallback continues to run unchanged.

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'invoices'
      and column_name = 'service_description'
  ) then
    alter table public.invoices add column service_description text;
  end if;
end $$;
