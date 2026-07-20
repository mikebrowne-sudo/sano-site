# Migration — ESCT columns on employee_pay_runs (PR C)

**Date:** 2026-07-21 · Mike-run, verify via MCP before merging PR C.

Adds the employer-KiwiSaver + ESCT figures to the stored employee pay run so
they appear in history + payday filing. All nullable / default 0 — existing rows
(employer contribution not tracked) read back as 0, which is correct for the
opted-out casual staff to date.

```sql
-- ESCT + employer KiwiSaver on employee pay runs — 2026-07-21
alter table public.employee_pay_runs
  add column if not exists employer_kiwisaver numeric(12,2) not null default 0,
  add column if not exists esct_rate numeric(6,4) not null default 0,
  add column if not exists esct numeric(12,2) not null default 0,
  add column if not exists employer_kiwisaver_net numeric(12,2) not null default 0;
```

## Verify after running
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'employee_pay_runs'
  and column_name in ('employer_kiwisaver','esct_rate','esct','employer_kiwisaver_net')
order by column_name;
```
Expect 4 rows.
