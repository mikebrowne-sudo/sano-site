-- 2026-07-30 — Agreement service-schedule selection + snapshot (PR 2).
--
-- Builds multiple effective-dated service schedules into the contractor agreement
-- document. A master contractor agreement (employment_agreements, agreement_type
-- 'contractor') presents the schedules STAFF EXPLICITLY SELECTED for it.
--
-- SELECTION (not auto-inclusion): staff pick which of the contractor's eligible
-- schedules belong on this agreement (selected_service_schedule_ids). A schedule
-- is NEVER included merely because it is active for the contractor. Only draft/
-- active schedules are eligible; paused/ended/superseded are not selectable.
--
-- SNAPSHOT (stability): on send/sign, ONLY the selected schedules are frozen onto
-- the agreement (service_schedules_snapshot). Each snapshot entry records the
-- schedule ID, its version marker (effective_from + updated_at) and the full
-- displayed terms — so a later edit (which supersedes, never overwrites) or a
-- newly-added schedule cannot change an already-sent agreement. A replacement
-- agreement selects its own set. A draft with no snapshot previews only the
-- currently-selected schedules live.
--
-- PR 2 scope: agreement generation + document + contractor review + signed PDF
-- ONLY. NO withholding / IRD / tax money math. Nothing is sent to any contractor
-- by this migration. Additive + idempotent. Mike-run.

-- ── Read-only preflight (expect the columns absent) ─────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('service_schedules_snapshot','selected_service_schedule_ids');

begin;

-- Staff's explicit selection of which contractor schedules this agreement covers.
-- Array of contractor_service_schedules.id. Empty/null = none selected yet.
alter table public.employment_agreements
  add column if not exists selected_service_schedule_ids uuid[] not null default '{}';

-- Frozen copy of the SELECTED service schedules presented on this agreement,
-- captured at send/sign. jsonb array of { id, version_key, effective_from,
-- label, name, classification, service_type, service_address, frequency, term,
-- payment_method, payment_basis, rate_basis, agreed_amount, notice_period,
-- price_review_date, ... } — display terms only, no tax/withholding math.
-- Null on a draft → preview the currently-selected schedules live.
alter table public.employment_agreements
  add column if not exists service_schedules_snapshot jsonb,
  add column if not exists service_schedules_snapshot_at timestamptz;

comment on column public.employment_agreements.selected_service_schedule_ids is
  'Staff-selected contractor_service_schedules.id set that THIS agreement covers. A schedule is included only if explicitly selected — never auto-included for being active. Only draft/active schedules are eligible.';
comment on column public.employment_agreements.service_schedules_snapshot is
  'Frozen SELECTED service-schedule blocks (id, version_key, effective_from + full displayed terms) captured at send/sign, so later edits (which supersede) or newly-added schedules never mutate a sent/signed agreement. Null on a draft = preview the selected schedules live. Display terms only — no withholding/tax math.';

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('selected_service_schedule_ids','service_schedules_snapshot','service_schedules_snapshot_at')
order by column_name;   -- expect 3 rows

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   alter table public.employment_agreements
--     drop column if exists selected_service_schedule_ids,
--     drop column if exists service_schedules_snapshot,
--     drop column if exists service_schedules_snapshot_at;
-- commit;
