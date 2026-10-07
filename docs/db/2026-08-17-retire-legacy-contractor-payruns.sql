-- Phase 1 — retire the legacy contractor pay-run track (2026-08-17).
--
-- WHAT THIS DOES
--   1. Blocks all new writes to the legacy contractor pay-run track:
--        pay_runs where kind='contractor'  ·  pay_run_items  ·  pay_run_remittances
--   2. Stops pay_run_remittances minting RA-#### numbers (drops its DEFAULT),
--      leaving contractor_remittances as the single remittance-number minter.
--
-- WHY
--   Two unconnected ways to record "this contractor was paid" is a double-pay
--   hazard. The canonical flow is:
--     job -> approve -> contractor_invoices -> contractor_remittances
--   The legacy track additionally wrote job_workers.pay_status
--   ('included_in_pay_run' / 'paid'), a state the canonical flow does not use.
--
--   Both tables also minted 'RA-' || lpad(...,4,'0') document numbers from two
--   INDEPENDENT sequences (remittance_number_seq vs
--   contractor_remittance_number_seq) with no cross-table uniqueness, so they
--   would eventually issue the same RA number for different documents.
--
-- APPROACH (deliberately minimal)
--   The RA collision is fixed STRUCTURALLY, not numerically: once the legacy
--   table cannot insert and has no DEFAULT, only one minter remains, so a
--   collision becomes impossible. A cross-table uniqueness trigger was
--   considered and REJECTED as unnecessary complexity — it would guard a table
--   that can no longer insert, while firing on every canonical insert forever.
--   (A normal UNIQUE constraint cannot span two tables in any case.)
--
--   The canonical sequence is deliberately NOT advanced or reset. It is at 27
--   (RA-0027) and correct; the legacy sequence never issued a number, so there
--   is no high-water mark to leapfrog.
--
-- SCOPE / SAFETY
--   * EMPLOYEE PAYROLL IS UNTOUCHED. The guard on pay_runs fires only for
--     NEW.kind='contractor'. Employee runs (kind='employee' -> pay_run_lines ->
--     payslips -> IRD liabilities) insert, approve and pay exactly as before.
--   * No data is modified. No row is deleted, no RA number renumbered, no
--     payment state altered, no historical amount touched.
--   * No table is dropped. pay_run_items / pay_run_remittances remain readable.
--   * UPDATE and DELETE are NOT blocked — only INSERT. Existing rows stay
--     editable by any future remediation without dropping these guards.
--   * pay_runs.kind CHECK still allows 'contractor'; removing it would be a
--     riskier schema change with no added benefit.
--   * Idempotent: safe to run more than once.
--
-- PRODUCTION STATE VERIFIED IMMEDIATELY BEFORE WRITING THIS (2026-08-17):
--     pay_runs kind='contractor' ......... 0 rows
--     pay_run_items ...................... 0 rows
--     pay_run_remittances ................ 0 rows
--     job_workers in 'included_in_pay_run' or 'paid' ... 0 rows
--     remittance_number_seq .............. last_value 1, is_called false (never used)
--     contractor_remittance_number_seq ... last_value 27, is_called true
--   The legacy track was never used for real pay, so nothing is being
--   grandfathered and no historical records are at risk.


-- ════════════════════════════════════════════════════════════════════
-- STEP 1 — VERIFY BEFORE (run this first; read the numbers)
-- ════════════════════════════════════════════════════════════════════
-- Expect all four counts to be 0. If ANY is non-zero, STOP and re-assess:
-- real legacy data would need a read-only archive path before blocking writes.

select
  (select count(*) from public.pay_runs where kind = 'contractor') as legacy_contractor_runs,
  (select count(*) from public.pay_run_items)                      as legacy_items,
  (select count(*) from public.pay_run_remittances)                as legacy_remittances,
  (select count(*) from public.job_workers
     where pay_status in ('included_in_pay_run','paid'))           as legacy_pay_status_rows;

-- Employee payroll baseline — capture these, they must NOT change.
select kind, status, count(*) as runs
from public.pay_runs
group by kind, status
order by kind nulls first, status;

-- Canonical RA numbering baseline — must NOT change.
select
  (select count(*) from public.contractor_remittances)                       as canonical_remittances,
  (select max((regexp_replace(remittance_number,'\D','','g'))::int)
     from public.contractor_remittances)                                     as max_canonical_ra,
  (select last_value from public.contractor_remittance_number_seq)           as canonical_seq;


-- ════════════════════════════════════════════════════════════════════
-- STEP 2 — APPLY
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── 2a. Shared guard function ──────────────────────────────────────
-- Raises on INSERT. Used by all three guards below. The pay_runs guard
-- passes through anything that is not a contractor run, so employee
-- payroll is completely unaffected.
create or replace function public.block_legacy_contractor_payrun()
returns trigger
language plpgsql
as $$
begin
  -- On pay_runs this trigger is scoped by a WHEN clause, but re-check
  -- defensively so the function is safe if ever attached elsewhere.
  if tg_table_name = 'pay_runs' and coalesce(new.kind, 'employee') <> 'contractor' then
    return new;  -- employee pay run — allow
  end if;

  raise exception
    'Legacy contractor pay-run track is retired (%). Pay contractors via contractor_invoices -> contractor_remittances.',
    tg_table_name
    using errcode = 'raise_exception',
          hint = 'Use /portal/contractor-invoices/pay-run. See docs/db/2026-08-17-retire-legacy-contractor-payruns.sql';
end;
$$;

-- ── 2b. Block new contractor-kind pay runs (employee runs unaffected) ──
drop trigger if exists block_legacy_contractor_payrun_trg on public.pay_runs;
create trigger block_legacy_contractor_payrun_trg
  before insert on public.pay_runs
  for each row
  when (new.kind = 'contractor')          -- employee inserts never reach the function
  execute function public.block_legacy_contractor_payrun();

-- ── 2c. Block new legacy pay-run items ─────────────────────────────
drop trigger if exists block_legacy_pay_run_items_trg on public.pay_run_items;
create trigger block_legacy_pay_run_items_trg
  before insert on public.pay_run_items
  for each row
  execute function public.block_legacy_contractor_payrun();

-- ── 2d. Block new legacy remittances ───────────────────────────────
drop trigger if exists block_legacy_pay_run_remittances_trg on public.pay_run_remittances;
create trigger block_legacy_pay_run_remittances_trg
  before insert on public.pay_run_remittances
  for each row
  execute function public.block_legacy_contractor_payrun();

-- ── 2e. Stop the legacy table minting RA numbers ───────────────────
-- Belt and braces alongside 2d: even if a guard were dropped, the legacy
-- table can no longer produce a number on its own. Leaves the column and
-- every existing value untouched (the table is empty in any case).
alter table public.pay_run_remittances
  alter column remittance_number drop default;

-- Retain the now-unused legacy sequence rather than dropping it: the column
-- default referenced it, and keeping it makes this migration trivially
-- reversible. It can never be advanced now that nothing calls nextval on it.
comment on sequence public.remittance_number_seq is
  'RETIRED 2026-08-17 — legacy pay_run_remittances RA numbering. Never issued a number (last_value 1, is_called false). Canonical RA numbers come from contractor_remittance_number_seq. Do not use.';

comment on table public.pay_run_remittances is
  'RETIRED 2026-08-17 — legacy contractor remittance track. INSERT blocked by trigger; RA-number DEFAULT removed. Read-only. Canonical: contractor_remittances.';

comment on table public.pay_run_items is
  'RETIRED 2026-08-17 — legacy contractor pay-run lines. INSERT blocked by trigger. Read-only. Canonical: contractor_invoices.';

commit;


-- ════════════════════════════════════════════════════════════════════
-- STEP 3 — VERIFY AFTER
-- ════════════════════════════════════════════════════════════════════

-- 3a. All three guards present?  Expect 3 rows.
select tgrelid::regclass as table_name, tgname as trigger_name
from pg_trigger
where tgname in (
  'block_legacy_contractor_payrun_trg',
  'block_legacy_pay_run_items_trg',
  'block_legacy_pay_run_remittances_trg'
)
order by 1;

-- 3b. RA default gone?  Expect column_default = NULL.
select column_default
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'pay_run_remittances'
  and column_name  = 'remittance_number';

-- 3c. Canonical numbering unchanged?  Expect 18 / 27 / 27 (as at 2026-08-17).
select
  (select count(*) from public.contractor_remittances)             as canonical_remittances,
  (select max((regexp_replace(remittance_number,'\D','','g'))::int)
     from public.contractor_remittances)                           as max_canonical_ra,
  (select last_value from public.contractor_remittance_number_seq) as canonical_seq;

-- 3d. Employee payroll untouched?  Expect the SAME kind/status counts as 1b.
select kind, status, count(*) as runs
from public.pay_runs
group by kind, status
order by kind nulls first, status;

-- 3e. Guard actually bites?  Both blocks must RAISE, and both roll back.
--     Run each separately; each should error, not insert.
--
--   -- must FAIL with the retirement message:
--   begin;
--     insert into public.pay_runs (pay_period_start, pay_period_end, pay_date, status, kind)
--     values ('2026-08-01','2026-08-15','2026-08-30','draft','contractor');
--   rollback;
--
--   -- must SUCCEED (proves employee payroll still works), then roll back:
--   begin;
--     insert into public.pay_runs (pay_period_start, pay_period_end, pay_date, status, kind)
--     values ('2026-08-01','2026-08-15','2026-08-30','draft','employee');
--   rollback;


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (only if needed)
-- ════════════════════════════════════════════════════════════════════
--   drop trigger if exists block_legacy_contractor_payrun_trg   on public.pay_runs;
--   drop trigger if exists block_legacy_pay_run_items_trg       on public.pay_run_items;
--   drop trigger if exists block_legacy_pay_run_remittances_trg on public.pay_run_remittances;
--   drop function if exists public.block_legacy_contractor_payrun();
--   alter table public.pay_run_remittances
--     alter column remittance_number
--     set default ('RA-' || lpad(nextval('public.remittance_number_seq')::text, 4, '0'));
