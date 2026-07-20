# Migration — ESCT columns on pay_run_lines (PR F)

**Date:** 2026-07-21 · Mike-run, verify via MCP before merging PR F.

The `/new` batch pay flow (the one that actually pays employees) now computes
ESCT on the employer KiwiSaver contribution. These columns store it per line.
Default 0 — existing (zero-value) rows read back as 0, which is correct.

```sql
-- ESCT on employee pay-run lines — 2026-07-21
alter table public.pay_run_lines
  add column if not exists esct numeric(12,2) not null default 0,
  add column if not exists kiwisaver_employer_net numeric(12,2) not null default 0;
```

## Verify after running
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'pay_run_lines'
  and column_name in ('esct','kiwisaver_employer_net')
order by column_name;
```
Expect 2 rows.
