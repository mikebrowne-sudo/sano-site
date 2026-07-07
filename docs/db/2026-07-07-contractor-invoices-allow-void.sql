-- 2026-07-07 — Allow 'void' status on contractor_invoices.
--
-- The contractor-pay void tooling (PR #327, voidContractorPayable) sets
-- contractor_invoices.status = 'void' so a mistaken payable can be reversed
-- and redone. But the status CHECK constraint was never widened to include
-- 'void', so every void attempt failed at the database with a check-constraint
-- violation. This adds 'void' to the allowed set, mirroring
-- pay_run_items_status_check ('pending','approved','paid','void').
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.contractor_invoices
  drop constraint if exists contractor_invoices_status_check;

alter table public.contractor_invoices
  add constraint contractor_invoices_status_check
  check (status in ('pending', 'approved', 'paid', 'void'));

commit;
