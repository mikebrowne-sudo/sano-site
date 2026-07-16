-- ════════════════════════════════════════════════════════════════════
--  Security hardening — restrict worker_documents to STAFF only.
--
--  Before: "Staff full access" policy was `to authenticated using(true)`, so any
--  authenticated user — including a contractor-portal login — could read/write
--  every worker's documents. No contractor UI exposes this today, but the policy
--  itself is too open for a live send.
--
--  After: only non-contractor (staff) authenticated users can access
--  worker_documents. The token-keyed sign-flow uploads + the signing backfill run
--  on the service-role client, which bypasses RLS, so uploads are unaffected.
--
--  Idempotent. Mike-run. REQUIRED before sending a real contractor.
-- ════════════════════════════════════════════════════════════════════

begin;

drop policy if exists "Staff full access to worker_documents" on public.worker_documents;
drop policy if exists worker_documents_staff_all on public.worker_documents;

create policy worker_documents_staff_all on public.worker_documents
  for all
  to authenticated
  using (not public.is_contractor())
  with check (not public.is_contractor());

commit;

-- Verify (read-only):
-- select policyname, roles::text, qual, with_check from pg_policies
--   where schemaname='public' and tablename='worker_documents';
