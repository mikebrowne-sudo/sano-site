-- 2026-08-06 — Per-schedule equipment + cleaning-product arrangement.
--
-- Adds two structured fields to contractor_service_schedules so each arrangement
-- states who supplies equipment and who supplies cleaning products. These render
-- in the agreement schedule block and let clause 6.1 defer to the schedule rather
-- than assume the contractor supplies everything.
--
-- Distinct from the pre-existing free-text `equipment_products` column (a single
-- catch-all that the editor never exposed). These two are explicit, optioned
-- fields. Values are free text at the DB level (the UI offers a fixed option set:
-- contractor_supplied | sano_supplied | client_supplied | as_agreed); null = not
-- stated. Additive + idempotent. Mike-run. Changes no existing schedule.

-- ── Read-only preflight (expect the columns absent) ─────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_service_schedules'
  and column_name in ('equipment_arrangement','product_arrangement');

begin;

alter table public.contractor_service_schedules
  add column if not exists equipment_arrangement text,
  add column if not exists product_arrangement text;

comment on column public.contractor_service_schedules.equipment_arrangement is
  'Who supplies equipment/tools for this arrangement (UI option set: contractor_supplied | sano_supplied | client_supplied | as_agreed). Null = not stated. Shown in the agreement schedule block; clause 6.1 defers to it.';
comment on column public.contractor_service_schedules.product_arrangement is
  'Who supplies cleaning products for this arrangement (same option set). Null = not stated. Shown in the agreement schedule block.';

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='contractor_service_schedules'
  and column_name in ('equipment_arrangement','product_arrangement')
order by column_name;   -- expect 2 rows

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   alter table public.contractor_service_schedules
--     drop column if exists equipment_arrangement,
--     drop column if exists product_arrangement;
-- commit;
