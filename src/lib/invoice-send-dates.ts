// Stamp an invoice's issue + due dates the FIRST time it is sent, and keep
// them sticky thereafter. `date_issued` is the day it actually went out (a
// re-send never changes it) and `due_date` is computed from that send date —
// an invoice sent AFTER the clean gets a send-based due date (cash sale: due
// on the send date; on account: send + terms), one sent BEFORE the clean is
// still due the day before the job. Shared by the Send panel and statements.
//
// Must run BEFORE the PDF render: the PDF is the share page, which reads these
// columns straight from the DB.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeInvoiceDueDate, resolveServiceDate } from './invoice-dates'
import { nzToday } from './nz-date'

export interface InvoiceDateFields {
  id: string
  client_id: string | null
  date_issued: string | null
  payment_type: string | null
  scheduled_clean_date: string | null
}

export async function stampInvoiceDatesOnFirstSend(
  supabase: SupabaseClient,
  invoice: InvoiceDateFields,
  defaultPaymentType: 'cash_sale' | 'on_account' = 'cash_sale',
): Promise<{ error?: string }> {
  if (invoice.date_issued) return {}
  const today = nzToday()
  const { data: client } = await supabase
    .from('clients')
    .select('payment_terms')
    .eq('id', invoice.client_id)
    .maybeSingle()

  const dueDate = computeInvoiceDueDate({
    payment_type: invoice.payment_type ?? defaultPaymentType,
    payment_terms: (client?.payment_terms as string | null) ?? null,
    date_issued: today,
    service_date: resolveServiceDate({ quote_scheduled_clean_date: invoice.scheduled_clean_date ?? null }),
  })
  const patch: Record<string, string> = { date_issued: today }
  if (dueDate) patch.due_date = dueDate
  const { error } = await supabase.from('invoices').update(patch).eq('id', invoice.id)
  return error ? { error: error.message } : {}
}
