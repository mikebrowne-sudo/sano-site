-- 2026-08-25 — Commercial quotes: one-off clean flag.
--
-- Most commercial quotes are for ongoing, recurring service, and the proposal
-- wording assumes that ("Services are delivered once per week", "Monthly
-- service fee", "set for the full term of the contract", "invoiced monthly in
-- arrears"). Some commercial jobs are a single visit — a one-off deep clean,
-- a builder's clean, a move-out. For those, the recurring wording is wrong.
--
-- This adds an operator-set boolean on commercial_quote_details. When true,
-- the proposal content-builders switch to one-off wording and the pricing
-- hero renders a total service fee instead of a monthly fee.
--
-- Default false = existing quotes and the recurring path are unchanged.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.commercial_quote_details
  add column if not exists is_one_off boolean not null default false;

comment on column public.commercial_quote_details.is_one_off is
  'True when this commercial quote is a single one-off clean rather than ongoing recurring service. Drives one-off proposal wording (no cadence/contract-term/monthly-fee language). Default false = recurring, the normal case.';

commit;
