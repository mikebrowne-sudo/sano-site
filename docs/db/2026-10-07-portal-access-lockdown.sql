-- 2026-10-07 — Portal access lockdown (RLS "PR B").
--
-- Rule (Mike, 2026-10-07): only Mike + Carol (public.is_admin()) have staff
-- access. Accountants (public.is_finance()) stay READ-ONLY on finance tables.
-- Contractors and client-portal logins see only their own rows.
--
-- Before this, ~40 tables had staff policies of `using (true)`,
-- `using (not is_contractor())` or `using (is_internal_user())` for the
-- `authenticated` role — so ANY signed-in account (contractors, client logins,
-- accountants, orphaned/stray logins) could read and often write invoices,
-- quotes, jobs, clients, payroll, payslips, leads, employment agreements…
--
-- What this does:
--   1. Drops every broad staff policy listed below.
--   2. Gives each of those tables an admin-only ALL policy (is_admin()).
--   3. Adds accountant (is_finance) SELECT on the finance tables they read
--      through the old broad policies, so the finance area keeps working.
--   4. Adds contractor own-job policies on `jobs` (read assigned jobs, update
--      own jobs for start/complete) — the only broad table the contractor app
--      reads with the contractor's own session.
--   5. Locks the `worker-documents` storage bucket (IDs, IR330s,
--      right-to-work) to admins.
--
-- Untouched: contractor/client "own row" policies, INSERT-only audit policies,
-- service-role access (share pages, crons, webhooks, contractor pay/history
-- loaders), anon access (closed separately in 2026-09-30-rls-close-anon-access).
--
-- Run AFTER the matching app deploy (PR "portal access lockdown"). Safe to
-- re-run. Run the whole file in the Supabase SQL editor.

begin;

-- ── 1 + 2. Replace broad staff policies with admin-only ─────────────────────
do $$
declare
  r record;
  broad text[][] := array[
    ['applicants',                    'applicants_staff_select'],
    ['audit_log',                     'audit_log read for staff'],
    ['clients',                       'Staff full access to clients'],
    ['commercial_calculations',       'authenticated users full access'],
    ['commercial_quote_details',      'commercial_quote_details staff full access'],
    ['commercial_scope_items',        'commercial_scope_items staff full access'],
    ['contacts',                      'Staff full access to contacts'],
    ['contractor_incidents',          'authenticated_all'],
    ['contractor_invoices',           'contractor_invoices staff all'],
    ['contractor_onboarding',         'co_staff_select'],
    ['contractor_remittance_items',   'contractor_remittance_items staff all'],
    ['contractor_remittances',        'contractor_remittances staff all'],
    ['contractor_statements',         'contractor_statements staff all'],
    ['contractors',                   'Staff full access to contractors'],
    ['employees',                     'employees staff'],
    ['employment_agreements',         'employment_agreements staff'],
    ['invoice_items',                 'Staff full access to invoice_items'],
    ['invoices',                      'Staff full access to invoices'],
    ['job_items',                     'job_items staff all'],
    ['job_photos',                    'job_photos staff read'],
    ['job_settings',                  'job_settings staff read'],
    ['job_versions',                  'job_versions staff read'],
    ['job_workers',                   'Staff full access to job_workers'],
    ['jobs',                          'Staff full access to jobs'],
    ['mileage_logs',                  'mileage_logs staff read'],
    ['mileage_logs',                  'mileage_logs staff write'],
    ['mileage_rate_config',           'mileage_rate_config_read'],
    ['notification_inbound_messages', 'nim_staff_select'],
    ['notification_logs',             'notification_logs staff read'],
    ['notification_settings',         'notification_settings staff read'],
    ['notification_templates',        'notification_templates staff read'],
    ['pay_run_items',                 'pay_run_items staff read'],
    ['pay_run_lines',                 'Staff full access to pay_run_lines'],
    ['pay_run_remittances',           'remittances staff all'],
    ['pay_runs',                      'Staff full access to pay_runs'],
    ['payslips',                      'Staff full access to payslips'],
    ['portal_settings',               'portal_settings staff read'],
    ['pricing_global_settings',       'pricing_global_settings staff read'],
    ['pricing_margin_tiers',          'pricing_margin_tiers staff read'],
    ['pricing_residential_settings',  'pricing_residential_settings read for authenticated'],
    ['pricing_sector_multipliers',    'pricing_sector_multipliers staff read'],
    ['pricing_traffic_multipliers',   'pricing_traffic_multipliers staff read'],
    ['profiles',                      'Staff can view all profiles'],
    ['quote_items',                   'Staff full access to quote_items'],
    ['quotes',                        'Staff full access to quotes'],
    ['record_snapshots',              'record_snapshots read for staff'],
    ['recurring_contract_reminders',  'recurring_contract_reminders staff read'],
    ['recurring_jobs',                'Staff full access to recurring_jobs'],
    ['review_requests',               'review_requests_staff_all'],
    ['sales_campaign_recipients',     'staff all'],
    ['sales_campaigns',               'staff all'],
    ['sales_lead_activities',         'staff all'],
    ['sales_leads',                   'staff all'],
    ['sites',                         'Staff full access to sites'],
    ['worker_documents',              'worker_documents_staff_all'],
    ['workforce_settings',            'ws_staff_select']
  ];
  i int;
begin
  for i in 1 .. array_length(broad, 1) loop
    if to_regclass('public.' || quote_ident(broad[i][1])) is not null then
      execute format('drop policy if exists %I on public.%I', broad[i][2], broad[i][1]);
      execute format('drop policy if exists %I on public.%I', broad[i][1] || ' admin only', broad[i][1]);
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
        broad[i][1] || ' admin only', broad[i][1]);
    end if;
  end loop;
end $$;

-- ── 3. Accountants: read-only on the finance tables they used ──────────────
do $$
declare
  t text;
  finance_tables text[] := array[
    'contractor_remittances', 'contractor_remittance_items', 'contractor_statements',
    'remittance_payment_allocations', 'invoice_payment_allocations',
    'pay_run_lines', 'payslips', 'pay_run_remittances',
    'mileage_logs', 'mileage_rate_config', 'recurring_jobs',
    'quotes', 'quote_items', 'employees', 'employment_agreements', 'sites', 'contacts'
  ];
begin
  foreach t in array finance_tables loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('drop policy if exists %I on public.%I', t || ' finance read', t);
      execute format('create policy %I on public.%I for select to authenticated using (public.is_finance())', t || ' finance read', t);
    end if;
  end loop;
end $$;

-- ── 4. Contractors: their own jobs only ────────────────────────────────────
-- Read: jobs they're the primary on, or are rostered on via job_workers.
-- Update: jobs they're the primary on (start / complete in the contractor app).
create or replace function public.current_contractor_id()
returns uuid
language sql stable security definer set search_path = public
as $$ select id from public.contractors where auth_user_id = auth.uid() limit 1 $$;

drop policy if exists "jobs contractor read own" on public.jobs;
create policy "jobs contractor read own" on public.jobs
  for select to authenticated
  using (
    public.current_contractor_id() is not null and (
      contractor_id = public.current_contractor_id()
      or exists (select 1 from public.job_workers w
                 where w.job_id = jobs.id and w.contractor_id = public.current_contractor_id())
    )
  );

drop policy if exists "jobs contractor update own" on public.jobs;
create policy "jobs contractor update own" on public.jobs
  for update to authenticated
  using (public.current_contractor_id() is not null and contractor_id = public.current_contractor_id())
  with check (public.current_contractor_id() is not null and contractor_id = public.current_contractor_id());

-- ── 5. worker-documents bucket: admins only ────────────────────────────────
drop policy if exists "Authenticated users can read worker documents" on storage.objects;
drop policy if exists "Authenticated users can upload worker documents" on storage.objects;
drop policy if exists "Authenticated users can delete worker documents" on storage.objects;
drop policy if exists "worker documents admin all" on storage.objects;
create policy "worker documents admin all" on storage.objects
  for all to authenticated
  using (bucket_id = 'worker-documents' and public.is_admin())
  with check (bucket_id = 'worker-documents' and public.is_admin());

commit;

-- ── Verify ─────────────────────────────────────────────────────────────────
-- (a) Expect 0 rows: no public-schema policy still open to every login.
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename not like 'fitness%'
  and qual in ('true', '(NOT is_contractor())', 'is_internal_user()')
order by 1, 2;

-- (b) Expect 0 rows: worker-documents has no policy other than the admin one.
select policyname from pg_policies
where schemaname = 'storage' and coalesce(qual, with_check) like '%worker-documents%'
  and policyname <> 'worker documents admin all';
