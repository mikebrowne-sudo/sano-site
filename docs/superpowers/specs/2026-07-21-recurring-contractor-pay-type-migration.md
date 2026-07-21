# Migration — recurring_jobs.contractor_pay_type (Stage 0 PR C)

**Date:** 2026-07-21 · Mike-run, verify via MCP **before** merging PR C
(the generator selects this column).

Lets a recurring contract declare how its contractor is paid per occurrence, so
generation can seed the right pay basis on each job_workers row. Default
`'hourly'` (the common case); `'fixed'` for flat arrangements.

```sql
-- Recurring contractor pay basis — 2026-07-21
alter table public.recurring_jobs
  add column if not exists contractor_pay_type text not null default 'hourly';

alter table public.recurring_jobs
  drop constraint if exists recurring_jobs_contractor_pay_type_chk;
alter table public.recurring_jobs
  add constraint recurring_jobs_contractor_pay_type_chk
  check (contractor_pay_type in ('hourly','fixed'));
```

## Verify after running
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'recurring_jobs' and column_name = 'contractor_pay_type';
```
Expect 1 row (default `'hourly'`).
