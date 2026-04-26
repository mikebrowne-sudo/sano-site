-- ════════════════════════════════════════════════════════════════════
--  Phase 5.4 — Workflow gates + settings + trial enforcement.
--
--  Three additive changes:
--    A. onboarding_settings (JSONB singleton) for behaviour toggles.
--    B. contractors gains trial_status, trial_scheduled_for,
--       trial_outcome_note (existing trial_required from 5.2 stays).
--    C. Existing contractors backfilled: trial_required=false rows
--       get trial_status='not_required' so they don't appear stuck.
--
--  Idempotent throughout. No existing-data destruction.
-- ════════════════════════════════════════════════════════════════════

-- ── A. onboarding_settings (key/value JSONB singleton) ───────────

create table if not exists public.onboarding_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

insert into public.onboarding_settings (key, value)
values (
  'default',
  '{
    "require_admin_activation_approval": true,
    "block_assignment_until_onboarding_complete": true,
    "insurance_expiry_warning_days": 30,
    "trial_required_default": true,
    "contractor_required_items": ["confirm_details","bank_details","id_verified","insurance_uploaded","contract_signed","onboarding_training"],
    "employee_required_items":   ["confirm_details","bank_details","id_verified","ird_provided","kiwisaver","contract_signed","onboarding_training"]
  }'::jsonb
)
on conflict (key) do nothing;

alter table public.onboarding_settings enable row level security;
drop policy if exists os_staff_select on public.onboarding_settings;
create policy os_staff_select on public.onboarding_settings
  for select using ( not public.is_contractor() );
drop policy if exists os_admin_write on public.onboarding_settings;
create policy os_admin_write on public.onboarding_settings
  for all
  using ((auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((auth.jwt() ->> 'email') = 'michael@sano.nz');

-- ── B. Trial enforcement fields on contractors ───────────────────

alter table public.contractors
  add column if not exists trial_status text not null default 'not_started'
    check (trial_status in ('not_required','not_started','scheduled','passed','failed'));

alter table public.contractors
  add column if not exists trial_scheduled_for timestamptz;

alter table public.contractors
  add column if not exists trial_outcome_note text;

-- Backfill: contractors flagged trial_required=false should sit at
-- trial_status='not_required' so the gate logic doesn't block them.
update public.contractors
   set trial_status = 'not_required'
 where trial_required = false
   and trial_status = 'not_started';

create index if not exists contractors_trial_status_idx
  on public.contractors(trial_status) where trial_status not in ('not_required','passed');
