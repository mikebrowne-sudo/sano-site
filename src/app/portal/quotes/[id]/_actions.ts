'use server'

import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import type { PricingBreakdown, PricingMode } from '@/lib/quote-pricing'
import { validateCreateQuoteOverride } from '../new/_actions-validation'

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
  // Structured builder fields
  service_category?: string
  service_type_code?: string
  property_type?: string
  bedrooms?: number
  bathrooms?: number
  site_type?: string
  areas_included?: string[]
  condition_tags?: string[]
  addons_wording?: string[]
  generated_scope?: string
  description_edited?: boolean
  service_address?: string
  preferred_dates?: string
  scheduled_clean_date?: string
  notes?: string
  base_price: number
  discount: number
  gst_included: boolean
  payment_type?: string
  addons: AddonInput[]
  pricing_mode?: PricingMode
  estimated_hours?: number
  pricing_breakdown?: PricingBreakdown
  is_price_overridden?: boolean
  override_price?: number | null
  override_reason?: string | null
  override_confirmed?: boolean
  calculated_price?: number | null

  // Phase 5D — universal contact / billing / reference fields
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  accounts_contact_name?: string | null
  accounts_email?: string | null
  client_reference?: string | null
  requires_po?: boolean
}

export async function updateQuote(input: UpdateQuoteInput) {
  const supabase = createClient()

  const overrideErr = validateCreateQuoteOverride({
    is_price_overridden: input.is_price_overridden ?? false,
    override_price: input.override_price ?? null,
    override_reason: input.override_reason ?? null,
    override_confirmed: input.override_confirmed ?? false,
  })
  if (overrideErr) return { error: overrideErr }

  // Load existing override audit fields so we can preserve them when the
  // override is unchanged (or stamp them when it transitions from off to on).
  const { data: existing, error: existingErr } = await supabase
    .from('quotes')
    .select('is_price_overridden, override_confirmed_by, override_confirmed_at')
    .eq('id', input.id)
    .single()

  if (existingErr || !existing) {
    return { error: `Quote not found or could not be loaded: ${existingErr?.message ?? 'missing row'}` }
  }

  const wasOverridden = existing?.is_price_overridden ?? false
  const isOverridden = input.is_price_overridden ?? false
  const { data: { user } } = await supabase.auth.getUser()

  let overrideConfirmedBy: string | null = existing?.override_confirmed_by ?? null
  let overrideConfirmedAt: string | null = existing?.override_confirmed_at ?? null

  if (isOverridden && !wasOverridden) {
    // Newly overridden (including re-activation after toggling off) — stamp fresh audit fields.
    // The previous override_confirmed_by/at, if any, is intentionally overwritten: the audit
    // record reflects whoever made the decision currently in effect.
    overrideConfirmedBy = user?.id ?? null
    overrideConfirmedAt = user?.id ? new Date().toISOString() : null
  }
  // If isOverridden && wasOverridden: preserve existing stamps (no re-stamp on edit).
  // If !isOverridden: preserve existing stamps as-is per design (no reset-on-save).

  // 1. Update quote row
  const { error: quoteErr } = await supabase
    .from('quotes')
    .update({
      client_id: input.client_id,
      status: input.status,
      date_issued: input.date_issued || null,
      valid_until: input.valid_until || null,
      property_category: input.property_category ?? null,
      type_of_clean: input.type_of_clean ?? null,
      service_type: input.service_type ?? null,
      frequency: input.frequency || null,
      scope_size: input.scope_size ?? null,
      // Structured builder fields
      service_category: input.service_category || null,
      service_type_code: input.service_type_code || null,
      property_type: input.property_type || null,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      site_type: input.site_type || null,
      areas_included: input.areas_included ?? [],
      condition_tags: input.condition_tags ?? [],
      addons_wording: input.addons_wording ?? [],
      generated_scope: input.generated_scope || null,
      description_edited: input.description_edited ?? false,
      service_address: input.service_address || null,
      preferred_dates: input.preferred_dates || null,
      scheduled_clean_date: input.scheduled_clean_date || null,
      notes: input.notes || null,
      base_price: input.base_price,
      pricing_mode: input.pricing_mode ?? null,
      estimated_hours: input.estimated_hours ?? null,
      pricing_breakdown: input.pricing_breakdown ?? null,
      is_price_overridden: input.is_price_overridden ?? false,
      override_price: input.override_price ?? null,
      override_reason: input.override_reason ?? null,
      override_confirmed: input.override_confirmed ?? false,
      override_confirmed_by: overrideConfirmedBy,
      override_confirmed_at: overrideConfirmedAt,
      calculated_price: input.calculated_price ?? null,
      discount: input.discount,
      gst_included: input.gst_included,
      payment_type: input.payment_type || 'cash_sale',
      // Phase 5D — universal contact / billing / reference fields
      contact_name:           input.contact_name           ?? null,
      contact_email:          input.contact_email          ?? null,
      contact_phone:          input.contact_phone          ?? null,
      accounts_contact_name:  input.accounts_contact_name  ?? null,
      accounts_email:         input.accounts_email         ?? null,
      client_reference:       input.client_reference       ?? null,
      requires_po:            input.requires_po            ?? false,
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

  const supabase = createClient()

  // Load existing quote state first so we can preserve date_issued / valid_until
  // and dedupe rapid double-clicks (same tab or concurrent tabs).
  const { data: quote, error: loadErr } = await supabase
    .from('quotes')
    .select('date_issued, valid_until, sent_at')
    .eq('id', input.quote_id)
    .single()

  if (loadErr || !quote) {
    return { error: `Quote not found: ${loadErr?.message ?? 'unknown'}` }
  }

  // Dedupe: if this quote was already sent within the last 5 seconds, skip both
  // the email and the DB update. Protects against duplicate emails from concurrent
  // requests. The client already disables the button during the in-flight request.
  if (quote.sent_at) {
    const sentAtMs = new Date(quote.sent_at as string).getTime()
    if (Number.isFinite(sentAtMs) && Date.now() - sentAtMs < 5000) {
      return { success: true }
    }
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

  // Email failed → do NOT update the quote status.
  if (emailErr) {
    return { error: `Failed to send email: ${emailErr.message}` }
  }

  // Email sent → update status and stamps.
  const today = new Date().toISOString().slice(0, 10)
  const effectiveIssued = quote.date_issued || today
  const effectiveValidUntil = quote.valid_until || addDaysISO(effectiveIssued as string, 30)
  const sentAtIso = new Date().toISOString()

  const { error: updateErr } = await supabase
    .from('quotes')
    .update({
      status: 'sent',
      date_issued: effectiveIssued,
      valid_until: effectiveValidUntil,
      sent_at: sentAtIso,
    })
    .eq('id', input.quote_id)

  if (updateErr) {
    return { error: `Email sent but failed to update quote status: ${updateErr.message}` }
  }

  revalidatePath(`/portal/quotes/${input.quote_id}`)
  revalidatePath('/portal/quotes')
  return { success: true }
}

export async function markQuoteAccepted(quoteId: string) {
  const supabase = createClient()

  // Load current state so we can preserve an existing accepted_at and short-circuit
  // if already accepted.
  const { data: current } = await supabase
    .from('quotes')
    .select('status, accepted_at, share_token')
    .eq('id', quoteId)
    .single()

  if (current?.status === 'accepted' && current.accepted_at) {
    revalidatePath(`/portal/quotes/${quoteId}`)
    revalidatePath('/portal/quotes')
    return { success: true, alreadyAccepted: true }
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: current?.accepted_at || now })
    .eq('id', quoteId)

  if (error) {
    return { error: `Failed to update quote: ${error.message}` }
  }

  revalidatePath(`/portal/quotes/${quoteId}`)
  revalidatePath('/portal/quotes')
  if (current?.share_token) {
    revalidatePath(`/share/quote/${current.share_token}`)
  }
  return { success: true }
}
