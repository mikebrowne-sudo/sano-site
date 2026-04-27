-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.6 — Clients RLS lockdown.
--
--  The pre-existing `Public can read clients for shared docs` policy
--  (USING true, SELECT) is dropped. Public share routes
--  (/share/quote/[token], /share/invoice/[token]) now query via the
--  service-role client (token-scoped), so the open read is no longer
--  needed.
--
--  A new `clients_self_read` policy lets a logged-in client see only
--  their own row, keyed off `auth_user_id = auth.uid()`. Staff
--  full-access is preserved. Contractors gain no new clients access.
--
--  Idempotent.
-- ════════════════════════════════════════════════════════════════════

drop policy if exists "Public can read clients for shared docs" on public.clients;

drop policy if exists clients_self_read on public.clients;
create policy clients_self_read on public.clients
  for select
  using (auth_user_id = auth.uid());
