-- 2026-06-12 — PO / client-reference on jobs.
--
-- The `client_reference` (PO / "your reference") and `requires_po` fields
-- already live on quotes and invoices and flow quote→invoice. But the JOB
-- paths dropped them: jobs had no columns, so Quote → Job → Invoice lost the
-- PO and the operator had to re-type it. These columns let the reference
-- snapshot onto the job at creation and auto-pull through to any invoice
-- created from the job.
--
-- Additive + safe: nullable text + boolean default false. No backfill needed
-- (historical job-path invoices already use the display fallback).
--
-- APPLY ORDER: run this BEFORE deploying the code that reads/writes these
-- columns (the same Supabase project backs prod + PR previews).

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS client_reference text,
  ADD COLUMN IF NOT EXISTS requires_po boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.jobs.client_reference IS 'Client PO / job reference, snapshotted from the source quote or invoice so it auto-pulls through to invoices created from the job.';
COMMENT ON COLUMN public.jobs.requires_po IS 'Whether the client requires a PO before invoicing, carried from the source quote/invoice.';
