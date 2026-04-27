'use server'

// Phase 5.5.12 — Quote → job setup wizard action.
//
// Replaces the previous "click and pray" path that called
// createJobFromQuote and immediately redirected with a draft job and
// no schedule, no contractor, no payment context.
//
// This action receives the wizard's collected operational details and
// inserts the job in one go, then advances the quote to `converted`
// and audits — same downstream behaviour as the legacy action so the
// workflow bar / proposal lock / share-link logic are untouched.
//
// The legacy `createJobFromQuote(quoteId)` is kept exported alongside
// for any path that still wants the old fallback (none in the UI as
// of 5.5.12, but it stays callable from server actions and admin
// scripts).

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

export interface JobSetupInput {
  scheduled_date?: string | null    // ISO date 'YYYY-MM-DD'
  scheduled_time?: string | null    // free text 'HH:MM' or '08:30 AM'
  duration_estimate?: string | null // free text label
  allowed_hours?: number | null
  contractor_id?: string | null
  contractor_price?: number | null  // optional hourly override
  contact_id?: string | null
  site_id?: string | null
  address?: string | null
  access_instructions?: string | null
  internal_notes?: string | null
  // Residential scope hints (carry-through to job)
  occupancy?: string | null
  pets?: string | null
  parking?: string | null
  stairs?: string | null
  condition_level?: string | null
  // Payment exception — required when payment_type='cash_sale' but
  // operator wants the job to proceed without prepayment.
  payment_override?: { allow: boolean; reason?: string | null }
}

export interface ReadyContractor {
  id: string
  full_name: string
  hourly_rate: number | null
  base_hourly_rate: number | null
  status: 'active' | 'pending_onboarding' | 'inactive'
  blocker?: string | null
}

// Used by the wizard to populate the worker dropdown. Returns ALL
// non-archived contractors with a derived `status` so the UI can
// render `pending_onboarding` ones disabled with a clear hint.
export async function listAssignableContractors(): Promise<ReadyContractor[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('contractors')
    .select('id, full_name, status, hourly_rate, base_hourly_rate, onboarding_status, trial_required, trial_status, access_disabled_at')
    .order('full_name')

  return ((data ?? []) as Array<{
    id: string; full_name: string; status: string | null
    hourly_rate: number | null; base_hourly_rate: number | null
    onboarding_status: string | null; trial_required: boolean | null; trial_status: string | null
    access_disabled_at: string | null
  }>).map((c) => {
    let derived: ReadyContractor['status'] = 'active'
    let blocker: string | null = null

    if (c.access_disabled_at || c.status === 'inactive') {
      derived = 'inactive'
      blocker = 'Contractor is inactive.'
    } else if (c.status === 'onboarding' || c.onboarding_status !== 'complete') {
      derived = 'pending_onboarding'
      blocker = 'Onboarding not complete.'
    } else if (c.trial_required && c.trial_status !== 'passed') {
      derived = 'pending_onboarding'
      blocker = 'Trial not passed yet.'
    } else if (c.status !== 'active' && c.status !== 'ready') {
      derived = 'pending_onboarding'
      blocker = 'Not yet active.'
    }

    return {
      id: c.id,
      full_name: c.full_name,
      hourly_rate: c.hourly_rate ?? null,
      base_hourly_rate: c.base_hourly_rate ?? null,
      status: derived,
      blocker,
    }
  })
}

// Worker rate lookup used by the wizard to display estimated labour
// cost as the operator picks a contractor. Returns null when no rate
// is set so the UI can show the "Rate not set" hint.
export async function getContractorRate(contractorId: string): Promise<{ hourly_rate: number | null }> {
  if (!contractorId) return { hourly_rate: null }
  const supabase = createClient()
  const { data } = await supabase
    .from('contractors')
    .select('hourly_rate, base_hourly_rate')
    .eq('id', contractorId)
    .maybeSingle()
  const r = data as { hourly_rate?: number | null; base_hourly_rate?: number | null } | null
  return { hourly_rate: r?.hourly_rate ?? r?.base_hourly_rate ?? null }
}

export async function createJobFromQuoteWithSetup(
  quoteId: string,
  setup: JobSetupInput,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()

  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select(`
      id, status, client_id, service_category, payment_type,
      service_address, notes, generated_scope,
      frequency, scope_size,
      scheduled_clean_date, estimated_hours,
      contact_id, site_id,
      property_type, bedrooms, bathrooms, condition_tags,
      occupancy, pets, parking, stairs, condition_level, access_notes,
      quote_number, version_number, is_latest_version,
      clients ( payment_type, payment_terms )
    `)
    .eq('id', quoteId)
    .single()

  if (qErr || !quote) return { error: `Quote not found: ${qErr?.message ?? 'missing row'}` }
  if (quote.status !== 'accepted') return { error: 'Only accepted quotes can be converted to a job.' }
  if (!quote.is_latest_version) return { error: 'Only the latest quote version can be converted to a job.' }

  // Pull both scope shapes so we can snapshot whichever applies.
  const [{ data: residentialItems }, { data: commercialScope }] = await Promise.all([
    supabase.from('quote_items').select('label, price, sort_order').eq('quote_id', quoteId).order('sort_order'),
    supabase.from('commercial_scope_items')
      .select('area_type, task_name, frequency_label, task_group, display_order, included')
      .eq('quote_id', quoteId).order('display_order'),
  ])

  const allowedHours = setup.allowed_hours ?? quote.estimated_hours ?? null

  const scopeSnapshot = {
    source_quote_id: quote.id,
    source_quote_number: quote.quote_number,
    source_version_number: quote.version_number,
    service_category: quote.service_category,
    frequency: quote.frequency,
    scope_size: quote.scope_size,
    estimated_hours: quote.estimated_hours,
    allowed_hours: allowedHours,
    generated_scope: quote.generated_scope,
    property_type: quote.property_type ?? null,
    bedrooms: quote.bedrooms ?? null,
    bathrooms: quote.bathrooms ?? null,
    condition_tags: quote.condition_tags ?? [],
    occupancy: setup.occupancy ?? quote.occupancy ?? null,
    pets: setup.pets ?? quote.pets ?? null,
    parking: setup.parking ?? quote.parking ?? null,
    stairs: setup.stairs ?? quote.stairs ?? null,
    condition_level: setup.condition_level ?? quote.condition_level ?? null,
    residential_items: (residentialItems ?? []).map((r: ResidentialItemRow) => ({
      label: r.label ?? '', price: r.price ?? 0, sort_order: r.sort_order ?? 0,
    })),
    commercial_scope: (commercialScope ?? [])
      .filter((r: CommercialScopeRow) => r.included !== false)
      .map((r: CommercialScopeRow) => ({
        area_type: r.area_type ?? '', task_name: r.task_name ?? '',
        frequency_label: r.frequency_label ?? '', task_group: r.task_group ?? null,
        display_order: r.display_order ?? 0,
      })),
    created_at: new Date().toISOString(),
  }

  // ── Payment status derivation ─────────────────────────────────────
  // Quote.payment_type values today are 'cash_sale' | 'on_account'
  // (5.5.11 maps client.payment_type='prepaid' → 'cash_sale' on quote
  // create). The job_status derivation:
  //   payment_type='cash_sale' + no override → status='draft',
  //                                              payment_status='awaiting_payment'
  //   payment_type='cash_sale' + override   → status='assigned' (or 'draft'
  //                                              if no contractor),
  //                                              payment_status='exception'
  //   payment_type='on_account'             → status='assigned' (or 'draft'),
  //                                              payment_status='on_account'
  const isPrepaid = quote.payment_type === 'cash_sale'
  const overrideAllowed = !!setup.payment_override?.allow
  const overrideReason  = setup.payment_override?.reason?.trim() || null

  let jobStatus: 'draft' | 'assigned' = setup.contractor_id ? 'assigned' : 'draft'
  let paymentStatus = 'on_account'
  if (isPrepaid && !overrideAllowed) {
    jobStatus = 'draft'
    paymentStatus = 'awaiting_payment'
  } else if (isPrepaid && overrideAllowed) {
    paymentStatus = 'exception'
  }

  const description = quote.generated_scope?.trim()
    || summariseCommercialScope(scopeSnapshot.commercial_scope)
    || quote.notes
    || null

  // ── Insert the job ────────────────────────────────────────────────
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .insert({
      client_id: quote.client_id,
      quote_id: quote.id,
      contact_id: setup.contact_id ?? quote.contact_id ?? null,
      site_id: setup.site_id ?? quote.site_id ?? null,
      title: jobTitleForQuote(quote.quote_number, quote.service_category),
      description,
      address: setup.address ?? quote.service_address ?? null,
      access_instructions: setup.access_instructions?.trim() || null,
      scheduled_date: setup.scheduled_date ?? quote.scheduled_clean_date ?? null,
      scheduled_time: setup.scheduled_time?.trim() || null,
      duration_estimate: setup.duration_estimate?.trim() || null,
      allowed_hours: allowedHours,
      contractor_id: setup.contractor_id ?? null,
      contractor_price: setup.contractor_price ?? null,
      internal_notes: setup.internal_notes?.trim() || quote.notes || null,
      status: jobStatus,
      payment_status: paymentStatus,
      source: 'quote',
      occupancy: setup.occupancy ?? quote.occupancy ?? null,
      pets: setup.pets ?? quote.pets ?? null,
      parking: setup.parking ?? quote.parking ?? null,
      stairs: setup.stairs ?? quote.stairs ?? null,
      condition_level: setup.condition_level ?? quote.condition_level ?? null,
      scope_snapshot: scopeSnapshot,
    })
    .select('id, job_number')
    .single()

  if (jErr || !job) {
    return { error: `Failed to create job: ${jErr?.message ?? 'insert returned no row'}` }
  }

  // ── Mark quote converted (mirrors the legacy path) ─────────────────
  const { data: priorQuote } = await supabase
    .from('quotes').select('status, accepted_at').eq('id', quoteId).single()
  await supabase.from('quotes').update({ status: 'converted' }).eq('id', quoteId)

  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'staff',
    action: 'quote.converted_to_job',
    entity_table: 'quotes',
    entity_id: quoteId,
    before: { status: priorQuote?.status ?? null },
    after: {
      status: 'converted',
      accepted_at_preserved: priorQuote?.accepted_at ?? null,
      job_id: job.id,
      job_number: job.job_number,
      job_status: jobStatus,
      payment_status: paymentStatus,
      payment_override_reason: overrideAllowed ? overrideReason : null,
      contractor_id: setup.contractor_id ?? null,
    },
  })

  redirect(`/portal/jobs/${job.id}`)
}

function jobTitleForQuote(quoteNumber: string | null, serviceCategory: string | null): string {
  const prefix = serviceCategory === 'commercial' ? 'Commercial clean' : 'Clean'
  return quoteNumber ? `${prefix} — ${quoteNumber}` : prefix
}

function summariseCommercialScope(items: Array<{ area_type: string; task_name: string }>): string {
  if (!items.length) return ''
  const areas = new Set<string>()
  for (const i of items) {
    if (i.area_type) areas.add(i.area_type)
  }
  if (areas.size === 0) return `${items.length} scoped tasks`
  return `${areas.size} area${areas.size === 1 ? '' : 's'} · ${items.length} task${items.length === 1 ? '' : 's'}`
}
