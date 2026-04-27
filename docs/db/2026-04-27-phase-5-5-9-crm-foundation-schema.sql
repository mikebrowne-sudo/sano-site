-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.9 — CRM data foundation (schema only).
--
--  Strictly additive + idempotent. No drops, no renames, no type
--  changes. Existing snapshot columns on quotes / jobs / invoices
--  (contact_*, accounts_*, service_address, address) stay so historical
--  documents read identically.
--
--  Pairs with 2026-04-27-phase-5-5-9-crm-foundation-backfill.sql.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. clients extensions ──────────────────────────────────────────
alter table public.clients add column if not exists client_type text;
alter table public.clients add column if not exists lead_source text;
alter table public.clients add column if not exists referred_by text;
alter table public.clients add column if not exists accounts_email text;
alter table public.clients add column if not exists is_archived boolean not null default false;
alter table public.clients add column if not exists archived_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clients_client_type_check') then
    alter table public.clients
      add constraint clients_client_type_check
      check (client_type is null or client_type in ('individual','company','property_manager'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'clients_lead_source_check') then
    alter table public.clients
      add constraint clients_lead_source_check
      check (lead_source is null or lead_source in ('google','social','referral','existing_client','other'));
  end if;
end $$;

create index if not exists clients_active_idx
  on public.clients (name) where is_archived = false;

-- ── 2. contacts (new) ──────────────────────────────────────────────
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  full_name text not null,
  contact_type text not null default 'primary',
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  constraint contacts_contact_type_check
    check (contact_type in ('primary','accounts','site','other'))
);

create index if not exists contacts_client_idx on public.contacts (client_id);
create index if not exists contacts_email_lower_idx
  on public.contacts (lower(email)) where email is not null;

alter table public.contacts enable row level security;

drop policy if exists "Staff full access to contacts" on public.contacts;
create policy "Staff full access to contacts" on public.contacts
  for all using (true) with check (true);

drop policy if exists contacts_self_read on public.contacts;
create policy contacts_self_read on public.contacts
  for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = contacts.client_id
        and c.auth_user_id = auth.uid()
    )
  );

-- ── 3. sites (new) ─────────────────────────────────────────────────
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  address text not null,
  suburb text,
  access_notes text,
  parking_notes text,
  alarm_notes text,
  default_contact_id uuid references public.contacts(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists sites_client_idx on public.sites (client_id);

alter table public.sites enable row level security;

drop policy if exists "Staff full access to sites" on public.sites;
create policy "Staff full access to sites" on public.sites
  for all using (true) with check (true);

drop policy if exists sites_self_read on public.sites;
create policy sites_self_read on public.sites
  for select
  using (
    exists (
      select 1 from public.clients c
      where c.id = sites.client_id
        and c.auth_user_id = auth.uid()
    )
  );

-- ── 4. link fields on documents (all nullable) ─────────────────────
alter table public.quotes add column if not exists contact_id uuid references public.contacts(id) on delete set null;
alter table public.quotes add column if not exists site_id    uuid references public.sites(id)    on delete set null;

alter table public.jobs add column if not exists contact_id uuid references public.contacts(id) on delete set null;
alter table public.jobs add column if not exists site_id    uuid references public.sites(id)    on delete set null;
alter table public.jobs add column if not exists source     text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_source_check') then
    alter table public.jobs
      add constraint jobs_source_check
      check (source is null or source in ('quote','manual','recurring'));
  end if;
end $$;

alter table public.invoices add column if not exists contact_id uuid references public.contacts(id) on delete set null;
alter table public.invoices add column if not exists job_id     uuid references public.jobs(id)     on delete set null;
alter table public.invoices add column if not exists source     text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'invoices_source_check') then
    alter table public.invoices
      add constraint invoices_source_check
      check (source is null or source in ('job','manual','recurring'));
  end if;
end $$;

create index if not exists quotes_contact_idx   on public.quotes  (contact_id) where contact_id is not null;
create index if not exists quotes_site_idx      on public.quotes  (site_id)    where site_id    is not null;
create index if not exists jobs_contact_idx     on public.jobs    (contact_id) where contact_id is not null;
create index if not exists jobs_site_idx        on public.jobs    (site_id)    where site_id    is not null;
create index if not exists invoices_contact_idx on public.invoices(contact_id) where contact_id is not null;
create index if not exists invoices_job_idx     on public.invoices(job_id)     where job_id     is not null;
