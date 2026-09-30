'use server'

// Monthly invoice from completed jobs.
//
// One invoice per client per month covering the visits actually completed
// (e.g. Oranga Tamariki: 2 × 7-hour visits a week, billed monthly in arrears).
// Every selected job is linked to the invoice (jobs.invoice_id, status
// 'invoiced'), so it drops out of "ready to invoice" and can never be billed
// twice. The visits are listed in the service description; the invoice total
// is base_price only (no invoice_items), matching every other total surface.
//
// quote_id = job_id = null on purpose, like custom invoices: the invoice
// covers many jobs, and a single job_id would mislead the one-job flows.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { computeInvoiceDueDate } from '@/lib/invoice-dates'
import {
  monthRange,
  visitDate,
  buildMonthlyLines,
  composeMonthlyDescription,
} from '@/lib/monthly-invoice'

export interface CreateMonthlyInvoiceInput {
  clientId: string
  /** 'YYYY-MM' */
  month: string
  jobIds: string[]
  /** Ex-GST price for any selected visit that has no job_price. */
  ratePerVisit: number | null
  /** Invoice heading, e.g. "Residential Housekeeping". */
  serviceLabel: string | null
}

export async function createMonthlyInvoice(
  input: CreateMonthlyInvoiceInput,
): Promise<{ error: string } | never> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const range = monthRange(input.month)
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

  // Re-load the jobs server-side and re-check every rule — never trust the form.
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
    .select('id')
    .eq('client_id', client.id)
    .eq('contact_type', 'primary')
    .maybeSingle()

  const paymentType = (client.payment_type as string | null) ?? 'on_account'
  const lastVisit = built.lines[built.lines.length - 1].date
  const serviceAddress = (jobs.find((j) => j.address)?.address as string | null) ?? client.service_address ?? null

  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      client_id: client.id,
      contact_id: primaryContact?.id ?? null,
      quote_id: null,
      job_id: null,
      source: 'job',
      status: 'draft',
      service_address: serviceAddress,
      scheduled_clean_date: lastVisit,
      type_of_clean: (input.serviceLabel ?? '').trim() || null,
      service_description: composeMonthlyDescription(range.label, built.lines),
      base_price: built.total,
      gst_included: false,
      payment_type: paymentType,
      // date_issued stays null until Send stamps it (same as job invoices).
      due_date: computeInvoiceDueDate({
        payment_type: paymentType,
        payment_terms: (client.payment_terms as string | null) ?? null,
        date_issued: null,
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
    actor_id: user!.id,
    actor_role: 'admin',
    action: 'invoice.created_monthly',
    entity_table: 'invoices',
    entity_id: invoice.id,
    before: null,
    after: {
      actor_email: user!.email,
      invoice_number: invoice.invoice_number,
      client_id: client.id,
      month: input.month,
      visits: built.lines.map((l) => ({ job_id: l.jobId, job_number: l.jobNumber, date: l.date, price: l.price, price_from_rate: l.priceFromRate })),
      base_price: built.total,
      rate_per_visit: input.ratePerVisit,
    },
  })

  revalidatePath('/portal/invoices')
  revalidatePath('/portal/jobs')
  redirect(`/portal/invoices/${invoice.id}`)
}
