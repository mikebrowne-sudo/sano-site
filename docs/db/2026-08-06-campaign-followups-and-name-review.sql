-- 2026-08-06 — Campaign follow-up opt-in + company-name review approval.
--
-- (1) followups_enabled — the drip cron must NOT send follow-ups for a campaign
--     unless this is explicitly true. Defaults FALSE so no campaign ever
--     auto-follows-up without someone turning it on. (Pre-launch safety: the
--     first campaign runs with follow-ups OFF.)
--
-- (2) company_name_approved — the launch gate blocks sending while any selected
--     recipient's lead company name is flagged as unsafe to interpolate. Setting
--     this true is the "explicitly approved" escape hatch (name is odd but fine).
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.sales_campaigns
  add column if not exists followups_enabled boolean not null default false;

comment on column public.sales_campaigns.followups_enabled is
  'When false (default), the drip cron never sends follow-ups for this campaign. Must be explicitly enabled per campaign.';

alter table public.sales_campaign_recipients
  add column if not exists company_name_approved boolean not null default false;

comment on column public.sales_campaign_recipients.company_name_approved is
  'Operator explicitly approved this recipient''s (flagged) company name for interpolation. The launch gate ignores flags on approved rows.';

commit;
