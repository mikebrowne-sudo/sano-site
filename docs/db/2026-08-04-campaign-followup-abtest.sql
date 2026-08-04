-- 2026-08-04 — Campaigns: follow-up + subject A/B + full send snapshot.
--
-- Supports the first real campaign per Mike's spec:
--   • subject_variant  — the A/B subject bucket assigned at add-time (stable,
--                        never changed after sending): 'A' or 'B'.
--   • sent_body        — the EXACT rendered HTML sent to this recipient (per-lead
--                        audit snapshot, so we can see precisely what went out).
--   • delivered_at / bounced_at — delivery outcome. Follow-up eligibility uses
--                        delivered (NOT opened — open tracking is unreliable).
--   • followup_sent_at — when the single follow-up was sent (null = not yet).
--   • followup_subject / followup_variant — audit of the follow-up send.
--
-- One follow-up only, ~5 business days after the intro, and only where:
--   delivered, no reply, not opted out / do-not-contact, not already followed up.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.sales_campaign_recipients
  add column if not exists subject_variant text,          -- 'A' | 'B' (assigned at add-time)
  add column if not exists sent_body text,                -- exact rendered HTML sent
  add column if not exists delivered_at timestamptz,      -- Resend delivered webhook (or send success)
  add column if not exists bounced_at timestamptz,        -- Resend bounce webhook
  add column if not exists followup_sent_at timestamptz,  -- single follow-up timestamp
  add column if not exists followup_subject text,
  add column if not exists followup_variant text;

comment on column public.sales_campaign_recipients.subject_variant is
  'A/B subject bucket, assigned when the recipient is added and never changed after sending.';
comment on column public.sales_campaign_recipients.sent_body is
  'Exact rendered HTML of the intro email sent to this recipient (audit snapshot).';
comment on column public.sales_campaign_recipients.delivered_at is
  'Delivery confirmation. Follow-up eligibility uses this, NOT opened_at (open tracking is unreliable).';

-- Campaign-level: which two subjects are being A/B tested.
alter table public.sales_campaigns
  add column if not exists subject_a text,
  add column if not exists subject_b text;

comment on column public.sales_campaigns.subject_a is
  'A/B test subject A (e.g. "Cleaning at {company}"). Falls back to subject when null.';
comment on column public.sales_campaigns.subject_b is
  'A/B test subject B (e.g. "A quick question about cleaning at {company}"). Null = no A/B test.';

commit;
