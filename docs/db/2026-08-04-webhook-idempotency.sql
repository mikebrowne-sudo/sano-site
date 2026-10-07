-- 2026-08-04 — Resend webhook idempotency + delivery-outcome columns.
--
-- Resend/Svix can deliver the same event more than once (retries on timeout,
-- at-least-once delivery). We dedup on the Svix message id (svix-id header):
-- insert-first into webhook_events; a duplicate hits the unique constraint and
-- we return early WITHOUT re-applying the side effect. This makes the endpoint
-- idempotent per the campaign spec.
--
-- Also records failed/suppressed outcomes on the recipient so state is complete
-- (delivered_at / bounced_at already exist from 2026-08-04-campaign-followup-abtest.sql).
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

-- Dedup store: one row per processed Svix event id.
create table if not exists public.webhook_events (
  svix_id     text primary key,          -- the svix-id header (globally unique per event)
  source      text not null default 'resend',
  event_type  text,                      -- e.g. 'email.bounced' (for audit only)
  received_at timestamptz not null default now()
);

comment on table public.webhook_events is
  'Idempotency ledger for inbound webhooks. svix_id is the Svix message id; a duplicate insert means the event was already processed and must be ignored.';

-- Recipient-level outcome columns for the newly handled events.
alter table public.sales_campaign_recipients
  add column if not exists failed_at     timestamptz,  -- Resend email.failed webhook (permanent send failure)
  add column if not exists suppressed_at timestamptz,  -- Resend email.suppressed webhook (on Resend's suppression list)
  add column if not exists complained_at timestamptz;  -- Resend email.complained webhook (spam complaint)

comment on column public.sales_campaign_recipients.failed_at is
  'Resend email.failed webhook — the send permanently failed at the provider.';
comment on column public.sales_campaign_recipients.suppressed_at is
  'Resend email.suppressed webhook — address is on Resend''s suppression list; do not send again.';
comment on column public.sales_campaign_recipients.complained_at is
  'Resend email.complained webhook — recipient marked it as spam.';

commit;
