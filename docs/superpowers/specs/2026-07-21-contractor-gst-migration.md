# Migration — contractor GST effective date (PR E)

**Date:** 2026-07-21 · Mike-run, verify via MCP before merging PR E.

`contractors.gst_registered` + `gst_number` already exist. This adds the date
GST registration took effect, so GST (3/23) is only split out of payments for
work on/after that date.

```sql
-- Contractor GST effective date + tax treatment — 2026-07-21
alter table public.contractors
  add column if not exists gst_effective_date date,
  add column if not exists tax_treatment text not null default 'pending_review';

alter table public.contractors
  drop constraint if exists contractors_tax_treatment_chk;
alter table public.contractors
  add constraint contractors_tax_treatment_chk
  check (tax_treatment in ('ordinary_trade_creditor','schedular_payment','certificate_of_exemption','pending_review'));
```

## Verify after running
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'contractors' and column_name in ('gst_effective_date','tax_treatment')
order by column_name;
```
Expect 2 rows.
