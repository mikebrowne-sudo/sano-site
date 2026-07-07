-- 2026-07-07 — Staff-controlled remittance paid state.
--
-- Until now, building a remittance batch marked its payables paid instantly,
-- so a remittance had no "created/sent but not yet paid" state. Staff want to
-- send a remittance, then flip it to Paid once the money actually leaves the
-- bank (and the contractor sees "Pending payment" until then).
--
-- Adds contractor_remittances.paid_at (null = unpaid). A remittance is "paid"
-- when paid_at is set; markRemittancePaid/markRemittanceUnpaid (server actions)
-- toggle it and keep the linked payables' status/date_paid in sync.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.contractor_remittances
  add column if not exists paid_at timestamptz;

-- Backfill: every existing remittance (RA-0001…RA-0006) has now been paid, so
-- stamp paid_at from its payment date. New remittances created after this
-- default to unpaid (paid_at null) and are flipped via markRemittancePaid.
update public.contractor_remittances
set paid_at = payment_date::timestamptz
where paid_at is null;

commit;
