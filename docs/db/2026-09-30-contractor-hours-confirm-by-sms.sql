-- 2026-09-30 (part 2) — confirm hours by replying to the reminder SMS.
--
-- Follows docs/db/2026-09-30-contractor-hours-confirmation.sql (run that first).
--
-- A contractor can now confirm a finished job either in the portal or by
-- replying YES to the reminder text. The inbound webhook already logs every
-- message to notification_inbound_messages, but that table only matched
-- CLIENTS by phone — a confirming contractor had nowhere to be recorded, and
-- the insert would have failed on an unknown column, swallowing the whole
-- inbound message.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

alter table public.notification_inbound_messages
  add column if not exists matched_contractor_id uuid references public.contractors(id);

comment on column public.notification_inbound_messages.matched_contractor_id is
  'Contractor matched by sender phone, for replies that confirm a job went to plan. Null for client replies (STOP/HELP) and unmatched numbers.';

create index if not exists idx_inbound_matched_contractor
  on public.notification_inbound_messages (matched_contractor_id);

-- action_taken gains 'hours_confirmed'. It is free text today; if a CHECK
-- constraint is ever added it must include this value.

commit;
