-- ════════════════════════════════════════════════════════════════════
--  Phase 5.4 (locked) — Ready state + workforce_settings rename.
--
--  Iterates on the earlier 5.4 migration. Three changes:
--    A. Rename onboarding_settings → workforce_settings (table + JSONB
--       key block_assignment_until_onboarding_complete →
--       block_assignment_until_ready).
--    B. Extend contractors.status with the new 'ready' value
--       (between 'onboarding' and 'active').
--    C. Add ready_at + activated_at timestamps on contractors.
--
--  Idempotent. Safe on a partially-migrated DB.
-- ════════════════════════════════════════════════════════════════════

-- ── A. Rename onboarding_settings → workforce_settings ─────────────

do $$
begin
  if exists (select 1 from pg_tables where schemaname='public' and tablename='onboarding_settings')
     and not exists (select 1 from pg_tables where schemaname='public' and tablename='workforce_settings')
  then
    execute 'alter table public.onboarding_settings rename to workforce_settings';
  end if;
end $$;

-- If neither table exists (fresh DB), create workforce_settings.
create table if not exists public.workforce_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

insert into public.workforce_settings (key, value)
values (
  'default',
  '{
    "require_admin_activation_approval": true,
    "block_assignment_until_ready": true,
    "insurance_expiry_warning_days": 30,
    "trial_required_default": true,
    "contractor_required_items": ["confirm_details","bank_details","id_verified","insurance_uploaded","contract_signed","onboarding_training"],
    "employee_required_items":   ["confirm_details","bank_details","id_verified","ird_provided","kiwisaver","contract_signed","onboarding_training"]
  }'::jsonb
)
on conflict (key) do nothing;

-- Migrate the old setting key to the new name on existing rows.
update public.workforce_settings
   set value = (value - 'block_assignment_until_onboarding_complete')
               || jsonb_build_object('block_assignment_until_ready',
                  coalesce(value -> 'block_assignment_until_onboarding_complete', 'true'::jsonb))
 where key = 'default'
   and value ? 'block_assignment_until_onboarding_complete'
   and not (value ? 'block_assignment_until_ready');

-- Re-bind RLS to the (possibly renamed) table.
alter table public.workforce_settings enable row level security;
drop policy if exists os_staff_select on public.workforce_settings;
drop policy if exists ws_staff_select on public.workforce_settings;
create policy ws_staff_select on public.workforce_settings
  for select using ( not public.is_contractor() );
drop policy if exists os_admin_write on public.workforce_settings;
drop policy if exists ws_admin_write on public.workforce_settings;
create policy ws_admin_write on public.workforce_settings
  for all
  using ((auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((auth.jwt() ->> 'email') = 'michael@sano.nz');

-- ── B. Extend contractors.status enum with 'ready' ───────────────

alter table public.contractors drop constraint if exists contractors_status_check;
alter table public.contractors add constraint contractors_status_check
  check (status in ('active','inactive','onboarding','ready'));

-- ── C. Activation timestamps ─────────────────────────────────────

alter table public.contractors add column if not exists ready_at timestamptz;
alter table public.contractors add column if not exists activated_at timestamptz;
