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

alter table public.contractors
  add column if not exists preferred_name                 text,
  add column if not exists address                        text,
  add column if not exists date_of_birth                  date,
  add column if not exists ird_number                     text,
  add column if not exists gst_number                     text,
  add column if not exists trading_name                   text,
  add column if not exists bank_account_name              text,
  add column if not exists bank_account_number            text,
  add column if not exists emergency_contact_name         text,
  add column if not exists emergency_contact_phone        text,
  add column if not exists emergency_contact_relationship text,
  add column if not exists insurer_name                   text,
  add column if not exists insurance_cover                text,
  add column if not exists insurance_expiry               date,
  add column if not exists id_sighted                     boolean,
  -- Back-link to the agreement that created / most recently updated this
  -- contractor, mirroring employees.agreement_id.
  add column if not exists agreement_id                   uuid references public.employment_agreements(id) on delete set null;

commit;
