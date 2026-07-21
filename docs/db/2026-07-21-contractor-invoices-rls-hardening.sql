-- 2026-07-21 — Close the contractor_invoices RLS hole.
--
-- BEFORE: contractor_invoices carried a policy
--   "Staff full access to contractor_invoices"  FOR ALL TO authenticated
--   USING (true) WITH CHECK (true)
-- Because contractors log in as `authenticated` (and the anon key is public),
-- that blanket policy let ANY logged-in contractor read AND write EVERY
-- contractor's invoices directly via PostgREST — a real privacy hole.
--
-- The application never relied on contractor RLS here: the contractor portal
-- reads (contractor-pay-data / contractor-job-detail-data / contractor-job-history)
-- all use the SERVICE-ROLE client with a hard contractor_id filter (which
-- bypasses RLS). Staff/admin/finance read+write via the authenticated staff
-- session (non-contractor) or service-role.
--
-- FIX: scope the blanket policy to non-contractors, matching the sibling
-- contractor-payment tables (contractor_remittances / contractor_statements,
-- which already use `NOT is_contractor()`). Staff/admin/finance keep full
-- access; contractors get none. No application code changes.
--
-- Additive/idempotent. Focused hardening only — no statement functionality here.

begin;

drop policy if exists "Staff full access to contractor_invoices" on public.contractor_invoices;

create policy "contractor_invoices staff all"
  on public.contractor_invoices for all to authenticated
  using (not public.is_contractor())
  with check (not public.is_contractor());

-- The pre-existing "contractor_invoices finance read" (USING is_finance()) policy
-- is left in place; it is now redundant (finance users are non-contractors, so
-- the staff policy already covers them) but harmless.

commit;

-- ── Rolled-back production-safe verification (run after applying) ─────────────
-- Impersonate roles via request.jwt.claims inside a transaction; reads only.
--
-- Contractor SELECT denied (expect 0):
--   begin; set local role authenticated;
--   select set_config('request.jwt.claims','{"sub":"<contractor auth_user_id>","role":"authenticated"}', true);
--   select public.is_contractor(), (select count(*) from public.contractor_invoices);
-- Contractor INSERT denied / UPDATE affects 0 rows; cross-contractor sees 0.
-- Staff (email michael@sano.nz) and finance (john@taxaction.co.nz) still see all.
--
-- Verified 2026-07-21: contractor SELECT=0, INSERT denied, UPDATE 0 rows,
-- cross-contractor=0, staff=66, finance=66, service-role portal path=37.
