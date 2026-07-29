-- 2026-07-30 — Agreement service-schedule snapshot (PR 2).
--
-- Builds multiple effective-dated service schedules into the contractor agreement
-- document. A master contractor agreement (employment_agreements, agreement_type
-- 'contractor') presents that contractor's active service schedules (from
-- contractor_service_schedules) as clearly-labelled Schedule A / Schedule B blocks.
--
-- To keep a signed agreement STABLE, the schedules it presents are SNAPSHOTTED
-- onto the agreement when it is sent/signed — a later schedule edit (which itself
-- supersedes, never overwrites) cannot mutate an already-signed agreement's
-- content. A draft agreement with no snapshot renders the contractor's current
-- active schedules live.
--
-- PR 2 scope: agreement generation + document + contractor review + signed PDF
-- ONLY. NO withholding / IRD / tax money math. Nothing is sent to any contractor
-- by this migration. Additive + idempotent. Mike-run.

-- ── Read-only preflight (expect the column absent) ──────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name='service_schedules_snapshot';

begin;

-- Frozen copy of the service schedules presented on this agreement, captured at
-- send/sign. jsonb array of { id, name, classification, service_type,
-- service_address, frequency, term, payment_method, payment_basis, rate_basis,
-- agreed_amount, notice_period, price_review_date, ... } — display terms only,
-- no tax/withholding math (that is a later PR). Null on a draft → render live.
alter table public.employment_agreements
  add column if not exists service_schedules_snapshot jsonb,
  add column if not exists service_schedules_snapshot_at timestamptz;

comment on column public.employment_agreements.service_schedules_snapshot is
  'Frozen service-schedule blocks presented on this contractor agreement, captured at send/sign so later schedule edits (which supersede) never mutate a signed agreement. Null on a draft = render the contractor''s current active schedules live. Display terms only — no withholding/tax math.';

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('service_schedules_snapshot','service_schedules_snapshot_at')
order by column_name;   -- expect 2 rows

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   alter table public.employment_agreements
--     drop column if exists service_schedules_snapshot,
--     drop column if exists service_schedules_snapshot_at;
-- commit;
