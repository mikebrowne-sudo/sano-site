-- ════════════════════════════════════════════════════════════════════
--  Phase H.5 — SMS inbound + delivery + compliance (STOP/HELP)
--
--  Adds the data structures behind the inbound SMS webhook
--  (/api/twilio/inbound-sms), delivery-status webhook (/api/twilio/status),
--  and per-client opt-out gate.
--
--  Additive only — no DROP, no NOT NULL on existing columns. Safe to
--  re-apply: every column / index / table is guarded by IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════

-- 1. Per-client opt-out flag.
alter table public.clients
  add column if not exists opted_out_sms boolean not null default false;

alter table public.clients
  add column if not exists opted_out_sms_at timestamptz;

alter table public.clients
  add column if not exists opted_out_sms_keyword text;

create index if not exists clients_opted_out_sms_idx
  on public.clients(opted_out_sms)
  where opted_out_sms = true;

-- 2. Delivery-status fields on the existing notification_logs.
--    Provider message id is already stored in `provider_message_id`.
--    Add a separate column for post-send Twilio status updates so the
--    existing internal `status` (sent / failed / skipped) is never
--    mutated by webhook callbacks.
alter table public.notification_logs
  add column if not exists delivery_status text;

alter table public.notification_logs
  add column if not exists delivery_updated_at timestamptz;

create index if not exists notification_logs_provider_msg_id_idx
  on public.notification_logs(provider_message_id)
  where provider_message_id is not null;

-- 3. Inbound message log.
create table if not exists public.notification_inbound_messages (
  id                  uuid primary key default gen_random_uuid(),
  message_sid         text not null unique,
  from_phone          text not null,
  to_phone            text,
  body                text,
  matched_client_id   uuid references public.clients(id) on delete set null,
  keyword             text,             -- detected keyword (uppercased): STOP, HELP, etc.
  action_taken        text,             -- 'opted_out' | 'help_replied' | 'none'
  raw_payload         jsonb,            -- full Twilio payload for forensics
  received_at         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists notification_inbound_messages_received_idx
  on public.notification_inbound_messages(received_at desc);

create index if not exists notification_inbound_messages_from_phone_idx
  on public.notification_inbound_messages(from_phone);

create index if not exists notification_inbound_messages_matched_client_idx
  on public.notification_inbound_messages(matched_client_id)
  where matched_client_id is not null;

-- 4. RLS — staff read-only. Webhooks write via service role and bypass RLS.
alter table public.notification_inbound_messages enable row level security;

drop policy if exists nim_staff_select on public.notification_inbound_messages;
create policy nim_staff_select on public.notification_inbound_messages
  for select
  using ( not public.is_contractor() );
