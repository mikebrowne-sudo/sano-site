-- Persist the pay basis (hourly vs fixed) and the approved hours on each
-- contractor payable, so the remittance advice can show hours for hourly
-- pay and a dollar amount only for a manually-set fixed amount — instead of
-- trying to reconstruct hours from the job's allocated hours after the fact.
--
-- Backfill is intentionally NOT done: existing rows keep pay_basis NULL and
-- the remittance falls back to its previous reconcile-from-allocated-hours
-- behaviour for them (new approvals only, per the agreed scope).
--
-- Run once in the Supabase SQL editor.

ALTER TABLE public.contractor_invoices
  ADD COLUMN IF NOT EXISTS pay_basis text
    CHECK (pay_basis IN ('hourly', 'fixed')),
  ADD COLUMN IF NOT EXISTS pay_hours numeric;

COMMENT ON COLUMN public.contractor_invoices.pay_basis IS
  'How this payable was approved: hourly (amount = pay_hours × rate) or fixed (a manually-set amount, e.g. rubbish removal + carpet clean). NULL for legacy rows approved before 2026-07-07.';
COMMENT ON COLUMN public.contractor_invoices.pay_hours IS
  'Approved hours when pay_basis = hourly; NULL for fixed amounts. Display source for the remittance Hours column.';
