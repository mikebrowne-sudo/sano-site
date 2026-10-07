-- 2026-08-04 — Campaign recipients: per-send audit fields.
--
-- Records what each lead was actually sent, so you can answer "which version did
-- this lead get?" and troubleshoot. The template is deterministic, so storing
-- the subject + the chosen variant (named vs team) + the sender is enough to
-- reproduce the exact email without keeping 400 copies of near-identical HTML.
--
--   • sent_subject  — the exact subject line sent (company interpolated)
--   • sent_variant  — 'named' or 'team' (which greeting/ask logic was used)
--   • sent_from     — the From address used (e.g. carol@sano.nz)
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.sales_campaign_recipients
  add column if not exists sent_subject text,
  add column if not exists sent_variant text,
  add column if not exists sent_from text;

comment on column public.sales_campaign_recipients.sent_variant is
  'Which template variant was sent: named (reliable full name) or team (shared/no-name).';

commit;
