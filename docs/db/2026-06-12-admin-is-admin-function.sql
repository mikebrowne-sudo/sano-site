-- 2026-06-12 — Centralise admin RLS on a public.is_admin() function.
--
-- Previously every admin-write policy hard-coded
--   (auth.jwt() ->> 'email') = 'michael@sano.nz'
-- so adding a second admin (carol@sano.nz) meant editing every policy.
-- This introduces ONE function — public.is_admin() — that all admin
-- policies call. Adding/removing an admin is now a one-line change to the
-- function. Keep its email set in sync with ADMIN_EMAILS in
-- src/lib/is-admin.ts (the app-side gate).
--
-- Safe: michael@sano.nz stays admin (no lock-out). Run in the Supabase
-- SQL Editor — wrapped in a transaction so it's all-or-nothing.

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') in ('michael@sano.nz', 'carol@sano.nz'), false)
$$;

comment on function public.is_admin() is
  'True when the current request JWT email is a full-admin account. Single source for admin RLS — keep in sync with ADMIN_EMAILS in src/lib/is-admin.ts.';

-- ALL / UPDATE policies (USING + WITH CHECK)
alter policy "co_admin_write"                              on public.contractor_onboarding        using (public.is_admin()) with check (public.is_admin());
alter policy "job_settings admin write"                    on public.job_settings                 using (public.is_admin()) with check (public.is_admin());
alter policy "notification_settings admin write"           on public.notification_settings        using (public.is_admin()) with check (public.is_admin());
alter policy "notification_templates admin write"          on public.notification_templates       using (public.is_admin()) with check (public.is_admin());
alter policy "pay_run_items admin write"                   on public.pay_run_items                using (public.is_admin()) with check (public.is_admin());
alter policy "portal_settings admin write"                 on public.portal_settings              using (public.is_admin()) with check (public.is_admin());
alter policy "pricing_global_settings admin write"         on public.pricing_global_settings      using (public.is_admin()) with check (public.is_admin());
alter policy "pricing_margin_tiers admin write"            on public.pricing_margin_tiers         using (public.is_admin()) with check (public.is_admin());
alter policy "pricing_residential_settings write for admin" on public.pricing_residential_settings using (public.is_admin()) with check (public.is_admin());
alter policy "pricing_sector_multipliers admin write"      on public.pricing_sector_multipliers   using (public.is_admin()) with check (public.is_admin());
alter policy "pricing_traffic_multipliers admin write"     on public.pricing_traffic_multipliers  using (public.is_admin()) with check (public.is_admin());
alter policy "recurring_contract_reminders admin write"    on public.recurring_contract_reminders using (public.is_admin()) with check (public.is_admin());
alter policy "staff_admin_all"                             on public.staff                        using (public.is_admin()) with check (public.is_admin());
alter policy "ws_admin_write"                              on public.workforce_settings           using (public.is_admin()) with check (public.is_admin());

-- DELETE / UPDATE policies (USING only)
alter policy "applicants_admin_delete" on public.applicants using (public.is_admin());
alter policy "applicants_admin_update" on public.applicants using (public.is_admin());

commit;
