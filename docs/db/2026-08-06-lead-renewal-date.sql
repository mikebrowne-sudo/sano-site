-- 2026-08-06 — Lead renewal / review date.
--
-- A lead already has `next_follow_up` (when to chase again). This adds
-- `renewal_date` — when a won client's arrangement is up for renewal / review —
-- so both surface on the Alerts page as things that need action.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.sales_leads
  add column if not exists renewal_date date;

comment on column public.sales_leads.renewal_date is
  'When this (usually won) lead''s arrangement is up for renewal/review. Surfaces on the Alerts page as it approaches.';

commit;
