# Migration — contractor GST end date + CI GST snapshot (Stage 0 PR E)

**Date:** 2026-07-21 · **Status: prepared, NOT YET RUN — awaiting Mike + the
read-only classification report below.**

Two tables:
1. **`contractors.gst_end_date`** — nullable deregistration date. With
   `gst_effective_date` this defines the registration WINDOW, so historical GST
   is resolved by *when the work was supplied*, not the current checkbox.
2. **`contractor_invoices`** GST snapshot — the treatment at the payable's supply
   date. `amount` stays the full **GST-inclusive** payable; `gst_amount` is the
   3/23 portion. **Existing rows are explicitly `not_assessed`** — never made to
   look like confirmed non-GST, and never retroactively recalculated.

```sql
-- 1. Contractor GST registration end date
alter table public.contractors
  add column if not exists gst_end_date date;

-- 2. Contractor-invoice GST snapshot (NULLABLE — absence = unassessed)
alter table public.contractor_invoices
  add column if not exists gst_applied     boolean,        -- null = unassessed
  add column if not exists gst_amount      numeric(12,2),  -- null = unassessed
  add column if not exists gst_status      text,
  add column if not exists gst_supply_date date;

-- Backfill existing rows as EXPLICITLY unassessed (not confirmed non-GST).
update public.contractor_invoices set gst_status = 'not_assessed' where gst_status is null;

alter table public.contractor_invoices
  drop constraint if exists contractor_invoices_gst_status_chk;
alter table public.contractor_invoices
  add constraint contractor_invoices_gst_status_chk
  check (gst_status is null or gst_status in
    ('applied','before_effective_date','not_registered','pending_review','incomplete','not_assessed'));
```

## Explicit unassessed model (chosen — the safer option)
- `gst_applied` / `gst_amount` are **nullable**; a NULL means *not assessed*.
- Existing paid invoices are set to `gst_status = 'not_assessed'` and are **NOT**
  retroactively recalculated.
- **No report or calculation may treat `gst_applied = false` as evidence the
  contractor was not registered** — only `gst_status` carries that meaning, and
  `not_assessed` / null / `pending_review` / `incomplete` are all "unknown / not
  confirmed", distinct from `not_registered`.

## Supply-date rule
- **Job-derived (`approveContractorPay`):** supply date = the job's `completed_at`.
- **Manual / fixed-contract (`createContractorInvoice`):** supply date is
  **captured explicitly on the form** (shown + confirmed by staff; for a
  fixed-contract period, the service-period end date). It is **not** silently
  assumed — the form defaults it to the submitted date and staff confirm/change.
- `approveContractorInvoice` re-resolves at the same supply date, so completing a
  contractor's GST data before approval locks in the correct treatment.

## Verify after running
```sql
select column_name, data_type from information_schema.columns
where table_name='contractors' and column_name='gst_end_date';
select column_name, data_type, is_nullable from information_schema.columns
where table_name='contractor_invoices' and column_name in ('gst_applied','gst_amount','gst_status','gst_supply_date')
order by column_name;
select count(*) as unassessed_existing from public.contractor_invoices where gst_status='not_assessed';
```
