-- 2026-08-04 — Allow statutory-form document types on worker_documents.
--
-- The worker_documents.document_type check constraint did not include the tax /
-- KiwiSaver form types the UI offers, so uploading them failed with:
--   new row for relation "worker_documents" violates check constraint
--   "worker_documents_document_type_check"
--
-- Note 'ir330c' was ALREADY offered by the upload UI but was NOT in the
-- constraint — a latent bug. This adds the three form types:
--   • ir330        — employee IR330 (tax code)
--   • ir330c       — contractor IR330C (withholding tax)
--   • ks10_optout  — KiwiSaver KS10 opt-out
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.worker_documents
  drop constraint if exists worker_documents_document_type_check;

alter table public.worker_documents
  add constraint worker_documents_document_type_check
  check (document_type = any (array[
    'contract',
    'insurance',
    'right_to_work',
    'ir330',
    'ir330c',
    'ks10_optout',
    'health_and_safety',
    'onboarding',
    'policy',
    'id_verification',
    'other'
  ]::text[]));

commit;
