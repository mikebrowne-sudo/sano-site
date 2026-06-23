-- 2026-06-23 — Fixed monthly contractor payments (commercial contracts).
--
-- Extends the EXISTING contractor payable ledger (contractor_invoices) to
-- support a flat, non-hourly "fixed contract" payment — e.g. the Pukekohe
-- Golf Club $1,500/month commercial cleaning contract — WITHOUT a separate
-- table. A payable already stores a flat `amount` (hours live on
-- job_workers, never on the payable), so this only adds:
--   * a type marker (payment_type)
--   * a free-text site/client + period for payments with no linked job
--   * an authorised-by / authorised-at stamp (mirrors sent_by/created_by on
--     contractor_remittances)
--
-- No change to client invoices, hourly pay calculation, or the remittance
-- schema. Every existing payable defaults to payment_type = 'standard' and
-- behaves exactly as before.
--
-- Additive + idempotent. Run in the Supabase SQL Editor before deploying.

begin;

alter table public.contractor_invoices
  add column if not exists payment_type text not null default 'standard',
  add column if not exists site_label   text,
  add column if not exists period_label text,
  add column if not exists approved_at  timestamptz,
  add column if not exists approved_by  uuid references auth.users(id) on delete set null;

-- payment_type: 'standard' (hourly / job-derived or ad-hoc payable) or
-- 'fixed_contract' (flat monthly commercial-contract payment).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contractor_invoices_payment_type_chk'
  ) then
    alter table public.contractor_invoices
      add constraint contractor_invoices_payment_type_chk
      check (payment_type in ('standard', 'fixed_contract'));
  end if;
end $$;

comment on column public.contractor_invoices.payment_type is
  'standard = hourly/job-derived or ad-hoc payable; fixed_contract = flat monthly commercial-contract payment (e.g. Pukekohe Golf Club $1,500/mo).';
comment on column public.contractor_invoices.site_label is
  'Free-text client/site for fixed_contract payables with no linked job (e.g. "Pukekohe Golf Club").';
comment on column public.contractor_invoices.period_label is
  'Free-text payment period for fixed_contract payables (e.g. "June 2026").';
comment on column public.contractor_invoices.approved_at is
  'When the payable was authorised for payment (status -> approved).';
comment on column public.contractor_invoices.approved_by is
  'auth.users id of the admin who authorised the payable.';

commit;
