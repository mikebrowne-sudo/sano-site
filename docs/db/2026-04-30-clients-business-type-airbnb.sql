-- Extend clients.business_type CHECK to allow 'airbnb'.
-- Airbnb hosts are a frequent source of recurring residential bookings
-- and need their own segment for reporting and smart-default payment
-- behaviour. Existing rows are unchanged; new constraint accepts the
-- old set plus 'airbnb'.
--
-- Applied via Supabase MCP on 2026-04-30.

do $$
begin
  alter table public.clients drop constraint if exists clients_business_type_check;
  alter table public.clients
    add constraint clients_business_type_check
    check (business_type is null or business_type in (
      'property_management','construction','office_commercial',
      'retail_hospitality','body_corporate','airbnb','other'
    ));
end $$;
