'use server'

// Commercial Quote Engine — server actions (Phase 0 foundation).
//
// These actions operate on an existing quote (quote_id required). They
// are additive: the existing createQuote / updateQuote / conversion
// flows in new/_actions.ts and [id]/_actions.ts are not changed.
//
// Exposed:
//   saveCommercialDetails(quote_id, input)  — upsert commercial_quote_details
//   saveCommercialScope(quote_id, items)    — replace commercial_scope_items
//   softDeleteQuote(input)                  — admin-only soft-delete with audit trail

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import type {
  CommercialQuoteDetails,
  CommercialScopeItem,
  MarginTier,
  QuantityType,
  ScopeFrequency,
  ScopeInputMode,
} from '@/lib/commercialQuote'
import { isMarginTier, isSectorCategory, isContractTerm, isCleaningStandard } from '@/lib/commercialQuote'

const ADMIN_EMAIL = 'michael@sano.nz'

// ── saveCommercialDetails ──────────────────────────────────────────

export interface CommercialDetailsInput {
  sector_category: string

  sector_subtype?: string | null
  building_type?: string | null
  service_days?: string[] | null
  service_window?: string | null
  access_requirements?: string | null
  consumables_by?: string | null
  occupancy_level?: string | null
  traffic_level?: string | null

  total_area_m2?: number | null
  carpet_area_m2?: number | null
  hard_floor_area_m2?: number | null
  floor_count?: number | null
  toilets_count?: number | null
  urinals_count?: number | null
  showers_count?: number | null
  basins_count?: number | null
  kitchens_count?: number | null
  desks_count?: number | null
  offices_count?: number | null
  meeting_rooms_count?: number | null
  reception_count?: number | null

  corridors_stairs_notes?: string | null
  external_glass_notes?: string | null
  compliance_notes?: string | null
  assumptions?: string | null
  exclusions?: string | null

  sector_fields?: Record<string, unknown>

  selected_margin_tier?: string | null
  labour_cost_basis?: number | null
  estimated_service_hours?: number | null
  estimated_weekly_hours?: number | null
  estimated_monthly_hours?: number | null

  // Phase 5A — commercial-only tender fields. Phase 5D moved
  // contact_name / contact_email / contact_phone / accounts_email /
  // accounts_contact_name / client_reference / requires_po up to
  // the universal `quotes` table — they no longer flow through
  // saveCommercialDetails.
  contract_term?: string | null
  notice_period_days?: number | null
  service_start_date?: string | null

  cleaning_standard?: string | null

  security_sensitive?: boolean | null
  induction_required?: boolean | null
  restricted_areas?: boolean | null
  restricted_areas_notes?: string | null
}

export type SaveCommercialDetailsResult =
  | { ok: true; details: CommercialQuoteDetails }
  | { error: string }

export async function saveCommercialDetails(
  quote_id: string,
  input: CommercialDetailsInput,
): Promise<SaveCommercialDetailsResult> {
  const supabase = createClient()

  if (!quote_id) return { error: 'quote_id is required.' }
  if (!isSectorCategory(input.sector_category)) {
    return { error: `Invalid sector_category: ${input.sector_category}` }
  }
  if (input.selected_margin_tier != null && !isMarginTier(input.selected_margin_tier)) {
    return { error: `Invalid selected_margin_tier: ${input.selected_margin_tier}` }
  }
  if (input.contract_term != null && input.contract_term !== '' && !isContractTerm(input.contract_term)) {
    return { error: `Invalid contract_term: ${input.contract_term}` }
  }
  if (input.cleaning_standard != null && input.cleaning_standard !== '' && !isCleaningStandard(input.cleaning_standard)) {
    return { error: `Invalid cleaning_standard: ${input.cleaning_standard}` }
  }

  // Verify the quote exists, is commercial, and isn't soft-deleted.
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .select('id, service_category, deleted_at')
    .eq('id', quote_id)
    .single()
  if (quoteErr || !quote) return { error: 'Quote not found.' }
  if (quote.deleted_at) return { error: 'Quote has been deleted and cannot be edited.' }
  if (quote.service_category !== 'commercial') {
    return { error: 'saveCommercialDetails requires a commercial quote (service_category=commercial).' }
  }

  const now = new Date().toISOString()
  const payload = {
    quote_id,
    sector_category: input.sector_category,
    sector_subtype: input.sector_subtype ?? null,
    building_type: input.building_type ?? null,
    service_days: input.service_days ?? null,
    service_window: input.service_window ?? null,
    access_requirements: input.access_requirements ?? null,
    consumables_by: input.consumables_by ?? null,
    occupancy_level: input.occupancy_level ?? null,
    traffic_level: input.traffic_level ?? null,
    total_area_m2: input.total_area_m2 ?? null,
    carpet_area_m2: input.carpet_area_m2 ?? null,
    hard_floor_area_m2: input.hard_floor_area_m2 ?? null,
    floor_count: input.floor_count ?? null,
    toilets_count: input.toilets_count ?? null,
    urinals_count: input.urinals_count ?? null,
    showers_count: input.showers_count ?? null,
    basins_count: input.basins_count ?? null,
    kitchens_count: input.kitchens_count ?? null,
    desks_count: input.desks_count ?? null,
    offices_count: input.offices_count ?? null,
    meeting_rooms_count: input.meeting_rooms_count ?? null,
    reception_count: input.reception_count ?? null,
    corridors_stairs_notes: input.corridors_stairs_notes ?? null,
    external_glass_notes: input.external_glass_notes ?? null,
    compliance_notes: input.compliance_notes ?? null,
    assumptions: input.assumptions ?? null,
    exclusions: input.exclusions ?? null,
    sector_fields: input.sector_fields ?? {},
    selected_margin_tier: (input.selected_margin_tier as MarginTier | null) ?? null,
    labour_cost_basis: input.labour_cost_basis ?? null,
    estimated_service_hours: input.estimated_service_hours ?? null,
    estimated_weekly_hours: input.estimated_weekly_hours ?? null,
    estimated_monthly_hours: input.estimated_monthly_hours ?? null,

    // Phase 5A — commercial-only tender fields. Contact / billing /
    // reference fields moved to the quotes table in Phase 5D and are
    // no longer written to commercial_quote_details by this action.
    contract_term:          input.contract_term          ?? null,
    notice_period_days:     input.notice_period_days     ?? null,
    service_start_date:     input.service_start_date     ?? null,
    cleaning_standard:      input.cleaning_standard      ?? null,
    security_sensitive:     input.security_sensitive     ?? false,
    induction_required:     input.induction_required     ?? false,
    restricted_areas:       input.restricted_areas       ?? false,
    restricted_areas_notes: input.restricted_areas_notes ?? null,

    updated_at: now,
  }

  const { data, error } = await supabase
    .from('commercial_quote_details')
    .upsert(payload, { onConflict: 'quote_id' })
    .select('*')
    .single()

  if (error || !data) {
    return { error: `Failed to save commercial details: ${error?.message ?? 'unknown'}` }
  }

  revalidatePath(`/portal/quotes/${quote_id}`)
  return { ok: true, details: data as CommercialQuoteDetails }
}

// ── saveCommercialScope ────────────────────────────────────────────
// Replace-strategy: delete rows that aren't in the incoming set, update
// those that match, insert new ones. Frontend sends the full list.

export interface CommercialScopeItemInput {
  id?: string
  area_type?: string | null
  task_group?: string | null
  task_name: string
  frequency?: ScopeFrequency | null
  quantity_type?: QuantityType | null
  quantity_value?: number | null
  unit_minutes?: number | null
  production_rate?: number | null
  input_mode?: ScopeInputMode
  included?: boolean
  notes?: string | null
  display_order?: number
}

export type SaveCommercialScopeResult =
  | { ok: true; items: CommercialScopeItem[] }
  | { error: string }

export async function saveCommercialScope(
  quote_id: string,
  items: CommercialScopeItemInput[],
): Promise<SaveCommercialScopeResult> {
  const supabase = createClient()

  if (!quote_id) return { error: 'quote_id is required.' }

  // Verify quote exists and isn't deleted.
  const { data: quote, error: quoteErr } = await supabase
    .from('quotes')
    .select('id, deleted_at')
    .eq('id', quote_id)
    .single()
  if (quoteErr || !quote) return { error: 'Quote not found.' }
  if (quote.deleted_at) return { error: 'Quote has been deleted and cannot be edited.' }

  // Validate inputs minimally
  for (const item of items) {
    if (!item.task_name || !item.task_name.trim()) {
      return { error: 'Each scope item needs a task_name.' }
    }
  }

  // Load existing rows' ids so we know what to delete vs update.
  const { data: existing, error: exErr } = await supabase
    .from('commercial_scope_items')
    .select('id')
    .eq('quote_id', quote_id)
  if (exErr) return { error: `Failed to load scope items: ${exErr.message}` }

  const existingIds = new Set((existing ?? []).map((r) => r.id))
  const incomingIds = new Set(items.filter((i) => i.id).map((i) => i.id!))

  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id))

  const normalise = (i: CommercialScopeItemInput, idx: number) => ({
    quote_id,
    area_type: i.area_type ?? null,
    task_group: i.task_group ?? null,
    task_name: i.task_name.trim(),
    frequency: i.frequency ?? null,
    quantity_type: i.quantity_type ?? null,
    quantity_value: i.quantity_value ?? null,
    unit_minutes: i.unit_minutes ?? null,
    production_rate: i.production_rate ?? null,
    input_mode: i.input_mode ?? 'measured',
    included: i.included ?? true,
    notes: i.notes ?? null,
    display_order: i.display_order ?? idx,
  })

  const toUpdate = items
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => i.id && existingIds.has(i.id))
    .map(({ i, idx }) => ({ id: i.id!, ...normalise(i, idx) }))

  const toInsert = items
    .map((i, idx) => ({ i, idx }))
    .filter(({ i }) => !i.id)
    .map(({ i, idx }) => normalise(i, idx))

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('commercial_scope_items')
      .delete()
      .in('id', toDelete)
    if (delErr) return { error: `Failed to delete stale scope items: ${delErr.message}` }
  }
  if (toUpdate.length > 0) {
    const { error: upErr } = await supabase
      .from('commercial_scope_items')
      .upsert(toUpdate)
    if (upErr) return { error: `Failed to update scope items: ${upErr.message}` }
  }
  if (toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from('commercial_scope_items')
      .insert(toInsert)
    if (insErr) return { error: `Failed to insert scope items: ${insErr.message}` }
  }

  const { data: fresh, error: freshErr } = await supabase
    .from('commercial_scope_items')
    .select('*')
    .eq('quote_id', quote_id)
    .order('display_order')
  if (freshErr) return { error: `Saved but failed to reload: ${freshErr.message}` }

  revalidatePath(`/portal/quotes/${quote_id}`)
  return { ok: true, items: (fresh ?? []) as CommercialScopeItem[] }
}

// ── softDeleteQuote ────────────────────────────────────────────────
// Admin-only. Block + confirm pattern: refuses when linked to
// invoices / jobs unless the caller explicitly sets confirm_linked.
// Writes a record_snapshots row + audit_log entry on every delete.

export interface SoftDeleteQuoteInput {
  quote_id: string
  confirm_linked?: boolean
}

export type SoftDeleteQuoteResult =
  | { ok: true }
  | {
      error: string
      reason?:
        | 'not_authenticated'
        | 'not_admin'
        | 'not_found'
        | 'already_deleted'
        | 'blocked_status'
        | 'linked_records'
      linked?: { invoice_ids: string[]; job_ids: string[] }
    }

export async function softDeleteQuote(
  input: SoftDeleteQuoteInput,
): Promise<SoftDeleteQuoteResult> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', reason: 'not_authenticated' }
  if (user.email !== ADMIN_EMAIL) {
    return { error: 'Only admin can delete quotes.', reason: 'not_admin' }
  }

  if (!input.quote_id) return { error: 'quote_id is required.' }

  // Load current row snapshot BEFORE the mutation.
  const { data: current, error: curErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', input.quote_id)
    .single()
  if (curErr || !current) return { error: 'Quote not found.', reason: 'not_found' }

  if (current.deleted_at != null) {
    return { ok: true } // idempotent
  }
  if (current.status === 'sent' || current.status === 'accepted') {
    return {
      error: `Cannot delete a ${current.status} quote. Mark it draft first if deletion is genuinely required.`,
      reason: 'blocked_status',
    }
  }

  // Check for linked invoices and jobs.
  const [invoicesRes, jobsRes] = await Promise.all([
    supabase.from('invoices').select('id').eq('quote_id', input.quote_id),
    supabase.from('jobs').select('id').eq('quote_id', input.quote_id),
  ])

  const invoice_ids = (invoicesRes.data ?? []).map((r) => r.id)
  const job_ids = (jobsRes.data ?? []).map((r) => r.id)
  const hasLinked = invoice_ids.length > 0 || job_ids.length > 0

  if (hasLinked && !input.confirm_linked) {
    return {
      error: `Quote is linked to ${invoice_ids.length} invoice(s) and ${job_ids.length} job(s). Re-submit with confirm_linked=true to soft-delete anyway.`,
      reason: 'linked_records',
      linked: { invoice_ids, job_ids },
    }
  }

  // Record the pre-mutation state so the quote can be reconstructed.
  const { error: snapErr } = await supabase.from('record_snapshots').insert({
    entity_table: 'quotes',
    entity_id: input.quote_id,
    reason: 'quote.soft-delete',
    snapshot: current as unknown as Record<string, unknown>,
    created_by: user.id,
  })
  if (snapErr) {
    return { error: `Pre-delete snapshot failed: ${snapErr.message}` }
  }

  // Apply the soft-delete.
  const now = new Date().toISOString()
  const { error: delErr } = await supabase
    .from('quotes')
    .update({ deleted_at: now, deleted_by: user.id })
    .eq('id', input.quote_id)
    .is('deleted_at', null) // race guard
  if (delErr) {
    return { error: `Failed to soft-delete: ${delErr.message}` }
  }

  // Append to audit log. Include linked record IDs so the audit trail
  // captures what the operator was warned about.
  const { error: auditErr } = await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'quote.soft-delete',
    entity_table: 'quotes',
    entity_id: input.quote_id,
    before: { deleted_at: null, deleted_by: null },
    after: {
      deleted_at: now,
      deleted_by: user.id,
      confirm_linked: !!input.confirm_linked,
      linked_invoice_ids: invoice_ids,
      linked_job_ids: job_ids,
    },
  })
  if (auditErr) {
    // Don't roll back the delete for an audit failure, but surface it.
    console.error('[softDeleteQuote] audit_log insert failed', auditErr)
  }

  revalidatePath('/portal/quotes')
  revalidatePath(`/portal/quotes/${input.quote_id}`)
  return { ok: true }
}
