-- Permanent-employee agreement — new captured terms + type constraint.
-- Run in the Supabase SQL editor. Safe + idempotent. No backfill.

alter table public.employment_agreements
  add column if not exists agreed_hours_per_week numeric,
  add column if not exists agreed_days           text,
  add column if not exists place_of_work         text,
  add column if not exists pay_frequency         text,
  add column if not exists notice_period         text;

-- agreement_type had no constraint; lock it to the three valid types now that
-- permanent_employee exists. (Existing rows are 'contractor' — within the set.)
alter table public.employment_agreements drop constraint if exists employment_agreements_agreement_type_check;
alter table public.employment_agreements add constraint employment_agreements_agreement_type_check
  check (agreement_type in ('casual_employee', 'permanent_employee', 'contractor'));
