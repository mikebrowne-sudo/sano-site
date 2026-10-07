-- 2026-08-01 — Allow both admins to write portal_settings.
--
-- The bank balance shown on the dashboard is captured from the ASB CSV
-- imported into reconciliation (portal_settings key 'bank_balance'). The
-- reconcile import runs as the signed-in admin using the user session client,
-- so RLS applies. The existing write policy only permitted michael@sano.nz, so
-- an import by carol@sano.nz would silently fail to save the balance.
--
-- Widen the write policy to both app admins (matches ADMIN_EMAILS in
-- src/lib/is-admin.ts: michael@sano.nz + carol@sano.nz). Read policy (staff)
-- is unchanged. Additive + idempotent. Run in the Supabase SQL Editor.

begin;

drop policy if exists "portal_settings admin write" on public.portal_settings;
create policy "portal_settings admin write"
  on public.portal_settings
  for all to authenticated
  using      ((select auth.jwt() ->> 'email') in ('michael@sano.nz', 'carol@sano.nz'))
  with check ((select auth.jwt() ->> 'email') in ('michael@sano.nz', 'carol@sano.nz'));

commit;
