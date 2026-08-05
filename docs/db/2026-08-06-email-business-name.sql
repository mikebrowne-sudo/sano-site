-- 2026-08-06 — Email business name (campaign-facing clean name).
--
-- A separate, campaign-facing business name interpolated into cold-email
-- subject lines and bodies. The CRM `company` field is the source of truth and
-- is NEVER altered by this — `email_business_name` is the clean version used
-- only for outbound campaign copy.
--
-- Null = not yet resolved. The launch gate treats null/blank/unsafe as blocking
-- for that lead (must be filled in the review panel first). A separate backfill
-- (run once, reviewed by Mike before sending) populates conservative proposals.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.sales_leads
  add column if not exists email_business_name text;

comment on column public.sales_leads.email_business_name is
  'Clean, campaign-facing business name used in cold-email subject/body. Separate from `company` (the CRM name, never altered). Null/blank = unresolved → blocks that lead from launching until filled.';

commit;
