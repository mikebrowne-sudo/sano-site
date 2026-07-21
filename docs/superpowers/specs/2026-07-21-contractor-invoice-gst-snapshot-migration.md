# Migration — GST snapshot columns on contractor_invoices (Stage 0 PR E)

**Date:** 2026-07-21 · Mike-run, verify via MCP before merge (the approve flow
writes these columns).

Snapshots the GST treatment onto each contractor payable at approval time. The
`amount` stays the **full GST-inclusive** payable; `gst_amount` is the 3/23
portion split out (never added on top); `gst_status` records the treatment or a
flag when the contractor's GST status was unresolved.

```sql
-- GST snapshot on contractor invoices — 2026-07-21
alter table public.contractor_invoices
  add column if not exists gst_applied boolean not null default false,
  add column if not exists gst_amount  numeric(12,2) not null default 0,
  add column if not exists gst_status  text;

alter table public.contractor_invoices
  drop constraint if exists contractor_invoices_gst_status_chk;
alter table public.contractor_invoices
  add constraint contractor_invoices_gst_status_chk
  check (gst_status is null or gst_status in
    ('applied','not_registered','before_effective_date','pending_review','incomplete'));
```

## Supply-date rule
- **Job-derived payables (canonical `approveContractorPay`):** GST supply date =
  the job's `completed_at` (which is also `date_submitted`). This is wired in PR E.
- **Manual / fixed-contract payables (`createContractorInvoice`):** the documented
  safe rule is **`date_submitted` is the GST supply date** (the payable's own
  date — for a fixed-contract monthly payable, the period date). Wiring GST into
  the manual path is a small follow-up; until then those CIs default to
  `gst_applied=false, gst_status=null`, i.e. **unflagged rather than guessed**.

## Historical rows
Existing paid invoices read back as `gst_applied=false, gst_amount=0,
gst_status=null` and are **NOT** retroactively recalculated (deliberate — see PR).

## Verify after running
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name='contractor_invoices' and column_name in ('gst_applied','gst_amount','gst_status')
order by column_name;
```
Expect 3 rows.
