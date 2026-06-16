-- 2026-06-16 — CI-based contractor remittance batches.
--
-- Historical contractor payments live in contractor_invoices (CI-####),
-- not pay_runs, so the pay-run remittance generator can't cover them.
-- This adds an invoice-based remittance batch: an admin selects CIs
-- (across contractors when a household is paid together), sets the
-- payment date + bank reference, optionally adds manual adjustment
-- lines, and the batch snapshots those lines so the remittance always
-- matches what was actually paid (never recomputed).
--
-- Privacy: lines carry contractor pay amounts only — no margin, client
-- totals, quote totals, or base price.
--
-- Additive + idempotent. Run in Supabase SQL Editor before deploying.

begin;

create extension if not exists pgcrypto;
create sequence if not exists public.contractor_remittance_number_seq;

-- Batch header.
create table if not exists public.contractor_remittances (
  id                uuid primary key default gen_random_uuid(),
  remittance_number text not null default ('RA-' || lpad(nextval('public.contractor_remittance_number_seq')::text, 4, '0')),
  token             text not null unique default encode(gen_random_bytes(16), 'hex'),
  payment_date      date not null,
  reference         text,
  payee_label       text,
  notes             text,
  sent_at           timestamptz,
  sent_by           uuid references auth.users(id) on delete set null,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

-- Snapshotted lines (invoice lines + manual adjustment lines).
create table if not exists public.contractor_remittance_items (
  id                    uuid primary key default gen_random_uuid(),
  remittance_id         uuid not null references public.contractor_remittances(id) on delete cascade,
  kind                  text not null default 'invoice' check (kind in ('invoice', 'adjustment')),
  contractor_invoice_id uuid references public.contractor_invoices(id) on delete set null,
  contractor_id         uuid references public.contractors(id) on delete set null,
  contractor_name       text,
  job_number            text,
  job_address           text,
  note                  text,
  label                 text,
  amount                numeric not null default 0,
  sort                  int not null default 0
);

create index if not exists idx_contractor_remittance_items_remittance on public.contractor_remittance_items (remittance_id);

comment on table public.contractor_remittances is
  'Invoice-based contractor remittance batch (header). Lines in contractor_remittance_items are snapshotted at creation so the remittance always matches the actual payment.';

-- RLS — staff (non-contractor) manage; contractors read their own lines
-- (for a future portal view). The public token render route uses
-- service-role, so it does not depend on these.
alter table public.contractor_remittances enable row level security;
alter table public.contractor_remittance_items enable row level security;

drop policy if exists "contractor_remittances staff all" on public.contractor_remittances;
create policy "contractor_remittances staff all"
  on public.contractor_remittances for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

drop policy if exists "contractor_remittance_items staff all" on public.contractor_remittance_items;
create policy "contractor_remittance_items staff all"
  on public.contractor_remittance_items for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

drop policy if exists "contractor_remittance_items contractor read own" on public.contractor_remittance_items;
create policy "contractor_remittance_items contractor read own"
  on public.contractor_remittance_items for select to authenticated
  using (
    contractor_id in (select c.id from public.contractors c where c.auth_user_id = auth.uid())
  );

commit;
