-- 2026-08-04 — Campaigns: per-campaign from-address + signature name.
--
-- Lets a campaign send as a specific person (e.g. Carol) rather than a
-- hardcoded name/address:
--   • from_email     — the actual From address (e.g. carol@sano.nz). MUST be a
--                      verified sender / on a DKIM-signed domain in Resend, or
--                      the send bounces. Defaults to noreply@sano.nz (safe).
--   • signature_name — the full name in the email sign-off (e.g. "Carol Browne").
--                      Falls back to from_name when null.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.sales_campaigns
  add column if not exists from_email text not null default 'noreply@sano.nz',
  add column if not exists signature_name text;

comment on column public.sales_campaigns.from_email is
  'Actual From address for the send. Must be a verified sender / DKIM-signed domain in Resend. Defaults to noreply@sano.nz.';
comment on column public.sales_campaigns.signature_name is
  'Full name shown in the email signature (e.g. Carol Browne). Falls back to from_name when null.';

commit;
