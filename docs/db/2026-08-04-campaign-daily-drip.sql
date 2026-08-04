-- 2026-08-04 — Campaigns: daily send cap (sender warm-up drip).
--
-- Cold-email best practice: don't blast a fresh sending address. A daily cap
-- trickles a campaign out (e.g. 15/day), best leads first (A→B→C), so the
-- sending reputation of carol@sano.nz builds gradually and the emails stay out
-- of Promotions/spam.
--
--   • daily_send_cap  — max emails to send per day. 0/NULL = send all at once
--                       (old behaviour). Set e.g. 15 to drip.
--   • last_batch_at   — when the last daily batch was sent (so the cron sends
--                       at most one batch per calendar day).
--
-- A 'sending' campaign with pending recipients + a cap is what the daily drip
-- cron picks up. Additive + idempotent.

begin;

alter table public.sales_campaigns
  add column if not exists daily_send_cap integer not null default 0,
  add column if not exists last_batch_at timestamptz;

comment on column public.sales_campaigns.daily_send_cap is
  'Max emails to send per day (sender warm-up). 0 = send all at once. Drives the daily drip cron.';
comment on column public.sales_campaigns.last_batch_at is
  'Timestamp of the last daily batch send, so the drip sends at most once per calendar day.';

commit;
