// Recurring-invoice generation core (plain server lib — importable by both the
// admin action and the cron). Creates a DRAFT client invoice for a contract's
// monthly_value on its billing date; idempotent per contract + date; advances
// next_invoice_date. Draft only (staff review + send).

import type { SupabaseClient } from '@supabase/supabase-js'
import { advanceOneMonth, isInvoiceDue, addDaysISO } from '@/lib/recurring-invoice'
import { computeInvoiceDueDate } from '@/lib/invoice-dates'
import { resolveContractorGstSnapshot } from '@/lib/contractor-gst-snapshot'
import { sendRecurringInvoiceEmail } from './send-recurring-invoice'
import { computeRecurringAmount } from './per-visit-billing'
import { formatCurrency } from '@/lib/format'
import { groupVisitsByMonth, periodLabel, visitDate } from '@/lib/monthly-invoice'
import { createMonthlyInvoiceCore, defaultServiceLabel, scheduleInvoiceNote } from '@/lib/monthly-invoice-create'

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
  /** 'fixed' (flat monthly_value), 'per_visit' (rate × SCHEDULED service days
   *  that month) or 'completed_visits' (rate × visits actually COMPLETED —
   *  one invoice per month, jobs linked). Optional; defaults to fixed. */
  billing_mode?: string | null
  per_visit_rate?: number | null
  service_days_of_week?: number[] | null
  /** Optional per-job contractor pay rate — overrides the contractor's profile
   *  rate when set. Null = use their normal rate. */
  contractor_rate_override?: number | null
  /** Contractor payable mode: 'fixed' (flat contractor_monthly_pay) or
   *  'per_visit' (contractor_per_visit_rate × service days that month). */
  contractor_pay_mode?: string | null
  contractor_per_visit_rate?: number | null
}

export const REC_COLS =
  'id, client_id, monthly_value, title, description, address, status, invoice_auto_send, invoice_send_day, next_invoice_date, contractor_id, contractor_monthly_pay, bill_in_arrears, billing_mode, per_visit_rate, service_days_of_week, contractor_rate_override, contractor_pay_mode, contractor_per_visit_rate'

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
  if (!rec.contractor_id) return { skipped: 'no contractor' }
  const perVisitPay = rec.contractor_pay_mode === 'per_visit'
  if (perVisitPay) {
    if (!(Number(rec.contractor_per_visit_rate) > 0)) return { skipped: 'no contractor per-visit rate' }
    if (!(rec.service_days_of_week && rec.service_days_of_week.length > 0)) return { skipped: 'no service days for per-visit pay' }
  } else if (!(Number(rec.contractor_monthly_pay) > 0)) {
    return { skipped: 'no contractor pay' }
  }
  const siteLabel = rec.title?.trim() || 'Recurring contract'
  // Period label follows the service month — the PREVIOUS month when billing in
  // arrears — so the contractor's payable lines up with the month worked.
  const period = serviceMonth(billDate, !!rec.bill_in_arrears)
  const periodLabel = period.label

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

  // Fixed = flat monthly pay; per-visit = rate × service days in the period.
  const amount = perVisitPay
    ? computeRecurringAmount(
        { billingMode: 'per_visit', perVisitRate: rec.contractor_per_visit_rate, serviceDaysOfWeek: rec.service_days_of_week },
        { start: period.start, end: period.end },
      ).amount
    : Number(rec.contractor_monthly_pay)
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
  if (rec.billing_mode === 'completed_visits') return generateCompletedVisits(supabase, rec)
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
        notes: await scheduleInvoiceNote(supabase, { recurringJobId: rec.id, clientId: rec.client_id }),
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

/**
 * Per-schedule billing options added after REC_COLS, read on their own and
 * failing soft to the original behaviour (monthly, prices + GST) so a missing
 * column can never stop invoicing.
 */
async function billingOptions(
  supabase: SupabaseClient,
  recId: string,
): Promise<{ weekly: boolean; gstIncluded: boolean }> {
  try {
    const { data, error } = await supabase
      .from('recurring_jobs')
      .select('invoice_frequency, rate_includes_gst')
      .eq('id', recId)
      .maybeSingle()
    if (error || !data) return { weekly: false, gstIncluded: false }
    return {
      weekly: (data.invoice_frequency as string | null) === 'weekly',
      gstIncluded: !!data.rate_includes_gst,
    }
  } catch {
    return { weekly: false, gstIncluded: false }
  }
}

/**
 * 'completed_visits' billing: on the invoice date, bill the completed,
 * un-invoiced visits up to the end of the last period, built by the same core
 * as Invoices → Monthly invoice (summary + visit dates, jobs linked so nothing
 * is billed twice), then auto-send when the schedule has auto-send on.
 *
 * - Monthly (default): on the invoice day, last calendar month — one invoice
 *   per month, so a visit marked complete late lands on its own month's invoice.
 * - Weekly: every Monday, the previous Mon–Sun week — one invoice; any older
 *   stragglers ride along and the label shows the full date range.
 *
 * Scoped to visits on the client's completed-visits schedules (not every job
 * for the client): NZCL has one-off cleans at another address that must not be
 * swept into the weekly invoice. Two schedules for one client (Oranga
 * Tamariki's Wed + Fri) still give one invoice — the second finds nothing left.
 */
export async function generateCompletedVisits(
  supabase: SupabaseClient,
  rec: RecurringRow,
): Promise<RecurringInvoiceResult> {
  if (!rec.client_id) return { skipped: 'no client' }
  if (!(Number(rec.per_visit_rate) > 0)) return { skipped: 'no per-visit rate' }
  const billDate = rec.next_invoice_date
  if (!billDate) return { skipped: 'no next invoice date set' }
  const { weekly, gstIncluded } = await billingOptions(supabase, rec.id)

  // The client's completed-visits schedules — only their visits are billed here.
  const { data: schedules, error: sErr } = await supabase
    .from('recurring_jobs')
    .select('id')
    .eq('client_id', rec.client_id)
    .eq('billing_mode', 'completed_visits')
  if (sErr) return { error: `could not load schedules: ${sErr.message}` }
  const scheduleIds = Array.from(new Set([rec.id, ...((schedules ?? []).map((r) => r.id as string))]))

  const { data: jobs, error: jErr } = await supabase
    .from('jobs')
    .select('id, scheduled_date, completed_at')
    .eq('client_id', rec.client_id)
    .in('recurring_job_id', scheduleIds)
    .eq('status', 'completed')
    .is('invoice_id', null)
    .is('deleted_at', null)
    .eq('is_test', false)
  if (jErr) return { error: `could not load visits: ${jErr.message}` }

  // One entry per invoice to raise: its period + the visits on it.
  const batches: Array<{ key: string; month?: string; period?: { start: string; end: string; label: string }; jobIds: string[] }> = []
  if (weekly) {
    const periodEnd = addDaysISO(billDate, -1)
    const due = (jobs ?? []).filter((j) => { const d = visitDate(j); return !!d && d <= periodEnd })
    if (due.length > 0) {
      const earliest = due.map((j) => visitDate(j)!).sort()[0]
      const periodStart = earliest < addDaysISO(billDate, -7) ? earliest : addDaysISO(billDate, -7)
      batches.push({
        key: periodStart,
        period: { start: periodStart, end: periodEnd, label: periodLabel(periodStart, periodEnd) },
        jobIds: due.map((j) => j.id as string),
      })
    }
  } else {
    const throughMonth = serviceMonth(billDate, true)
    for (const [month, jobIds] of Array.from(groupVisitsByMonth(jobs ?? [], throughMonth.end).entries())) {
      batches.push({ key: month, month, jobIds })
    }
  }

  const label = (await defaultServiceLabel(supabase, rec.client_id)) ?? 'Regular cleaning'
  const note = await scheduleInvoiceNote(supabase, { recurringJobId: rec.id, clientId: rec.client_id })

  const invoiceIds: string[] = []
  const errors: string[] = []
  let sent = false
  for (const b of batches) {
    const res = await createMonthlyInvoiceCore(supabase, {
      clientId: rec.client_id,
      month: b.month,
      period: b.period,
      jobIds: b.jobIds,
      ratePerVisit: Number(rec.per_visit_rate),
      gstIncluded,
      serviceLabel: label,
      notes: note,
      issueDate: billDate,
      actor: { id: null, email: null, role: 'system' },
      recurringJobId: rec.id,
    })
    if ('error' in res) { errors.push(`${b.key}: ${res.error}`); continue }
    invoiceIds.push(res.invoiceId)
    if (rec.invoice_auto_send) {
      // Fail-safe: a failed send leaves a draft in the "Send draft invoices" to-do.
      const s = await sendRecurringInvoiceEmail(supabase, res.invoiceId)
      if (s.sent) sent = true
      else if (s.error) errors.push(`${b.key}: created but not sent (${s.error})`)
    }
  }

  // Monthly contractor payable only applies to schedules that pay monthly;
  // per-visit auto-approval (#612) handles everyone else.
  const payable = await ensureContractorPayable(supabase, rec, billDate)
  if (payable.error) errors.push(payable.error)

  const nextDate = weekly
    ? addDaysISO(billDate, 7)
    : advanceOneMonth(billDate, rec.invoice_send_day ?? Number(billDate.slice(8, 10)))
  await supabase
    .from('recurring_jobs')
    .update({ next_invoice_date: nextDate })
    .eq('id', rec.id)

  if (errors.length > 0) return { invoiceId: invoiceIds[0], sent, error: errors.join('; ') }
  if (invoiceIds.length === 0) return { skipped: 'no completed visits to bill' }
  return { invoiceId: invoiceIds[0], sent }
}

export async function generateDueRecurringInvoices(
  svc: SupabaseClient,
  today: string,
): Promise<{ generated: number; skipped: number; errors: string[] }> {
  const { data: recs } = await svc
    .from('recurring_jobs')
    .select(REC_COLS)
    .eq('status', 'active')
    // Per-visit / completed-visit contracts carry no monthly_value — the old
    // .not('monthly_value', 'is', null) filter skipped them forever.
    // generateFor() validates the amount for both billing modes.
    .or('monthly_value.not.is.null,billing_mode.in.(per_visit,completed_visits)')
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
