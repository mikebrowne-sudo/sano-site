'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export async function convertToInvoice(quoteId: string) {
  const supabase = createClient()

  // 1. Load quote
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select(`
      client_id, property_category, type_of_clean, service_type,
      frequency, scope_size, service_address, notes,
      base_price, discount, gst_included, payment_type,
      scheduled_clean_date, date_issued,
      is_price_overridden, override_price, override_reason, override_confirmed,
      override_confirmed_by, override_confirmed_at, calculated_price
    `)
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) {
    return { error: `Quote not found: ${qErr?.message}` }
  }

  // 2. Load quote items
  const { data: items } = await supabase
    .from('quote_items')
    .select('label, price, sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order')

  // 3. Calculate due_date
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

  // 4. Create invoice
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
      // Audit snapshot of pricing override at time of conversion
      is_price_overridden: quote.is_price_overridden ?? false,
      override_price: quote.override_price ?? null,
      override_reason: quote.override_reason ?? null,
      override_confirmed: quote.override_confirmed ?? false,
      override_confirmed_by: quote.override_confirmed_by ?? null,
      override_confirmed_at: quote.override_confirmed_at ?? null,
      calculated_price: quote.calculated_price ?? null,
    })
    .select('id')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message}` }
  }

  // 5. Copy quote items → invoice items
  if (items && items.length > 0) {
    const invoiceItems = items.map((it) => ({
      invoice_id: invoice.id,
      label: it.label,
      price: it.price,
      sort_order: it.sort_order,
    }))

    const { error: iiErr } = await supabase
      .from('invoice_items')
      .insert(invoiceItems)

    if (iiErr) {
      return { error: `Invoice created but items failed: ${iiErr.message}` }
    }
  }

  // 6. Mark quote as accepted
  await supabase
    .from('quotes')
    .update({ status: 'accepted' })
    .eq('id', quoteId)

  redirect(`/portal/invoices/${invoice.id}`)
}
