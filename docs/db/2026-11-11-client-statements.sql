-- Customer statements: one email listing a client's outstanding invoices,
-- one bank reference (STM-YYMMNN) to pay them all. A statement is a record of
-- what was sent, not a tax invoice: payments are still allocated to each
-- invoice. Additive + idempotent. Run in the Supabase SQL editor (project
-- Sano) BEFORE the PR is deployed.

begin;

create table if not exists public.statements (
  id                uuid primary key default gen_random_uuid(),
  statement_number  text not null unique,
  client_id         uuid not null references public.clients(id),
  share_token       uuid not null unique default gen_random_uuid(),
  invoice_ids       uuid[] not null,
  -- Total outstanding across invoice_ids when it was sent (GST incl.).
  total             numeric(12,2) not null,
  include_autopay   boolean not null default false,
  sent_to           text,
  cc_emails         text[] not null default '{}',
  subject           text,
  resend_id         text,
  sent_at           timestamptz,
  sent_by           uuid,
  created_at        timestamptz not null default now()
);

create index if not exists statements_client_idx on public.statements (client_id, created_at desc);

alter table public.statements enable row level security;

drop policy if exists statements_admin_all on public.statements;
create policy statements_admin_all on public.statements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists statements_finance_read on public.statements;
create policy statements_finance_read on public.statements
  for select to authenticated using (public.is_finance());

commit;

-- verify: expect 1 row, rls = true
select relname, relrowsecurity as rls from pg_class where relname = 'statements';
