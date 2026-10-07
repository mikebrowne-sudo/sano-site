-- 2026-09-30 — Close anonymous (public-key) access. PR A of the RLS hardening.
--
-- The publishable/anon key ships in every page, so any policy granted to
-- `anon` or `public` with a permissive predicate is readable (or writable) by
-- anyone on the internet. Found live:
--   * invoices / invoice_items / quotes / quote_items: anon SELECT using (true)
--   * quotes: anon UPDATE using (true) with check (true)  — anyone could edit any quote
--   * contacts / sites: "Staff full access" granted to PUBLIC using (true) — full CRUD for anon
--   * applicants / contractor_onboarding / workforce_settings /
--     notification_inbound_messages: SELECT using (NOT is_contractor()) to PUBLIC —
--     is_contractor() is false for anon, so anon could read them
--   * webhook_events / mileage_rate_config: RLS disabled
--
-- Nothing in the app needs anon access to these: share pages, quote accept,
-- share PDFs, Stripe webhook and submit-application all use the service-role
-- key. The only anon reader (Stripe create-checkout) is switched to the
-- service role in the same PR — DEPLOY THAT CODE BEFORE RUNNING THIS.
--
-- Deliberately NOT touched here (PR B): the {authenticated} using (true)
-- "Staff full access" policies. Contractors/client-portal logins read some of
-- those tables with their own session, so tightening them needs its own pass.
-- Also untouched: fitness_* tables (not Sano data).
--
-- Idempotent: safe to re-run.

begin;

-- ── Helper: a logged-in internal user (staff/admin/finance) ──────────────
-- Logged in, not a contractor, not a client-portal login. Mirrors the old
-- "NOT is_contractor()" intent without letting anon or clients through.
create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and not exists (select 1 from public.contractors where auth_user_id = auth.uid())
    and not exists (select 1 from public.clients where auth_user_id = auth.uid())
$$;
revoke all on function public.is_internal_user() from public, anon;
grant execute on function public.is_internal_user() to authenticated;

-- ── 1. Invoices / quotes: drop every anon policy ─────────────────────────
drop policy if exists "Public can read invoices by share_token" on public.invoices;
drop policy if exists "Public can read invoice_items for shared docs" on public.invoice_items;
drop policy if exists "Public can read quotes by share_token" on public.quotes;
drop policy if exists "Anon can accept quotes by share_token" on public.quotes;
drop policy if exists "Public can read quote_items for shared docs" on public.quote_items;

-- ── 2. contacts / sites: staff-only (client self-read policies unchanged) ─
drop policy if exists "Staff full access to contacts" on public.contacts;
create policy "Staff full access to contacts" on public.contacts
  for all to authenticated
  using (public.is_internal_user()) with check (public.is_internal_user());

drop policy if exists "Staff full access to sites" on public.sites;
create policy "Staff full access to sites" on public.sites
  for all to authenticated
  using (public.is_internal_user()) with check (public.is_internal_user());

-- ── 3. "NOT is_contractor()" reads → internal users only ─────────────────
drop policy if exists applicants_staff_select on public.applicants;
create policy applicants_staff_select on public.applicants
  for select to authenticated using (public.is_internal_user());

drop policy if exists co_staff_select on public.contractor_onboarding;
create policy co_staff_select on public.contractor_onboarding
  for select to authenticated using (public.is_internal_user());

drop policy if exists ws_staff_select on public.workforce_settings;
create policy ws_staff_select on public.workforce_settings
  for select to authenticated using (public.is_internal_user());

drop policy if exists nim_staff_select on public.notification_inbound_messages;
create policy nim_staff_select on public.notification_inbound_messages
  for select to authenticated using (public.is_internal_user());

-- ── 4. Tables with RLS switched off ──────────────────────────────────────
-- webhook_events: written/read only by the service role (bypasses RLS).
alter table public.webhook_events enable row level security;

-- mileage_rate_config: IRD rates, read by the staff portal; admin writes.
alter table public.mileage_rate_config enable row level security;
drop policy if exists mileage_rate_config_read on public.mileage_rate_config;
create policy mileage_rate_config_read on public.mileage_rate_config
  for select to authenticated using (public.is_internal_user());
drop policy if exists mileage_rate_config_admin_write on public.mileage_rate_config;
create policy mileage_rate_config_admin_write on public.mileage_rate_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;
