# Migration — holiday-pay mode + eligibility on employee_pay_runs (PR D)

**Date:** 2026-07-21 · Mike-run, verify via MCP before merging PR D.

Stores which holiday-pay model a run used, the base (pre-holiday) earnings, and
whether the worker was treated as a genuine casual eligible for PAYG 8%.
Defaults preserve current behaviour (inclusive, eligible).

```sql
-- Holiday-pay mode + eligibility on employee pay runs — 2026-07-21
alter table public.employee_pay_runs
  add column if not exists base_earnings numeric(12,2) not null default 0,
  add column if not exists holiday_pay_mode text not null default 'inclusive',
  add column if not exists payg_holiday_eligible boolean not null default true;

alter table public.employee_pay_runs
  drop constraint if exists employee_pay_runs_holiday_pay_mode_chk;
alter table public.employee_pay_runs
  add constraint employee_pay_runs_holiday_pay_mode_chk
  check (holiday_pay_mode in ('inclusive','exclusive_on_top'));
```

## Verify after running
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'employee_pay_runs'
  and column_name in ('base_earnings','holiday_pay_mode','payg_holiday_eligible')
order by column_name;
```
Expect 3 rows.
