// Create the invoice for a job — the shared core behind the job page's
// "Create invoice" button and the bank reconcile "match a job that isn't
// invoiced yet" path. No redirect and no revalidation here (callers do that);
// returns the new invoice id or an error.
//
// Admin-only callers: the job page action and the reconcile action both check
// before calling.

import type { SupabaseClient } from '@supabase/supabase-js'
import { applyQuoteCardPayment } from '@/lib/card-payments'

export async function createInvoiceFromJobCore(
  supabase: SupabaseClient,
  jobId: string,
): Promise<{ invoiceId: string } | { error: string }> {

  // 1. Load job — service date sources (completed_at preferred over
  //    scheduled_date so a re-scheduled job invoices for the latest
  //    date, not the original quoted one) + payment context.
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .select('client_id, quote_id, invoice_id, title, description, address, scheduled_date, completed_at, job_price, payment_status, client_reference, requires_po')
    .eq('id', jobId)
    .single()

  if (jErr || !job) {
    return { error: `Job not found: ${jErr?.message}` }
  }

  if (job.invoice_id) {
    return { error: 'This job already has an invoice.' }
  }

  if (job.job_price == null) {
    return { error: 'Job price must be set before creating an invoice.' }
  }

  // Resolve the canonical service date once — used for both the
  // invoice's scheduled_clean_date column and the due-date helper.
  const { resolveServiceDate, computeInvoiceDueDate } = await import('@/lib/invoice-dates')
  const serviceDate = resolveServiceDate({
    job_completed_at: (job as { completed_at?: string | null }).completed_at ?? null,
    job_scheduled_date: (job as { scheduled_date?: string | null }).scheduled_date ?? null,
  })

  // Pull the client's payment terms so the due date respects the
  // configured terms. We also need the quote's payment_type when
  // available — payment_type lives on the quote, not the job.
  const [{ data: client }, { data: quote }, { data: quoteItems },
    { data: jobItemRows },
  ] = await Promise.all([
    supabase.from('clients').select('payment_type, payment_terms').eq('id', job.client_id).maybeSingle(),
    job.quote_id
      ? supabase.from('quotes').select('payment_type, property_category, type_of_clean, service_type, frequency, scope_size, notes').eq('id', job.quote_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Add-on lines from the source quote. Needed BEFORE the insert so the
    // invoice's base_price can exclude them: InvoiceDocument totals
    // base_price + items, so putting an add-on-inclusive job_price in base
    // AND listing the items would double-count.
    job.quote_id
      ? supabase.from('quote_items')
          .select('label, description, price, sort_order')
          .eq('quote_id', job.quote_id).order('sort_order')
      : Promise.resolve({ data: [] as unknown[] }),
    // EXTRAS added on the job itself (job_items). Unlike the quote add-ons
    // above these are NOT inside job_price, so they are additive: each becomes
    // a new invoice line and raises the total. Only source='added' qualifies —
    // a source='quote' row's charge is already in job_price and billing it
    // again would double-charge the client.
    supabase.from('job_items')
      .select('label, description, price, source, sort_order')
      .eq('job_id', jobId).eq('source', 'added').order('sort_order'),
  ])
  const addonRows = (quoteItems ?? []) as {
    label: string; description: string | null; price: number; sort_order: number
  }[]
  const addonsTotal = addonRows.reduce((sum, r) => sum + Number(r.price ?? 0), 0)
  // Extras added on the job. Additive to job_price, so they raise the invoice
  // total rather than being carved out of base_price like the quote add-ons.
  const extraRows = (jobItemRows ?? []) as {
    label: string; description: string | null; price: number | null; sort_order: number | null
  }[]
  const q = quote as {
    payment_type?: string | null
    property_category?: string | null
    type_of_clean?: string | null
    service_type?: string | null
    frequency?: string | null
    scope_size?: string | null
    notes?: string | null
  } | null
  const paymentType = (q?.payment_type as string | null)
    ?? (client?.payment_type as string | null)
    ?? 'on_account'
  const paymentTerms = (client?.payment_terms as string | null) ?? null

  // Service scope vs customer notes (same logic as the quote→invoice path).
  // Copy the quote's structured clean type so the invoice document shows a
  // real service heading + composed description UNDER the line item — not
  // "Cleaning service" with the scope dumped into Notes. When the quote
  // carries a clean type the document composes the description, so
  // service_description stays null (mirrors quote→invoice); otherwise (a
  // manual job with no quote) fall back to the job's own description so the
  // scope still renders under the line item. Notes is reserved for genuine
  // customer notes (carried from the quote), never the job scope.
  const qType = (q?.type_of_clean as string | null) ?? null
  const serviceDescription = qType ? null : (job.description?.trim() || null)
  const customerNotes = (q?.notes as string | null) ?? null

  // date_issued stays null at creation — it's set on Send. The due
  // date is computed only when both date_issued and a known terms
  // policy are available; otherwise it's left null so the invoice
  // detail can render "Due on send" or similar fallback copy.
  const dueDate = computeInvoiceDueDate({
    payment_type: paymentType,
    payment_terms: paymentTerms,
    date_issued: null,
    service_date: serviceDate,
  })

  // 2. Create invoice
  // Phase 5.5.16 fix — earlier code wrote `base_price = job.job_price`
  // AND inserted a single line_item with the SAME amount, so the
  // invoice total formula (base + sum(items) - discount, consistent
  // across detail / list / share / PDF / Stripe / email) double-
  // counted to 2× the real price. Items in this codebase are
  // ADDONS (see INV-0018: base $415 + waiting-time $60 = $475);
  // a job-based invoice has no addons, so we just write base_price
  // and skip the line item.
  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      client_id: job.client_id,
      quote_id: job.quote_id || null,
      job_id: jobId,
      service_address: job.address || null,
      // Phase quote-flow-clarity: scheduled_clean_date now reflects
      // the LATEST service date (completed_at ?? scheduled_date), not
      // the originally quoted date. This keeps re-scheduled jobs'
      // invoices honest.
      scheduled_clean_date: serviceDate,
      // job_price now carries the full quoted total (base + add-ons). The
      // document adds the itemised lines on top, so the invoice's base must
      // be the total MINUS those lines or they would be counted twice.
      base_price: job.job_price != null
        ? Math.max(0, Number(job.job_price) - addonsTotal)
        : null,
      // Structured clean type → real service heading + composed description.
      property_category: (q?.property_category as string | null) ?? null,
      type_of_clean: qType,
      service_type: (q?.service_type as string | null) ?? null,
      frequency: (q?.frequency as string | null) ?? null,
      scope_size: (q?.scope_size as string | null) ?? null,
      service_description: serviceDescription,
      notes: customerNotes,
      payment_type: paymentType,
      due_date: dueDate,
      // Phase 5D — auto-pull the PO / client reference from the job onto
      // the invoice (covers the Quote → Job → Invoice path).
      client_reference: (job as { client_reference?: string | null }).client_reference ?? null,
      requires_po: (job as { requires_po?: boolean | null }).requires_po ?? false,
    })
    .select('id')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message}` }
  }

  // 3a. Copy the source quote's add-on lines onto the invoice.
  //
  // This previously inserted nothing, on the reasoning that "a job-based
  // invoice has no add-on lines". That holds for a job created directly, but
  // not for one converted from a quote that had them: the customer agreed to
  // "clean $600 + carpet $300 + windows $180" and received an invoice showing
  // a single $600 line. job_price now carries the full total (see
  // lib/quote-total), so without the lines the invoice would show the right
  // amount with no explanation of what it covers.
  if (addonRows.length > 0) {
    const { error: iiErr } = await supabase.from('invoice_items').insert(
      addonRows.map((it) => ({
        invoice_id: invoice.id,
        label: it.label,
        description: it.description ?? null,
        price: it.price,
        sort_order: it.sort_order,
      })),
    )
    if (iiErr) {
      return { error: `Invoice created but add-on lines failed: ${iiErr.message}` }
    }
  }

  // 3a-ii. Append the job's EXTRAS as further invoice lines.
  //
  // These are the carpet clean found on site: work agreed after the job was
  // created, so it is in neither the quote nor job_price. Each becomes a new
  // line and raises the invoice total by its price — which is the whole point,
  // and the opposite of the quote add-ons above, whose total is carved OUT of
  // base_price because job_price already contains them.
  //
  // sort_order continues past the quote lines so the invoice reads in the order
  // the work was agreed: quoted items first, then what was added on the day.
  //
  // The contractor who did the extra is deliberately NOT named on the invoice,
  // and neither is what they were paid. The client bought Sano.
  if (extraRows.length > 0) {
    const baseSort = addonRows.length > 0
      ? Math.max(...addonRows.map((r) => Number(r.sort_order ?? 0))) + 1
      : 0
    const { error: exErr } = await supabase.from('invoice_items').insert(
      extraRows.map((it, i) => ({
        invoice_id: invoice.id,
        label: it.label,
        description: it.description ?? null,
        price: Number(it.price ?? 0),
        sort_order: baseSort + i,
      })),
    )
    if (exErr) {
      return { error: `Invoice created but the job's extras failed to bill: ${exErr.message}` }
    }
  }

  // 3b. Link invoice to job and set status to invoiced. payment_status moves
  // to 'invoice_sent' to reflect the new state.
  await supabase
    .from('jobs')
    .update({ invoice_id: invoice.id, status: 'invoiced', payment_status: 'invoice_sent' })
    .eq('id', jobId)

  // A customer who paid this quote by card upfront: mark the invoice paid.
  const cardPaid = await applyQuoteCardPayment(supabase as never, invoice.id as string)
  if (cardPaid.applied) await supabase.from('jobs').update({ payment_status: 'paid' }).eq('id', jobId)

  return { invoiceId: invoice.id as string }
}
