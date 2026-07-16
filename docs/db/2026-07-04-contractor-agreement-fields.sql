-- 2026-07-04 — Contractor "gathered" fields for the online agreement flow.
--
-- When a NEW person signs a contractor agreement online, we want to create
-- their contractor account populated with everything gathered on the form —
-- the same personal detail the `employees` table already stores. The
-- contractors table currently holds only the basics (name, email, phone,
-- rate, status, worker/employment type, KiwiSaver rate, etc.), so add the
-- rest here.
--
-- Additive + idempotent. Run in the Supabase SQL Editor before deploying the
-- agreement sign-side wiring. RLS is unchanged — existing contractor policies
-- already govern these columns.

begin;

-- Only the genuinely-new fields. The contractors table already stores
-- ird_number, gst_number, gst_registered, company_name, bank_account_name,
-- bank_account_number, insurance_provider, insurance_expiry, contract_signed_date
-- and start_date (written by the agreement sign flow today), so those are NOT
-- re-added here.
alter table public.contractors
  add column if not exists preferred_name                 text,
  add column if not exists address                        text,
  add column if not exists date_of_birth                  date,
  add column if not exists emergency_contact_name         text,
  add column if not exists emergency_contact_phone        text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists id_sighted                     boolean,
  -- Back-link to the agreement that created / most recently updated this
  -- contractor, mirroring employees.agreement_id.
  add column if not exists agreement_id                   uuid references public.employment_agreements(id) on delete set null;

commit;
