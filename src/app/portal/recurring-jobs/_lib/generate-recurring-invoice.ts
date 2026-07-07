// Recurring-invoice generation core (plain server lib — importable by both the
// admin action and the cron). Creates a DRAFT client invoice for a contract's
// monthly_value on its billing date; idempotent per contract + date; advances
// next_invoice_date. Draft only (staff review + send).

import type { SupabaseClient } from '@supabase/supabase-js'
import { advanceOneMonth, isInvoiceDue } from '@/lib/recurring-invoice'
import { computeInvoiceDueDate } from '@/lib/invoice-dates'

export interface RecurringRow {
  id: string
  client_id: string | null
  monthly_value: number | null
  title: string | null
  description: string | null
  address: string | null
  status: string | null
  invoice_send_day: number | null
  next_invoice_date: string | null
}

export const REC_COLS =
  'id, client_id, monthly_value, title, description, address, status, invoice_send_day, next_invoice_date'

export interface RecurringInvoiceResult {
  invoiceId?: string
  skipped?: string
  error?: string
}

export async function generateFor(supabase: SupabaseClient, rec: RecurringRow): Promise<RecurringInvoiceResult> {
  if (!rec.client_id) return { skipped: 'no client' }
  if (!(Number(rec.monthly_value) > 0)) return { skipped: 'no monthly value' }
  const billDate = rec.next_invoice_date
  if (!billDate) return { skipped: 'no next invoice date set' }
  const sendDay = rec.invoice_send_day ?? Number(billDate.slice(8, 10))

  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('recurring_job_id', rec.id)
    .eq('scheduled_clean_date', billDate)
    .is('deleted_at', null)
    .maybeSingle()

  let invoiceId: string | undefined
  if (!existing) {
    const { data: client } = await supabase
      .from('clients')
      .select('payment_type, payment_terms')
      .eq('id', rec.client_id)
      .maybeSingle()
    const paymentType = (client?.payment_type as string | null) ?? 'on_account'
    const dueDate = computeInvoiceDueDate({
      payment_type: paymentType,
      payment_terms: (client?.payment_terms as string | null) ?? null,
      date_issued: null,
      service_date: billDate,
    })

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        client_id: rec.client_id,
        recurring_job_id: rec.id,
        service_address: rec.address || null,
        scheduled_clean_date: billDate,
        base_price: rec.monthly_value,
        service_description: rec.title?.trim() || rec.description?.trim() || 'Monthly cleaning contract',
        payment_type: paymentType,
        due_date: dueDate,
      })
      .select('id')
      .single()
    if (error || !invoice) return { error: `Failed to create invoice: ${error?.message ?? 'no row'}` }
    invoiceId = invoice.id as string
  }

  await supabase
    .from('recurring_jobs')
    .update({ next_invoice_date: advanceOneMonth(billDate, sendDay) })
    .eq('id', rec.id)

  return existing ? { skipped: 'already billed for this date' } : { invoiceId }
}

export async function generateDueRecurringInvoices(
  svc: SupabaseClient,
  today: string,
): Promise<{ generated: number; skipped: number; errors: string[] }> {
  const { data: recs } = await svc
    .from('recurring_jobs')
    .select(REC_COLS)
    .eq('status', 'active')
    .not('monthly_value', 'is', null)
    .not('next_invoice_date', 'is', null)

  let generated = 0
  let skipped = 0
  const errors: string[] = []
  for (const rec of (recs ?? []) as RecurringRow[]) {
    if (!isInvoiceDue(rec.next_invoice_date, today)) { skipped++; continue }
    const res = await generateFor(svc, rec)
    if (res.error) errors.push(`${rec.id}: ${res.error}`)
    else if (res.invoiceId) generated++
    else skipped++
  }
  return { generated, skipped, errors }
}
