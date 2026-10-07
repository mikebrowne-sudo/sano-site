-- Invoice-level "Billed to" override (2026-09-30).
-- Lets staff address a single invoice to e.g. the client's company with
-- "Attn:" the person, without renaming the client (which would rewrite
-- every past invoice, since the document reads clients.name live).
-- Both nullable; NULL = existing behaviour. Additive + safe to re-run.
alter table public.invoices
  add column if not exists bill_to_name text,
  add column if not exists bill_to_attention text;

comment on column public.invoices.bill_to_name is
  'Optional per-invoice override for the Billed-to name (e.g. company). NULL = client name.';
comment on column public.invoices.bill_to_attention is
  'Optional per-invoice override for the Attn: line. NULL = accounts/primary contact.';
