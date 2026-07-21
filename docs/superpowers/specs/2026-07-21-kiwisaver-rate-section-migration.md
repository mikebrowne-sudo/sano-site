# Migration — KiwiSaver rate provenance on contractors (KiwiSaver-rate section)

**Date:** 2026-07-21 · Mike-run, verify via MCP before merge.

Records WHY an employee's KiwiSaver rate is what it is, so a 3% rate can be
justified by a temporary reduction (with expiry) rather than being an untracked
below-minimum rate.

```sql
-- KiwiSaver rate provenance — 2026-07-21
alter table public.contractors
  add column if not exists kiwisaver_rate_source text not null default 'standard',
  add column if not exists kiwisaver_rate_effective_date date,
  add column if not exists kiwisaver_temp_reduction_expiry date;

alter table public.contractors
  drop constraint if exists contractors_kiwisaver_rate_source_chk;
alter table public.contractors
  add constraint contractors_kiwisaver_rate_source_chk
  check (kiwisaver_rate_source in ('standard','temporary_reduction','employee_election'));
```

## Verify after running
```sql
select column_name, data_type
from information_schema.columns
where table_name = 'contractors'
  and column_name in ('kiwisaver_rate_source','kiwisaver_rate_effective_date','kiwisaver_temp_reduction_expiry')
order by column_name;
```
Expect 3 rows.
