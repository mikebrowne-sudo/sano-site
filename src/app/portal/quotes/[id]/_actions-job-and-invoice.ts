'use server'

// Phase D — combined "Create Job + Invoice" path.
//
// Creates BOTH an invoice and a job from an accepted quote in one
// server action. Matches the real-world property-manager flow:
// organise the work now, but also send the invoice because the
// client pays up-front.
//
// Order of operations:
//   1. Invoice (same fields convertToInvoice uses — scope-level
//      pricing + universal billing).
//   2. Copy quote_items → invoice_items (residential only).
//   3. Job — linked to the invoice via invoice_id, carries the
//      scope snapshot, payment_status = 'payment_pending'.
//   4. Mark the quote as `converted` + audit log.
//   5. Redirect to the job page (where the user can assign a
//      contractor next).
//
// Invoice creation logic is intentionally inlined (not shared with
// _actions-invoice.ts) — the invoice-only path has a distinct
// redirect target and slightly different audit trail. Duplicating
// ~40 lines of inserts is less risky than extracting a helper that
// both paths would branch inside.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

type ResidentialItemRow = {
  label: string | null
  price: number | null
  sort_order: number | null
}

type CommercialScopeRow = {
  area_type: string | null
  task_name: string | null
  frequency_label: string | null
  task_group: string | null
  display_order: number | null
  included: boolean | null
}

export async function createJobAndInvoiceFromQuote(quoteId: string) {
  const supabase = createClient()

  // 1. Load quote — both invoice fields + job-snapshot fields.
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select(`
      id, status, client_id, service_category,
      property_category, type_of_clean, service_type,
      frequency, scope_size, service_address, notes, generated_scope,
      base_price, discount, gst_included, payment_type,
      scheduled_clean_date, date_issued, estimated_hours,
      is_price_overridden, override_price, override_reason, override_confirmed,
      override_confirmed_by, override_confirmed_at, calculated_price,
      contact_name, contact_email, contact_phone,
      accounts_contact_name, accounts_email,
      client_reference, requires_po,
      quote_number, version_number, is_latest_version
    `)
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) {
    return { error: `Quote not found: ${qErr?.message ?? 'missing row'}` }
  }
  if (quote.status !== 'accepted') {
    return { error: 'Only accepted quotes can be converted.' }
  }
  if (!quote.is_latest_version) {
    return { error: 'Only the latest quote version can be converted.' }
  }

  // 2. Pull scope + invoice items in parallel.
  const [
    { data: residentialItems },
    { data: commercialScope },
  ] = await Promise.all([
    supabase
      .from('quote_items')
      .select('label, price, sort_order')
      .eq('quote_id', quoteId)
      .order('sort_order'),
    supabase
      .from('commercial_scope_items')
      .select('area_type, task_name, frequency_label, task_group, display_order, included')
      .eq('quote_id', quoteId)
      .order('display_order'),
  ])

  // 3. Invoice — mirrors convertToInvoice field-for-field so the
  // invoice detail page behaves identically whether it was created
  // via this path or the invoice-only path.
  const today = new Date().toISOString().slice(0, 10)
  const dateIssued = quote.date_issued || today
  let dueDate: string | null = null
  if ((quote.payment_type ?? 'cash_sale') === 'cash_sale' && quote.scheduled_clean_date) {
    const d = new Date(quote.scheduled_clean_date)
    d.setDate(d.getDate() - 1)
    dueDate = d.toISOString().slice(0, 10)
  } else if ((quote.payment_type ?? 'cash_sale') === 'on_account') {
    const d = new Date(dateIssued)
    d.setDate(d.getDate() + 14)
    dueDate = d.toISOString().slice(0, 10)
  }

  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      quote_id: quoteId,
      client_id: quote.client_id,
      property_category: quote.property_category,
      type_of_clean: quote.type_of_clean,
      service_type: quote.service_type,
      frequency: quote.frequency,
      scope_size: quote.scope_size,
      service_address: quote.service_address,
      notes: quote.notes,
      base_price: quote.base_price,
      discount: quote.discount,
      gst_included: quote.gst_included,
      payment_type: quote.payment_type,
      scheduled_clean_date: quote.scheduled_clean_date,
      date_issued: dateIssued,
      due_date: dueDate,
      is_price_overridden: quote.is_price_overridden ?? false,
      override_price: quote.override_price ?? null,
      override_reason: quote.override_reason ?? null,
      override_confirmed: quote.override_confirmed ?? false,
      override_confirmed_by: quote.override_confirmed_by ?? null,
      override_confirmed_at: quote.override_confirmed_at ?? null,
      calculated_price: quote.calculated_price ?? null,
      contact_name:          quote.contact_name          ?? null,
      contact_email:         quote.contact_email         ?? null,
      contact_phone:         quote.contact_phone         ?? null,
      accounts_contact_name: quote.accounts_contact_name ?? null,
      accounts_email:        quote.accounts_email        ?? null,
      client_reference:      quote.client_reference      ?? null,
      requires_po:           quote.requires_po           ?? false,
    })
    .select('id, invoice_number')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message ?? 'insert returned no row'}` }
  }

  // 4. Copy residential items to invoice_items.
  if (residentialItems && residentialItems.length > 0) {
    const invoiceItems = residentialItems.map((it: ResidentialItemRow) => ({
      invoice_id: invoice.id,
      label: it.label ?? '',
      price: it.price ?? 0,
      sort_order: it.sort_order ?? 0,
    }))
    const { error: iiErr } = await supabase.from('invoice_items').insert(invoiceItems)
    if (iiErr) {
      return { error: `Invoice created but items failed: ${iiErr.message}` }
    }
  }

  // 5. Build job snapshot — identical shape to createJobFromQuote.
  const scopeSnapshot = {
    source_quote_id: quote.id,
    source_quote_number: quote.quote_number,
    source_version_number: quote.version_number,
    service_category: quote.service_category,
    frequency: quote.frequency,
    scope_size: quote.scope_size,
    estimated_hours: quote.estimated_hours,
    allowed_hours: quote.estimated_hours,
    generated_scope: quote.generated_scope,
    residential_items: (residentialItems ?? []).map((r: ResidentialItemRow) => ({
      label: r.label ?? '',
      price: r.price ?? 0,
      sort_order: r.sort_order ?? 0,
    })),
    commercial_scope: (commercialScope ?? [])
      .filter((r: CommercialScopeRow) => r.included !== false)
      .map((r: CommercialScopeRow) => ({
        area_type: r.area_type ?? '',
        task_name: r.task_name ?? '',
        frequency_label: r.frequency_label ?? '',
        task_group: r.task_group ?? null,
        display_order: r.display_order ?? 0,
      })),
    created_at: new Date().toISOString(),
  }

  const title = quote.service_category === 'commercial'
    ? (quote.quote_number ? `Commercial clean — ${quote.quote_number}` : 'Commercial clean')
    : (quote.quote_number ? `Clean — ${quote.quote_number}` : 'Clean')

  const description = quote.generated_scope?.trim()
    || (scopeSnapshot.commercial_scope.length
      ? `${new Set(scopeSnapshot.commercial_scope.map((i) => i.area_type).filter(Boolean)).size} area(s) · ${scopeSnapshot.commercial_scope.length} task(s)`
      : '')
    || quote.notes
    || null

  // 6. Job — linked to the invoice + payment_status = payment_pending
  // so the job page shows the client owes money.
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .insert({
      client_id: quote.client_id,
      quote_id: quote.id,
      invoice_id: invoice.id,
      title,
      description,
      address: quote.service_address ?? null,
      scheduled_date: quote.scheduled_clean_date ?? null,
      allowed_hours: quote.estimated_hours ?? null,
      internal_notes: quote.notes ?? null,
      status: 'draft',
      payment_status: 'payment_pending',
      scope_snapshot: scopeSnapshot,
    })
    .select('id, job_number')
    .single()

  if (jErr || !job) {
    return { error: `Invoice created but job failed: ${jErr?.message ?? 'insert returned no row'}` }
  }

  // 7. Mark quote as converted + audit log.
  const { data: priorQuote } = await supabase
    .from('quotes')
    .select('status, accepted_at')
    .eq('id', quoteId)
    .single()

  await supabase
    .from('quotes')
    .update({ status: 'converted' })
    .eq('id', quoteId)

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'staff',
    action: 'quote.converted_to_job_and_invoice',
    entity_table: 'quotes',
    entity_id: quoteId,
    before: { status: priorQuote?.status ?? null },
    after: {
      status: 'converted',
      accepted_at_preserved: priorQuote?.accepted_at ?? null,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      job_id: job.id,
      job_number: job.job_number,
    },
  })

  redirect(`/portal/jobs/${job.id}`)
}
