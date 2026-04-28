-- Phase 5.5.16 — UNIQUE index on invoices.invoice_number.
--
-- Closes the longest-standing data-integrity gap: the application
-- generates invoice numbers but nothing in the schema prevents two
-- inserts from racing into the same number. Pre-flight check
-- confirmed zero duplicates exist at apply time.
--
-- Partial index (WHERE invoice_number IS NOT NULL) so legacy rows
-- without a number stay legal during any future migrations.
-- Idempotent — wrapping in DO block lets the file be re-applied.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'invoices'
      AND indexname = 'invoices_invoice_number_unique'
  ) THEN
    CREATE UNIQUE INDEX invoices_invoice_number_unique
      ON public.invoices (invoice_number)
      WHERE invoice_number IS NOT NULL;
  END IF;
END$$;
