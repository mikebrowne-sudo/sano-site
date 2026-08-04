-- 2026-08-04 — Campaigns: optional signature banner image.
--
-- When set, the campaign email's HTML signature is this banner image (linked to
-- sano.nz) instead of the plain text block. The text/plain part always keeps
-- the readable text signature. NULL = text signature only.
--
-- NOTE (deliverability): an image-only signature on COLD email is often blocked
-- by the recipient's client on first contact and can raise spam scores. Use with
-- care; the plain text signature is safer for cold outreach. This column just
-- makes the choice available per campaign.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.sales_campaigns
  add column if not exists signature_banner_url text;

comment on column public.sales_campaigns.signature_banner_url is
  'Absolute URL to a signature banner image for the email HTML. NULL = text signature. Image-only signatures can hurt cold-email deliverability.';

commit;
