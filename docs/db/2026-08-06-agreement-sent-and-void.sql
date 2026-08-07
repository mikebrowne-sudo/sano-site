-- 2026-08-06 — Agreement visibility: last-sent timestamp + void status.
--
-- (1) last_sent_at — when the private link was last emailed, so the list can
--     show "sent 6 Aug" and distinguish "never sent" from "sent, not yet signed".
-- (2) 'voided' status — lets staff explicitly pull/retract a sent-but-unsigned
--     agreement so its link can no longer be signed (e.g. terms changed).
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.employment_agreements
  add column if not exists last_sent_at timestamptz,
  add column if not exists voided_at   timestamptz;

comment on column public.employment_agreements.last_sent_at is
  'When the private link was last emailed to the worker (null = never sent).';
comment on column public.employment_agreements.voided_at is
  'When staff voided/pulled this agreement. A voided agreement can no longer be signed.';

-- Allow the 'voided' status alongside the existing ones. Only touch the CHECK if
-- one exists; otherwise this is a no-op (status may be free-text in some envs).
do $$
begin
  if exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'employment_agreements' and constraint_name = 'employment_agreements_status_check'
  ) then
    alter table public.employment_agreements drop constraint employment_agreements_status_check;
    alter table public.employment_agreements
      add constraint employment_agreements_status_check
      check (status in ('draft','active','sent','signed','voided'));
  end if;
end $$;

commit;
