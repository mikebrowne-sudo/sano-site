'use server'

import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

interface AddonInput {
  label: string
  price: number
  sort_order: number
}

interface UpdateQuoteInput {
  id: string
  client_id: string
  status: string
  date_issued?: string
  valid_until?: string
  property_category?: string
  type_of_clean?: string
  service_type?: string
  frequency?: string
  scope_size?: string
  service_address?: string
  preferred_dates?: string
  scheduled_clean_date?: string
  notes?: string
  base_price: number
  discount: number
  gst_included: boolean
  payment_type?: string
  addons: AddonInput[]
}

export async function updateQuote(input: UpdateQuoteInput) {
  const supabase = createClient()

  // 1. Update quote row
  const { error: quoteErr } = await supabase
    .from('quotes')
    .update({
      client_id: input.client_id,
      status: input.status,
      date_issued: input.date_issued || null,
      valid_until: input.valid_until || null,
      property_category: input.property_category || null,
      type_of_clean: input.type_of_clean || null,
      service_type: input.service_type || null,
      frequency: input.frequency || null,
      scope_size: input.scope_size || null,
      service_address: input.service_address || null,
      preferred_dates: input.preferred_dates || null,
      scheduled_clean_date: input.scheduled_clean_date || null,
      notes: input.notes || null,
      base_price: input.base_price,
      discount: input.discount,
      gst_included: input.gst_included,
      payment_type: input.payment_type || 'cash_sale',
    })
    .eq('id', input.id)

  if (quoteErr) {
    return { error: `Failed to update quote: ${quoteErr.message}` }
  }

  // 2. Replace quote_items — delete old, insert new
  const { error: deleteErr } = await supabase
    .from('quote_items')
    .delete()
    .eq('quote_id', input.id)

  if (deleteErr) {
    return { error: `Failed to clear old add-ons: ${deleteErr.message}` }
  }

  if (input.addons.length > 0) {
    const items = input.addons.map((a) => ({
      quote_id: input.id,
      label: a.label,
      price: a.price,
      sort_order: a.sort_order,
    }))

    const { error: insertErr } = await supabase
      .from('quote_items')
      .insert(items)

    if (insertErr) {
      return { error: `Quote updated but add-ons failed: ${insertErr.message}` }
    }
  }

  revalidatePath(`/portal/quotes/${input.id}`)
  revalidatePath('/portal/quotes')
  return { success: true }
}

// ── Send quote by email ───────────────────────────────────────

interface SendQuoteInput {
  quote_id: string
  quote_number: string
  to: string
  subject: string
  message: string
  print_url: string
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function sendQuoteEmail(input: SendQuoteInput) {
  if (!input.to.trim()) {
    return { error: 'Recipient email is required.' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const html = `
    <p>${esc(input.message).replace(/\n/g, '<br>')}</p>
    <p><a href="${esc(input.print_url)}" style="display:inline-block;padding:10px 20px;background:#076653;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View Quote</a></p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
  `

  const { error: emailErr } = await resend.emails.send({
    from: 'Sano <noreply@sano.nz>',
    to: input.to.trim(),
    subject: input.subject,
    html,
  })

  if (emailErr) {
    return { error: `Failed to send email: ${emailErr.message}` }
  }

  // Update quote: status → sent, set date_issued if empty, set valid_until if empty
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: quote } = await supabase
    .from('quotes')
    .select('date_issued, valid_until')
    .eq('id', input.quote_id)
    .single()

  const effectiveIssued = quote?.date_issued || today
  const effectiveValidUntil = quote?.valid_until || addDaysISO(effectiveIssued, 30)

  await supabase
    .from('quotes')
    .update({
      status: 'sent',
      date_issued: effectiveIssued,
      valid_until: effectiveValidUntil,
    })
    .eq('id', input.quote_id)

  revalidatePath(`/portal/quotes/${input.quote_id}`)
  revalidatePath('/portal/quotes')
  return { success: true }
}

export async function markQuoteAccepted(quoteId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('quotes')
    .update({ status: 'accepted' })
    .eq('id', quoteId)

  if (error) {
    return { error: `Failed to update quote: ${error.message}` }
  }

  revalidatePath(`/portal/quotes/${quoteId}`)
  revalidatePath('/portal/quotes')
  return { success: true }
}
