-- PR2b — link mileage_logs to the employee + reimbursement + approval/audit.
-- Run in the Supabase SQL editor. Safe + idempotent. No backfill (existing
-- rows keep null contractor_id / status 'draft').

alter table public.mileage_logs
  add column if not exists contractor_id        uuid references public.contractors(id) on delete set null,
  add column if not exists business_purpose     text,
  add column if not exists vehicle_type         text,
  add column if not exists tier                 smallint,
  add column if not exists rate_per_km          numeric(6,2),
  add column if not exists reimbursement_amount numeric(10,2),
  add column if not exists status               text not null default 'draft',
  add column if not exists approved_by          uuid references auth.users(id) on delete set null,
  add column if not exists approved_at          timestamptz,
  add column if not exists pay_run_id           uuid references public.pay_runs(id) on delete set null;

alter table public.mileage_logs drop constraint if exists mileage_logs_vehicle_type_check;
alter table public.mileage_logs add constraint mileage_logs_vehicle_type_check
  check (vehicle_type is null or vehicle_type in ('petrol','diesel','petrol_hybrid','electric'));

alter table public.mileage_logs drop constraint if exists mileage_logs_tier_check;
alter table public.mileage_logs add constraint mileage_logs_tier_check
  check (tier is null or tier in (1, 2));

alter table public.mileage_logs drop constraint if exists mileage_logs_status_check;
alter table public.mileage_logs add constraint mileage_logs_status_check
  check (status in ('draft', 'approved', 'reimbursed'));

-- Only approved, unreimbursed mileage is pulled into a pay run (PR2c).
create index if not exists mileage_logs_reimbursable_idx
  on public.mileage_logs (contractor_id, status)
  where status = 'approved' and pay_run_id is null;
