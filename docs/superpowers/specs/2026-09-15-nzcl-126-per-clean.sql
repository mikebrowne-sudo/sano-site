-- ============================================================================
-- NZCL (58B Trias Road) — $126.00 set amount per clean
-- Run in: Supabase SQL Editor, project "Sano" (rcfzlvablzehyawmrdqs)
-- Date: 2026-09-15
--
-- Covers the FOUR unpaid jobs. The fifth (JOB-0293 / CI-0099) is already PAID
-- and settled through remittance RA-0031 — see the note at the bottom; it is
-- deliberately NOT changed here.
--
-- Per-visit pay means a SET AMOUNT for the visit:
--   pay_rate       = 126.00   (the whole payable, not an hourly rate)
--   pay_type       = 'fixed'  (stops it being read as hourly)
--   hours_allocated = NULL    (or the pay UI shows 3 x $126)
-- ============================================================================

BEGIN;

-- ── 1. The four unpaid job_workers rows ────────────────────────────────────
UPDATE job_workers jw
SET pay_rate = 126.00,
    pay_type = 'fixed',
    hours_allocated = NULL,
    approved_hours = NULL
FROM jobs j
JOIN clients cl ON cl.id = j.client_id
WHERE j.id = jw.job_id
  AND cl.name = 'NZCL'
  AND j.deleted_at IS NULL
  AND jw.pay_status = 'pending'
  AND j.job_number IN ('JOB-0299','JOB-0300','JOB-0294','JOB-0369');
-- Expect: UPDATE 4

-- ── 2. The approved-but-unpaid contractor invoice CI-0115 ──────────────────
-- $105.00 -> $126.00. GST is 3/23 of the GST-inclusive total.
-- 126.00 * 3 / 23 = 16.4347... -> 16.43
UPDATE contractor_invoices
SET amount     = 126.00,
    gst_amount = 16.43,
    pay_basis  = 'fixed',
    pay_hours  = NULL
WHERE invoice_number = 'CI-0115'
  AND status = 'approved'
  AND date_paid IS NULL;
-- Expect: UPDATE 1

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================
SELECT j.job_number, j.scheduled_date, j.status,
       jw.pay_rate, jw.pay_type, jw.hours_allocated, jw.pay_status,
       ci.invoice_number, ci.amount, ci.gst_amount, ci.status AS ci_status
FROM jobs j
JOIN job_workers jw ON jw.job_id = j.id
LEFT JOIN clients cl ON cl.id = j.client_id
LEFT JOIN contractor_invoices ci ON ci.job_id = j.id
WHERE cl.name = 'NZCL' AND j.deleted_at IS NULL
ORDER BY j.scheduled_date;
-- Expect: JOB-0293 unchanged at 30.00/hourly (PAID, CI-0099 $105)
--         the other four at 126.00 / fixed / NULL hours
--         CI-0115 at 126.00, GST 16.43

-- ============================================================================
-- NOT DONE HERE — JOB-0293 / CI-0099 ($105.00, paid 31 Aug 2026)
-- ============================================================================
-- This one is settled: CI-0099 is status 'paid', date_paid 2026-08-31, and it
-- was paid through remittance RA-0031 (ref UPASNIPAYROLL270826, sent 31 Aug).
-- Upasni has had the money.
--
-- Editing a paid invoice in place would:
--   • make the remittance total disagree with the sum of its items
--   • change a GST-bearing figure inside the Apr-Sep period being filed
--   • leave no record that the amount ever changed
--
-- The correct treatment is a SEPARATE top-up of the $21.00 difference
-- (126.00 - 105.00), raised as its own contractor invoice and paid in the next
-- run, so both the original payment and the correction stay explainable.
-- Ask before running anything against CI-0099.
