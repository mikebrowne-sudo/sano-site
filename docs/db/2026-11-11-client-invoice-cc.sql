-- Per-client "Also send invoices to" (CC on every invoice + reminder email).
-- Additive + idempotent. Run in the Supabase SQL editor (project Sano) BEFORE
-- the PR is deployed: the client and invoice pages read this column.

begin;

alter table public.clients
  add column if not exists invoice_cc_emails text[] not null default '{}';

comment on column public.clients.invoice_cc_emails is
  'Extra addresses CC''d on every invoice email, recurring auto-send and payment reminder for this client.';

commit;
