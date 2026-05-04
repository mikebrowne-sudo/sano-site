-- Phase 5.5.X — Custom (legacy) invoices.
-- Two changes, both additive + backward-compatible:
--   1. Allow source = 'custom' on invoices.
--   2. Patch generate_invoice_number() so a manually-supplied
--      invoice_number isn't clobbered by nextval(). Existing call
--      sites never set the field, so they continue to auto-number.

do $$ begin
  if exists (select 1 from pg_constraint where conname = 'invoices_source_check') then
    alter table public.invoices drop constraint invoices_source_check;
  end if;
  alter table public.invoices
    add constraint invoices_source_check
    check (source is null or source in ('job','manual','recurring','custom'));
end $$;

create or replace function public.generate_invoice_number()
returns trigger
language plpgsql
as $func$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$func$;
