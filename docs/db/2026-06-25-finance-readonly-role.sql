-- 2026-06-25 — Accountant (finance) read-only role.
--
-- Two accountant logins (john@ / jason@taxaction.co.nz) need to VIEW and
-- export the finance area but never change anything. This adds:
--   • public.is_finance() — true for admins OR the accountant emails. Keep the
--     email list in sync with ACCOUNTANT_EMAILS in src/lib/is-admin.ts.
--   • an additive, SELECT-only RLS policy on each finance table, so finance
--     users can read them. No INSERT/UPDATE/DELETE policy is added, so
--     accountants cannot write. Admins keep full access via their existing
--     is_admin() policies (and also satisfy is_finance()).
--
-- Additive + idempotent. Run in the Supabase SQL Editor before deploying.
-- The app layer additionally restricts accountants to the finance pages.

begin;

create or replace function public.is_finance()
  returns boolean
  language sql
  stable
as $$
  select coalesce((auth.jwt() ->> 'email') in ('john@taxaction.co.nz', 'jason@taxaction.co.nz'), false)
     or public.is_admin()
$$;

-- Add a read-only "finance read" SELECT policy to each finance table that
-- exists. Guarded by to_regclass so a missing table can't break the run.
do $$
declare
  t text;
  finance_tables text[] := array[
    'invoices', 'invoice_items', 'clients', 'expenses',
    'jobs', 'job_workers', 'contractors', 'contractor_invoices',
    'pay_runs', 'pay_run_items', 'bank_transactions'
  ];
begin
  foreach t in array finance_tables loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t || ' finance read', t);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_finance())',
        t || ' finance read', t
      );
    end if;
  end loop;
end $$;

commit;
