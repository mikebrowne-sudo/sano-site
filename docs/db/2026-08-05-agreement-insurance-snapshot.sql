-- 2026-08-05 — Agreement insurance-arrangement snapshot.
--
-- Freezes the contractor's EFFECTIVE insurance arrangement onto a contractor
-- agreement at send, so the signed document's insurance clause (clause 9) can
-- never change if the arrangement is later edited (arrangements supersede, never
-- overwrite). Mirrors the existing service_schedules_snapshot pattern.
--
-- CONTRACTOR-FACING FIELDS ONLY. The snapshot stores just what the agreement is
-- allowed to say: { mode, minCover, requiredType }. It NEVER stores insurer,
-- policy numbers, cover limits, confirmed_by or internal notes — those stay in
-- contractor_insurance_arrangement and are never exposed to the contractor.
--
-- Null on a draft → the draft previews the currently-effective arrangement live;
-- the frozen value is written only at send. A pending_review arrangement blocks
-- send (enforced in the send action), so a sent agreement never freezes a guess.
--
-- Additive + idempotent. Mike-run. Sends nothing; changes no existing agreement.

-- ── Read-only preflight (expect the columns absent) ─────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('insurance_arrangement_snapshot','insurance_arrangement_snapshot_at');

begin;

alter table public.employment_agreements
  add column if not exists insurance_arrangement_snapshot jsonb,
  add column if not exists insurance_arrangement_snapshot_at timestamptz;

comment on column public.employment_agreements.insurance_arrangement_snapshot is
  'Frozen contractor-facing insurance arrangement captured at send: { mode (own_required|covered_by_sano|not_required), minCover, requiredType } ONLY — never insurer/policy/limit/internal fields. Drives clause 9 on the signed agreement. Null on a draft = preview the effective arrangement live. pending_review can never be frozen (send is blocked).';

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('insurance_arrangement_snapshot','insurance_arrangement_snapshot_at')
order by column_name;   -- expect 2 rows

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   alter table public.employment_agreements
--     drop column if exists insurance_arrangement_snapshot,
--     drop column if exists insurance_arrangement_snapshot_at;
-- commit;
