-- ============================================================================
-- Payslips — drop the legacy one-row-per-line unique (Payslip PR1 follow-up).
-- Mike-run. ADDITIVE-SAFE now that #450 is merged (no code upserts on it).
-- One paste-and-run. Enables multiple payslip VERSIONS per line; the
-- partial-unique payslips_current_per_line_uniq still enforces one CURRENT.
-- ============================================================================

-- ---- PREFLIGHT (read-only) --------------------------------------------------
select conname from pg_constraint where conrelid='public.payslips'::regclass and conname='payslips_pay_run_line_id_key';  -- expect 1 row (present)

-- ---- MIGRATION --------------------------------------------------------------
begin;
alter table public.payslips drop constraint if exists payslips_pay_run_line_id_key;
commit;

-- ---- VERIFICATION (read-only) -----------------------------------------------
select conname from pg_constraint where conrelid='public.payslips'::regclass and conname='payslips_pay_run_line_id_key';  -- expect 0 rows
select indexname from pg_indexes where schemaname='public' and tablename='payslips' and indexname='payslips_current_per_line_uniq';  -- expect 1 row (one-current-per-line still enforced)

-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   alter table public.payslips add constraint payslips_pay_run_line_id_key unique (pay_run_line_id);
-- commit;
