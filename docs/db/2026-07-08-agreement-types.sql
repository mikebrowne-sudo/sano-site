-- 2026-07-08 — Add agreement types (contractor agreement alongside casual).
--
-- Extends employment_agreements so the same create → link → fill → e-sign flow
-- covers BOTH a casual employment agreement and an independent contractor
-- agreement. Adds a type discriminator + contractor-specific fields (trading
-- name, GST number). Existing rows default to the casual employee type.
--
-- Additive + idempotent.

begin;

alter table public.employment_agreements
  add column if not exists agreement_type text not null default 'casual_employee',  -- 'casual_employee' | 'contractor'
  add column if not exists contractor_trading_name text,
  add column if not exists contractor_gst_number   text;

commit;
