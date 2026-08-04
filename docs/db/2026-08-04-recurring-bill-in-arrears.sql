-- 2026-08-04 — Recurring contracts: bill-in-arrears flag.
--
-- Some recurring contracts invoice in ARREARS: the invoice sent on
-- invoice_send_day bills for the PREVIOUS calendar month's work (e.g. Pukekohe
-- Golf Club — sent the 7th of Sep for August's work, due 20 Sep). This flag
-- makes the service period + the contractor payable's period label follow the
-- month worked rather than the month the invoice is raised.
--
-- Default false preserves the existing "bill for the current billing month"
-- behaviour for every other contract. Additive + idempotent.

begin;

alter table public.recurring_jobs
  add column if not exists bill_in_arrears boolean not null default false;

comment on column public.recurring_jobs.bill_in_arrears is
  'When true, an invoice raised on invoice_send_day bills for the PREVIOUS calendar month (arrears). Drives the invoice service-period wording + the fixed contractor payable period label.';

commit;
