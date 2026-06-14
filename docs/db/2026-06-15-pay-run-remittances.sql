-- 2026-06-15 — Contractor remittance advice.
--
-- A remittance advice is a contractor's slice of a PAID contractor pay
-- run, as a document: the jobs they were paid for (job #, address,
-- hours, pay) + a total. Staff send them from the paid pay run; the
-- contractor gets a PDF by email and a record in their portal.
--
-- This table records WHICH remittances have been generated/sent. The
-- line detail stays derived from pay_run_items at render time (no
-- duplication). Each remittance carries a secret token so the render
-- route (PDF + portal + email link) can resolve it without a session.
--
-- Additive + idempotent. Run in Supabase SQL Editor before deploying.

begin;

create extension if not exists pgcrypto;

create sequence if not exists public.remittance_number_seq;

create table if not exists public.pay_run_remittances (
  id                uuid primary key default gen_random_uuid(),
  pay_run_id        uuid not null references public.pay_runs(id)     on delete cascade,
  contractor_id     uuid not null references public.contractors(id)  on delete cascade,
  remittance_number text not null default ('RA-' || lpad(nextval('public.remittance_number_seq')::text, 4, '0')),
  token             text not null unique default encode(gen_random_bytes(16), 'hex'),
  sent_at           timestamptz,
  sent_by           uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (pay_run_id, contractor_id)
);

create index if not exists idx_pay_run_remittances_contractor on public.pay_run_remittances (contractor_id);
create index if not exists idx_pay_run_remittances_run on public.pay_run_remittances (pay_run_id);

comment on table public.pay_run_remittances is
  'One row per (paid pay run, contractor) — a remittance advice. Lines derive from pay_run_items; token keys the public render route.';

alter table public.pay_run_remittances enable row level security;

-- Staff (non-contractor) manage everything.
drop policy if exists "remittances staff all" on public.pay_run_remittances;
create policy "remittances staff all"
  on public.pay_run_remittances for all to authenticated
  using (not public.is_contractor())
  with check (not public.is_contractor());

-- Contractor reads only their own remittances (for the portal list).
drop policy if exists "remittances contractor read own" on public.pay_run_remittances;
create policy "remittances contractor read own"
  on public.pay_run_remittances for select to authenticated
  using (
    contractor_id in (select c.id from public.contractors c where c.auth_user_id = auth.uid())
  );

commit;
