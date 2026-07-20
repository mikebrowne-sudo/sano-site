# Migration — contractor GST effective date (PR E)

**Date:** 2026-07-21 · Mike-run, verify via MCP before merging PR E.

`contractors.gst_registered` + `gst_number` already exist. This adds the date
GST registration took effect, so GST (3/23) is only split out of payments for
work on/after that date.

```sql
-- Contractor GST effective date — 2026-07-21
alter table public.contractors
  add column if not exists gst_effective_date date;
```

## Verify after running
```sql
select column_name, data_type
from information_schema.columns
where table_name = 'contractors' and column_name = 'gst_effective_date';
```
Expect 1 row.
