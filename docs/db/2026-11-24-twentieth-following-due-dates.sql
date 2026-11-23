-- One-off: re-date OPEN invoices on "20th of the month" terms to the 20th of
-- the month FOLLOWING the invoice date (the corrected rule in
-- src/lib/invoice-dates.ts).
--
-- The old rule used the NEXT 20th, so an invoice issued 19 Nov was due
-- 20 Nov. Only invoices still carrying that old-rule date are touched
-- (issued on/before the 20th AND due the 20th of the same month), so any
-- due date set by hand is left alone. Paid / draft invoices are not touched.
-- At 2026-11-24 this matched 18 invoices (16 Barfoot, 2 Wendell).
-- Each change is written to audit_log.

with changed as (
  update public.invoices i
     set due_date = (date_trunc('month', i.date_issued) + interval '1 month' + interval '19 days')::date
    from public.clients c
   where c.id = i.client_id
     and c.payment_terms = '20_of_month'
     and i.deleted_at is null
     and i.status = 'sent'
     and i.date_issued is not null
     and extract(day from i.date_issued) <= 20
     and i.due_date = make_date(extract(year from i.date_issued)::int, extract(month from i.date_issued)::int, 20)
  returning i.id, i.invoice_number, i.date_issued,
            make_date(extract(year from i.date_issued)::int, extract(month from i.date_issued)::int, 20) as old_due,
            i.due_date as new_due
), audited as (
  insert into public.audit_log (action, entity_table, entity_id, before, after)
  select 'invoice.due_date_corrected', 'invoices', id,
         jsonb_build_object('due_date', old_due),
         jsonb_build_object('due_date', new_due, 'reason', '20th of the month following (rule fix 2026-11-24)')
    from changed
  returning entity_id
)
select invoice_number, date_issued, old_due, new_due
  from changed
 order by date_issued, invoice_number;
