// Monthly invoice from completed jobs — the DB core.
//
// Shared by the admin page action (/portal/invoices/monthly/new, session
// client) and the recurring-invoice cron (billing_mode 'completed_visits',
// service-role client), so both create identical invoices: one DRAFT invoice
// for a client-month, every visit listed in the service description, the
// jobs linked (invoice_id + status 'invoiced') so they can never be billed
// twice. See src/lib/monthly-invoice.ts for the pure maths.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeInvoiceDueDate } from '@/lib/invoice-dates'
import {
  monthRange,
  visitDate,
  buildMonthlyLines,
  composeMonthlyDescription,
} from '@/lib/monthly-invoice'

export interface MonthlyInvoiceActor {
  /** auth user id, or null for the cron. */
  id: string | null
  email: string | null
  role: 'admin' | 'system'
}

export interface CreateMonthlyInvoiceCoreInput {
  clientId: string
  /** 'YYYY-MM' — a calendar month. Ignored when `period` is given. */
  month?: string
  /** Explicit billing period (weekly invoicing). Overrides `month`. */
  period?: { start: string; end: string; label: string }
  jobIds: string[]
  /** Ex-GST price for any selected visit that has no job_price. */
  ratePerVisit: number | null
  /** Invoice heading, e.g. "Residential Housekeeping". */
  serviceLabel: string | null
  /** The rate/prices already include GST (e.g. Bella's $180 incl.). */
  gstIncluded?: boolean
  /** Printed in the invoice's Notes box, e.g. the contract rate. */
  notes?: string | null
  /** The date the invoice will be issued, when known up-front (the cron's
   *  billing date). Used only to compute the due date, e.g. 1 Nov → 20 Nov on
   *  20th-of-month terms. The page leaves it unset; Send stamps the dates. */
  issueDate?: string | null
  actor: MonthlyInvoiceActor
  /** Recorded on the audit row, e.g. the recurring schedule that raised it. */
  recurringJobId?: string | null
}

export type CreateMonthlyInvoiceResult =
  | { invoiceId: string; invoiceNumber: string | null; total: number; visits: number }
  | { error: string }

/**
 * The invoice note set on the client's recurring schedule(s), if any. Read
 * on its own (not via REC_COLS) and error-tolerant so a missing column can
 * never break invoicing.
 */
export async function scheduleInvoiceNote(
  supabase: SupabaseClient,
  opts: { recurringJobId?: string | null; clientId: string },
): Promise<string | null> {
  try {
    const q = supabase.from('recurring_jobs').select('invoice_note').not('invoice_note', 'is', null)
    const { data, error } = opts.recurringJobId
      ? await q.eq('id', opts.recurringJobId).limit(1)
      : await q.eq('client_id', opts.clientId).eq('status', 'active').order('created_at').limit(1)
    if (error) return null
    const note = ((data?.[0] as { invoice_note?: string | null } | undefined)?.invoice_note ?? '').trim()
    return note || null
  } catch {
    // A note must never block an invoice.
    return null
  }
}

/** Whether the client's completed-visits schedule prices include GST (fails soft to false). */
export async function scheduleRateIncludesGst(supabase: SupabaseClient, clientId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('recurring_jobs')
      .select('rate_includes_gst')
      .eq('client_id', clientId)
      .eq('billing_mode', 'completed_visits')
      .limit(1)
    if (error) return false
    return !!(data?.[0] as { rate_includes_gst?: boolean } | undefined)?.rate_includes_gst
  } catch {
    return false
  }
}

/** Heading prefill: the client's most recent quote's clean type, if any. */
export async function defaultServiceLabel(supabase: SupabaseClient, clientId: string): Promise<string | null> {
  const { data } = await supabase
    .from('quotes')
    .select('type_of_clean')
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .not('type_of_clean', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.type_of_clean as string | null) ?? null
}

export async function createMonthlyInvoiceCore(
  supabase: SupabaseClient,
  input: CreateMonthlyInvoiceCoreInput,
): Promise<CreateMonthlyInvoiceResult> {
  const range = input.period ?? (input.month ? monthRange(input.month) : null)
  if (!range) return { error: 'Pick a month.' }
  const jobIds = Array.from(new Set(input.jobIds ?? []))
  if (jobIds.length === 0) return { error: 'Select at least one completed visit.' }

  const { data: client } = await supabase
    .from('clients')
    .select('id, is_archived, service_address, payment_type, payment_terms')
    .eq('id', input.clientId)
    .maybeSingle()
  if (!client) return { error: 'Client not found.' }
  if (client.is_archived) return { error: 'Client is archived. Restore the client first.' }

  // Re-load the jobs and re-check every rule — never trust the caller.
  const { data: jobs, error: jErr } = await supabase
    .from('jobs')
    .select('id, job_number, client_id, status, payment_status, invoice_id, deleted_at, scheduled_date, completed_at, allowed_hours, job_price, address')
    .in('id', jobIds)
  if (jErr) return { error: `Could not load jobs: ${jErr.message}` }
  if (!jobs || jobs.length !== jobIds.length) return { error: 'Some selected jobs no longer exist.' }
  // Kept for rollback if linking fails part-way.
  const origPayment = new Map(jobs.map((j) => [j.id as string, (j.payment_status as string | null) ?? null]))

  for (const j of jobs) {
    const label = j.job_number ?? j.id
    if (j.client_id !== client.id) return { error: `${label} belongs to a different client.` }
    if (j.deleted_at) return { error: `${label} is archived.` }
    if (j.invoice_id) return { error: `${label} is already on an invoice.` }
    if (j.status !== 'completed') return { error: `${label} isn't completed yet.` }
    const d = visitDate(j)
    if (!d || d < range.start || d > range.end) return { error: `${label} isn't in ${range.label}.` }
  }

  const built = buildMonthlyLines(jobs, input.ratePerVisit)
  if ('error' in built) return { error: built.error }

  const { data: primaryContact } = await supabase
    .from('contacts')
    .select('id, full_name, email')
    .eq('client_id', client.id)
    .eq('contact_type', 'primary')
    .maybeSingle()

  // Always on account: these invoices bill visits AFTER the work, so cash-sale
  // wording ("payment is required before the clean") would be wrong, and
  // invoices.payment_type rejects client-only values like 'prepaid'. Due
  // dates still follow the client's payment_terms.
  const paymentType = 'on_account'
  const lastVisit = built.lines[built.lines.length - 1].date
  const serviceAddress = (jobs.find((j) => j.address)?.address as string | null) ?? client.service_address ?? null

  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      client_id: client.id,
      contact_id: primaryContact?.id ?? null,
      // Copy the primary contact onto the invoice so the document prints
      // "Attn: <name>" and Send defaults to their email.
      contact_name: (primaryContact?.full_name as string | null) ?? null,
      contact_email: (primaryContact?.email as string | null) ?? null,
      quote_id: null,
      job_id: null,
      source: 'job',
      status: 'draft',
      service_address: serviceAddress,
      scheduled_clean_date: lastVisit,
      type_of_clean: (input.serviceLabel ?? '').trim() || null,
      service_description: composeMonthlyDescription(range.label, built.lines, { gstIncluded: !!input.gstIncluded }),
      notes: (input.notes ?? '').trim() || null,
      base_price: built.total,
      gst_included: !!input.gstIncluded,
      payment_type: paymentType,
      // date_issued stays null until Send stamps it (same as job invoices).
      due_date: computeInvoiceDueDate({
        payment_type: paymentType,
        payment_terms: (client.payment_terms as string | null) ?? null,
        date_issued: input.issueDate ?? null,
        service_date: lastVisit,
      }),
    })
    .select('id, invoice_number')
    .single()
  if (iErr || !invoice) return { error: `Failed to create invoice: ${iErr?.message ?? 'unknown error'}` }

  // Link the jobs. Priced-from-rate jobs also get that price stamped so job
  // margins and reconciliation see the real figure. Guard on invoice_id IS
  // NULL so a concurrent invoice can't steal a job; if anything fails to
  // link, roll the whole thing back rather than leave a half-linked invoice.
  const linked: string[] = []
  for (const line of built.lines) {
    const update: Record<string, unknown> = { invoice_id: invoice.id, status: 'invoiced', payment_status: 'invoice_sent' }
    if (line.priceFromRate) update.job_price = line.price
    const { data: row } = await supabase
      .from('jobs')
      .update(update)
      .eq('id', line.jobId)
      .is('invoice_id', null)
      .select('id')
      .maybeSingle()
    if (!row) {
      for (const id of linked) {
        const orig = jobs.find((j) => j.id === id)!
        await supabase
          .from('jobs')
          .update({ invoice_id: null, status: orig.status, payment_status: origPayment.get(id) ?? null, job_price: orig.job_price })
          .eq('id', id)
      }
      await supabase.from('invoices').delete().eq('id', invoice.id)
      return { error: `${line.jobNumber ?? line.jobId} was invoiced by someone else just now. Nothing was created — please reload.` }
    }
    linked.push(line.jobId)
  }

  await supabase.from('audit_log').insert({
    actor_id: input.actor.id,
    actor_role: input.actor.role === 'system' ? 'admin' : input.actor.role,
    action: 'invoice.created_monthly',
    entity_table: 'invoices',
    entity_id: invoice.id,
    before: null,
    after: {
      actor_email: input.actor.email,
      source: input.actor.role === 'system' ? 'recurring_completed_visits' : 'monthly_invoice_page',
      recurring_job_id: input.recurringJobId ?? null,
      invoice_number: invoice.invoice_number,
      client_id: client.id,
      month: input.month ?? null,
      period: input.period ?? null,
      gst_included: !!input.gstIncluded,
      visits: built.lines.map((l) => ({ job_id: l.jobId, job_number: l.jobNumber, date: l.date, price: l.price, price_from_rate: l.priceFromRate })),
      base_price: built.total,
      rate_per_visit: input.ratePerVisit,
    },
  })

  return {
    invoiceId: invoice.id as string,
    invoiceNumber: (invoice.invoice_number as string | null) ?? null,
    total: built.total,
    visits: built.lines.length,
  }
}
