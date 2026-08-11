// Recurring-invoice generation core (plain server lib — importable by both the
// admin action and the cron). Creates a DRAFT client invoice for a contract's
// monthly_value on its billing date; idempotent per contract + date; advances
// next_invoice_date. Draft only (staff review + send).

import type { SupabaseClient } from '@supabase/supabase-js'
import { advanceOneMonth, isInvoiceDue } from '@/lib/recurring-invoice'
import { computeInvoiceDueDate } from '@/lib/invoice-dates'
import { resolveContractorGstSnapshot } from '@/lib/contractor-gst-snapshot'
import { sendRecurringInvoiceEmail } from './send-recurring-invoice'
import { computeRecurringAmount } from './per-visit-billing'
import { formatCurrency } from '@/lib/format'

export interface RecurringRow {
  id: string
  client_id: string | null
  monthly_value: number | null
  title: string | null
  description: string | null
  address: string | null
  status: string | null
  invoice_auto_send: boolean | null
  invoice_send_day: number | null
  next_invoice_date: string | null
  contractor_id: string | null
  contractor_monthly_pay: number | null
  /** When true, the invoice sent on `invoice_send_day` bills for the PREVIOUS
   *  calendar month (e.g. Pukekohe: sent the 7th of Sep for August's work). */
  bill_in_arrears: boolean | null
  /** 'fixed' (flat monthly_value) or 'per_visit' (rate × service days that month).
   *  Optional so pre-existing callers default to fixed. */
  billing_mode?: string | null
  per_visit_rate?: number | null
  service_days_of_week?: number[] | null
  /** Optional per-job contractor pay rate — overrides the contractor's profile
   *  rate when set. Null = use their normal rate. */
  contractor_rate_override?: number | null
}

export const REC_COLS =
  'id, client_id, monthly_value, title, description, address, status, invoice_auto_send, invoice_send_day, next_invoice_date, contractor_id, contractor_monthly_pay, bill_in_arrears, billing_mode, per_visit_rate, service_days_of_week, contractor_rate_override'

/** Month label for a billing date, e.g. "2026-07-31" → "July 2026". */
export function billingPeriodLabel(billDate: string): string {
  return new Date(billDate + 'T00:00:00Z').toLocaleDateString('en-NZ', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/**
 * Service period a recurring invoice covers. When `arrears` is true the invoice
 * is billed in the FOLLOWING month for the completed month (Pukekohe: sent on
 * the 7th of Sep for August's work) — so the covered month is billDate − 1
 * month. Returns both a label ("August 2026") and the calendar-month bounds.
 */
export function serviceMonth(billDate: string, arrears: boolean): { label: string; start: string; end: string } {
  const d = new Date(billDate + 'T00:00:00Z')
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() - (arrears ? 1 : 0) // 0-based; may go to -1
  const first = new Date(Date.UTC(y, m, 1))
  const last = new Date(Date.UTC(y, m + 1, 0)) // day 0 of next month = last day
  const iso = (x: Date) => x.toISOString().slice(0, 10)
  return {
    label: first.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    start: iso(first),
    end: iso(last),
  }
}

/**
 * Create the contract's fixed monthly contractor payable (e.g. Myrtle's $1500),
 * idempotent per (contractor, contract title, period) so a cron re-run or an
 * already-created month never doubles it. Auto-approved so it lands ready to pay
 * in the "Pay contractors" list.
 */
export async function ensureContractorPayable(
  supabase: SupabaseClient,
  rec: RecurringRow,
  billDate: string,
): Promise<{ created?: boolean; skipped?: string; error?: string }> {
  if (!rec.contractor_id || !(Number(rec.contractor_monthly_pay) > 0)) return { skipped: 'no contractor pay' }
  const siteLabel = rec.title?.trim() || 'Recurring contract'
  // Period label follows the service month — the PREVIOUS month when billing in
  // arrears — so the contractor's payable lines up with the month worked.
  const periodLabel = serviceMonth(billDate, !!rec.bill_in_arrears).label

  const { data: existing } = await supabase
    .from('contractor_invoices')
    .select('id')
    .eq('contractor_id', rec.contractor_id)
    .eq('payment_type', 'fixed_contract')
    .eq('site_label', siteLabel)
    .eq('period_label', periodLabel)
    .neq('status', 'void')
    .limit(1)
    .maybeSingle()
  if (existing) return { skipped: 'payable already exists for this period' }

  const amount = Number(rec.contractor_monthly_pay)
  const { fields: gstFields } = await resolveContractorGstSnapshot(supabase, rec.contractor_id, amount, billDate)

  const { data: ci, error } = await supabase
    .from('contractor_invoices')
    .insert({
      contractor_id: rec.contractor_id,
      amount,
      date_submitted: billDate,
      status: 'approved',
      approved_at: new Date().toISOString(),
      payment_type: 'fixed_contract',
      site_label: siteLabel,
      period_label: periodLabel,
      service_date: billDate,
      ...gstFields,
    })
    .select('id, invoice_number')
    .single()
  if (error || !ci) return { error: `contractor payable: ${error?.message ?? 'no row'}` }

  await supabase.from('audit_log').insert({
    actor_id: null,
    actor_role: 'admin',
    action: 'contractor_invoice.created',
    entity_table: 'contractor_invoices',
    entity_id: ci.id,
    before: null,
    after: { invoice_number: ci.invoice_number ?? null, contractor_id: rec.contractor_id, amount, payment_type: 'fixed_contract', source: 'recurring_contract', recurring_job_id: rec.id, period_label: periodLabel },
  })
  return { created: true }
}

export interface RecurringInvoiceResult {
  invoiceId?: string
  sent?: boolean
  skipped?: string
  error?: string
}

export async function generateFor(supabase: SupabaseClient, rec: RecurringRow): Promise<RecurringInvoiceResult> {
  if (!rec.client_id) return { skipped: 'no client' }
  const isPerVisit = rec.billing_mode === 'per_visit'
  if (isPerVisit) {
    if (!(Number(rec.per_visit_rate) > 0)) return { skipped: 'no per-visit rate' }
    if (!(rec.service_days_of_week && rec.service_days_of_week.length > 0)) return { skipped: 'no service days set' }
  } else if (!(Number(rec.monthly_value) > 0)) {
    return { skipped: 'no monthly value' }
  }
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
      date_issued: billDate, // issued on the billing date → deterministic 20th-of-month etc.
      service_date: billDate,
    })

    // Service period the invoice covers (previous month when billing in arrears),
    // spelled out on the invoice so the customer sees exactly which month it's for.
    const period = serviceMonth(billDate, !!rec.bill_in_arrears)
    const baseDesc = rec.title?.trim() || rec.description?.trim() || 'Monthly cleaning contract'

    // Amount: fixed monthly_value, OR per_visit_rate × service days in the period.
    const { amount, visits } = computeRecurringAmount(
      { billingMode: rec.billing_mode, monthlyValue: rec.monthly_value, perVisitRate: rec.per_visit_rate, serviceDaysOfWeek: rec.service_days_of_week },
      period,
    )
    const monthWord = period.label.split(' ')[0]
    const serviceDescription = isPerVisit
      ? `${baseDesc} — ${period.label} (${visits} visit${visits === 1 ? '' : 's'} @ ${formatCurrency(Number(rec.per_visit_rate) || 0)} per visit)`
      : `${baseDesc} — ${period.label} (service period 1–${period.end.slice(8, 10)} ${monthWord})`

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        client_id: rec.client_id,
        recurring_job_id: rec.id,
        service_address: rec.address || null,
        scheduled_clean_date: billDate,
        base_price: amount,
        service_description: serviceDescription,
        payment_type: paymentType,
        due_date: dueDate,
      })
      .select('id')
      .single()
    if (error || !invoice) return { error: `Failed to create invoice: ${error?.message ?? 'no row'}` }
    invoiceId = invoice.id as string
  }

  // Auto-send the client email when the contract opts in. Fail-safe: if the
  // send fails (no client email, PDF error), the invoice stays a draft and
  // shows up in the "Send draft invoices" to-do.
  let sent = false
  if (invoiceId && rec.invoice_auto_send) {
    const res = await sendRecurringInvoiceEmail(supabase, invoiceId)
    sent = !!res.sent
  }

  // Fixed monthly contractor payable (e.g. Myrtle's $1500). Independent of the
  // invoice's existence + idempotent per period, so it's created once even if the
  // invoice was already there.
  const payable = await ensureContractorPayable(supabase, rec, billDate)

  await supabase
    .from('recurring_jobs')
    .update({ next_invoice_date: advanceOneMonth(billDate, sendDay) })
    .eq('id', rec.id)

  if (payable.error) return { error: payable.error }
  return existing ? { skipped: 'already billed for this date' } : { invoiceId, sent }
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
