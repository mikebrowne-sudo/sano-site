-- 2026-08-06 — Simple campaign scheduling controls.
--
-- Adds start date / send time / sending days / recipient-list lock + the
-- 'scheduled' and 'paused' statuses, so a campaign can be armed to begin on a
-- chosen day, drip on chosen weekdays at a chosen NZ time, and be paused/resumed
-- without resending anyone. All scheduling is Pacific/Auckland.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

-- New scheduling columns on the campaign.
alter table public.sales_campaigns
  add column if not exists start_date date,                        -- first eligible send day (NZ). null = as soon as armed.
  add column if not exists send_time_nz text not null default '08:30',  -- HH:MM Auckland; one daily batch at/after this.
  add column if not exists sending_days smallint[] not null default '{1,2,3,4}', -- ISO weekdays 1=Mon..7=Sun; default Mon–Thu.
  add column if not exists lead_group text,                        -- human label of the locked recipient group (e.g. "A-grade").
  add column if not exists recipients_locked boolean not null default false, -- once true, the recipient list never changes with the CRM.
  add column if not exists paused_at timestamptz;                  -- set when paused; cleared on resume.

comment on column public.sales_campaigns.start_date is
  'First eligible send day (Pacific/Auckland). Null = begin as soon as armed. If today but the send window has passed, the drip begins on the next eligible day.';
comment on column public.sales_campaigns.send_time_nz is
  'Daily batch time as HH:MM in Pacific/Auckland (default 08:30). One batch per day at/after this time.';
comment on column public.sales_campaigns.sending_days is
  'ISO weekdays the campaign may send on (1=Mon..7=Sun). Default {1,2,3,4} = Mon–Thu. Fri/Sat/Sun off by default.';
comment on column public.sales_campaigns.lead_group is
  'Human label of the recipient group selected at creation (e.g. "A-grade leads").';
comment on column public.sales_campaigns.recipients_locked is
  'When true the recipient list is frozen — later CRM changes never add/remove recipients.';
comment on column public.sales_campaigns.paused_at is
  'When set, the campaign is paused: the drip sends nothing until resumed. Cleared on resume.';

-- Allow the two new statuses. Drop + re-add the CHECK constraint.
alter table public.sales_campaigns drop constraint if exists sales_campaigns_status_check;
alter table public.sales_campaigns
  add constraint sales_campaigns_status_check
  check (status in ('draft','scheduled','sending','paused','sent','archived'));

commit;
