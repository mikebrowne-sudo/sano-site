-- ════════════════════════════════════════════════════════════════════
--  Phase 4 — contractor trading structure & tax-review workflow.
--
--  Additive columns on contractors + a safe, non-blocking backfill.
--  Reuses existing business_structure / company_name / nzbn / gst_* fields;
--  adds a staff tax-review lifecycle + the IR330C-requested flag + legal
--  entity name / company number. No parallel tax system.
--
--  Idempotent. Mike-run.
-- ════════════════════════════════════════════════════════════════════

begin;

alter table public.contractors add column if not exists tax_review_status text;
alter table public.contractors add column if not exists tax_review_notes  text;
alter table public.contractors add column if not exists ir330c_requested   boolean;
alter table public.contractors add column if not exists company_number     text;
alter table public.contractors add column if not exists legal_name         text;

-- Backfill (non-blocking): give existing contractors an initial review state
-- so staff can see "Review required". The tax_review CHECKLIST item stays
-- PENDING — this column is informational and NOT a gate, so no legacy active
-- contractor is blocked. No IR330C status is inferred from agreement wording.
update public.contractors
   set tax_review_status = 'review_required'
 where worker_type = 'contractor'
   and tax_review_status is null;

-- Only where structure is explicitly known, mark whether an IR330C is likely
-- expected (sole trader / other = individuals). Never a final determination.
update public.contractors
   set ir330c_requested = (business_structure in ('sole_trader', 'other'))
 where worker_type = 'contractor'
   and ir330c_requested is null
   and business_structure is not null;

commit;
