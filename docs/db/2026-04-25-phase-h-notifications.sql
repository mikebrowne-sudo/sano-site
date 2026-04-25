-- ════════════════════════════════════════════════════════════════════
--  Phase H — notifications foundation (Twilio SMS + admin controls).
--
--  Three new tables:
--   • notification_settings  — singleton (key='default') JSONB toggles.
--   • notification_templates — one row per (type, channel, audience).
--   • notification_logs      — append-only send log incl. skipped sends.
--
--  RLS pattern follows job_settings + proposal_settings:
--    staff read   (NOT public.is_contractor())
--    admin write  (auth.jwt() ->> 'email' = 'michael@sano.nz')
--
--  Default templates seeded: contractor.job_assigned + customer
--  .booking_confirmation. Operator can edit later via the settings UI.
--
--  Idempotent: every statement uses IF NOT EXISTS / ON CONFLICT DO
--  NOTHING so re-runs are safe.
-- ════════════════════════════════════════════════════════════════════

-- ── notification_settings ────────────────────────────────────────

create table if not exists public.notification_settings (
  key         text         primary key,
  value       jsonb        not null default '{}'::jsonb,
  updated_at  timestamptz  not null default now(),
  updated_by  uuid         references auth.users(id) on delete set null
);

alter table public.notification_settings enable row level security;

drop policy if exists "notification_settings staff read" on public.notification_settings;
create policy "notification_settings staff read"
  on public.notification_settings
  for select to authenticated
  using (not public.is_contractor());

drop policy if exists "notification_settings admin write" on public.notification_settings;
create policy "notification_settings admin write"
  on public.notification_settings
  for all to authenticated
  using      ((select auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((select auth.jwt() ->> 'email') = 'michael@sano.nz');

comment on table public.notification_settings is
  'Phase H: provider + channel + type toggles. Singleton row key="default".';

-- ── notification_templates ───────────────────────────────────────

create table if not exists public.notification_templates (
  id          uuid         primary key default gen_random_uuid(),
  type        text         not null,
  channel     text         not null,
  audience    text         not null,
  subject     text,
  body        text         not null,
  enabled     boolean      not null default true,
  updated_at  timestamptz  not null default now(),
  updated_by  uuid         references auth.users(id) on delete set null,
  unique (type, channel, audience)
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'notification_templates'
      and constraint_name = 'notification_templates_channel_check'
  ) then
    alter table public.notification_templates
      add constraint notification_templates_channel_check
      check (channel in ('sms', 'email'));
  end if;
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'notification_templates'
      and constraint_name = 'notification_templates_audience_check'
  ) then
    alter table public.notification_templates
      add constraint notification_templates_audience_check
      check (audience in ('contractor', 'customer', 'staff'));
  end if;
end $$;

alter table public.notification_templates enable row level security;

drop policy if exists "notification_templates staff read" on public.notification_templates;
create policy "notification_templates staff read"
  on public.notification_templates
  for select to authenticated
  using (not public.is_contractor());

drop policy if exists "notification_templates admin write" on public.notification_templates;
create policy "notification_templates admin write"
  on public.notification_templates
  for all to authenticated
  using      ((select auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((select auth.jwt() ->> 'email') = 'michael@sano.nz');

comment on table public.notification_templates is
  'Phase H: per-(type, channel, audience) message body. Operator-editable.';

-- ── notification_logs ────────────────────────────────────────────

create table if not exists public.notification_logs (
  id                     uuid         primary key default gen_random_uuid(),
  type                   text         not null,
  channel                text         not null,
  audience               text         not null,
  recipient_name         text,
  recipient_phone        text,
  recipient_email        text,
  status                 text         not null default 'pending',
  provider               text,
  provider_message_id    text,
  error_message          text,
  payload                jsonb,
  related_job_id         uuid         references public.jobs(id) on delete set null,
  related_client_id      uuid         references public.clients(id) on delete set null,
  related_contractor_id  uuid         references public.contractors(id) on delete set null,
  related_invoice_id     uuid         references public.invoices(id) on delete set null,
  created_at             timestamptz  not null default now(),
  sent_at                timestamptz
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'notification_logs'
      and constraint_name = 'notification_logs_status_check'
  ) then
    alter table public.notification_logs
      add constraint notification_logs_status_check
      check (status in ('pending', 'sent', 'failed', 'skipped'));
  end if;
end $$;

alter table public.notification_logs enable row level security;

drop policy if exists "notification_logs staff read" on public.notification_logs;
create policy "notification_logs staff read"
  on public.notification_logs
  for select to authenticated
  using (not public.is_contractor());

-- Writes to notification_logs are server-only (service-role) so we
-- don't need a policy for inserts from the authenticated role; the
-- server actions use the standard Supabase server client which is
-- still gated on the staff/admin checks at the action layer.

create index if not exists notification_logs_created_at_idx
  on public.notification_logs (created_at desc);
create index if not exists notification_logs_status_idx
  on public.notification_logs (status);
create index if not exists notification_logs_related_job_id_idx
  on public.notification_logs (related_job_id)
  where related_job_id is not null;

comment on table public.notification_logs is
  'Phase H: append-only log of every notification attempt (sent, failed, skipped).';

-- ── Default templates ────────────────────────────────────────────

insert into public.notification_templates (type, channel, audience, body, enabled)
values
  (
    'job_assigned', 'sms', 'contractor',
    'Hi {{contractor_name}}, new Sano job assigned: {{job_title}} at {{site_address}} on {{scheduled_date}} {{scheduled_time}}. View: {{job_link}}',
    true
  ),
  (
    'booking_confirmation', 'sms', 'customer',
    'Hi {{client_name}}, your Sano clean is booked for {{scheduled_date}} {{scheduled_time}} at {{site_address}}. Questions? Call {{business_phone}}.',
    true
  )
on conflict (type, channel, audience) do nothing;
