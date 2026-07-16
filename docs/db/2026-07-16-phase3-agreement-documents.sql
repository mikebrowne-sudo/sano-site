-- ════════════════════════════════════════════════════════════════════
--  Phase 3 — contractor-facing document uploads on the agreement flow.
--
--  Reuses the existing worker_documents table + worker-documents bucket.
--  Adds an agreement link so a signer can upload BEFORE their contractor
--  record exists (new contractors are created on signing); the signing
--  action then backfills contractor_id.
--
--  Idempotent + additive. Mike-run.
-- ════════════════════════════════════════════════════════════════════

begin;

-- Allow a document to exist before it is attached to a contractor
-- (pre-sign uploads carry only agreement_id until signing backfills
-- contractor_id).
alter table public.worker_documents
  alter column contractor_id drop not null;

alter table public.worker_documents
  add column if not exists agreement_id uuid
    references public.employment_agreements(id) on delete set null;

create index if not exists worker_documents_agreement_idx
  on public.worker_documents(agreement_id);

commit;
