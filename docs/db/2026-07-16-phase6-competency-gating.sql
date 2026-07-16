-- ════════════════════════════════════════════════════════════════════
--  Phase 6 — competency sign-off + activation gating + legacy transition.
--
--  1. Competency sign-off fields (reuse existing trial + capability fields;
--     add only the sign-off metadata that doesn't already exist).
--  2. onboarding_grandfathered — a legacy/transition marker. Existing ACTIVE
--     contractors are grandfathered so the verification gating flip never
--     downgrades them; recompute skips re-gating a grandfathered contractor.
--  3. Gating flip — verification items become required for NEW contractors.
--     RTW items are in the list but only count for contractors who actually
--     have those rows (i.e. right_to_work_required) — conditional gating.
--
--  Idempotent + additive. Mike-run.
-- ════════════════════════════════════════════════════════════════════

begin;

-- 1. Competency sign-off metadata (capability fields already exist:
--    approved_services, experience_level, can_work_solo, can_lead_jobs,
--    can_supervise_others, key_holding_approved, alarm_access_approved).
alter table public.contractors add column if not exists competency_confirmed_at   timestamptz;
alter table public.contractors add column if not exists competency_confirmed_by   uuid references auth.users(id) on delete set null;
alter table public.contractors add column if not exists competency_assessment_date date;
alter table public.contractors add column if not exists competency_limitations    text;
alter table public.contractors add column if not exists competency_notes          text;

-- 2. Legacy / transition marker.
alter table public.contractors add column if not exists onboarding_grandfathered boolean not null default false;

-- Grandfather EXISTING ACTIVE contractors only. Inactive / onboarding records
-- are NOT auto-grandfathered — the new requirements apply when they are next
-- activated or progressed.
update public.contractors
   set onboarding_grandfathered = true
 where worker_type = 'contractor'
   and status = 'active'
   and onboarding_grandfathered = false;

-- 3. Gating flip — verification items required for activation of NEW contractors.
--    (Grandfathered actives are protected by the recompute guard in code.)
update public.workforce_settings
   set value = jsonb_set(
     value,
     '{contractor_required_items}',
     '["confirm_details","bank_details","contract_signed","insurance_uploaded","insurance_verified","id_uploaded","id_verified","right_to_work_uploaded","right_to_work_verified","tax_review","induction_completed","competency_confirmed"]'::jsonb
   )
 where key = 'default';

commit;

-- Verify (read-only):
-- select status, onboarding_grandfathered, count(*) from contractors
--   where worker_type='contractor' group by 1,2;
-- select value->'contractor_required_items' from workforce_settings where key='default';
