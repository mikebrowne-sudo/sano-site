-- Phase 5.5.16 fix — invoice double-count caused by createInvoiceFromJob.
--
-- The action was writing `base_price = job.job_price` AND inserting a
-- single invoice_item with the SAME amount. Every render surface
-- (detail, list, share, PDF, Stripe, email) uses the formula
-- `total = base_price + sum(items) - discount`, so the displayed
-- total was 2× the real price for every job-based invoice.
--
-- Two invoices were affected: INV-0043 and INV-0044 (each $480
-- displayed as $960). This script deletes the duplicate line items
-- so the totals restore to the correct value.
--
-- Idempotent — only deletes line items where:
--   • the invoice has exactly one item, AND
--   • the item price equals base_price (within 1 cent), AND
--   • base_price > 0
-- This pattern is unique to the bug — addon invoices never match it.

WITH bad AS (
  SELECT i.id AS invoice_id
  FROM invoices i
  JOIN (
    SELECT invoice_id, SUM(price) AS items_sum, COUNT(*) AS n
    FROM invoice_items
    GROUP BY invoice_id
  ) s ON s.invoice_id = i.id
  WHERE ABS(COALESCE(i.base_price, 0) - s.items_sum) < 0.01
    AND s.n = 1
    AND i.base_price > 0
)
DELETE FROM invoice_items
WHERE invoice_id IN (SELECT invoice_id FROM bad);
