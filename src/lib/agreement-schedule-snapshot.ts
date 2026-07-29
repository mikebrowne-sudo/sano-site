// Freeze a contractor's active service schedules onto an agreement as display
// blocks, so the signed agreement is stable even if a schedule is later edited
// (schedule edits supersede, never overwrite). Server-side; no tax math.

import { buildScheduleBlocks, type AgreementScheduleBlock, type ScheduleForBlock } from './agreement-schedule-blocks'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Build the frozen schedule blocks for an agreement from the STAFF-SELECTED
 * schedule IDs. Only schedules that (a) are in the selection, (b) belong to THIS
 * contractor, and (c) are eligible (draft/active) are included — enforced by the
 * contractor-scoped query plus buildScheduleBlocks. A selected ID that belongs
 * to another contractor, or is paused/ended/superseded, is silently dropped
 * (never included). Returns [] when nothing eligible is selected.
 */
export async function buildAgreementScheduleSnapshot(
  supabase: SupabaseClient,
  contractorId: string,
  selectedIds: string[],
): Promise<AgreementScheduleBlock[]> {
  const selected = Array.from(new Set((selectedIds ?? []).filter(Boolean)))
  if (selected.length === 0) return []

  const { data: rows } = await supabase
    .from('contractor_service_schedules')
    .select('id, name, customer_client_id, classification, service_type, service_address, start_date, frequency, term, payment_method, payment_basis, rate_basis, agreed_amount, notice_period, price_review_date, closure_treatment, additional_work_approval, equipment_products, status, effective_from, updated_at')
    .eq('contractor_id', contractorId)   // same-contractor guard: a foreign id can't match
    .in('id', selected)
    .order('created_at', { ascending: true })

  const list = (rows ?? []) as Array<Record<string, unknown>>
  // Resolve customer names in one round-trip.
  const clientIds = Array.from(new Set(list.map((r) => r.customer_client_id as string | null).filter((v): v is string => !!v)))
  const nameById = new Map<string, string>()
  if (clientIds.length > 0) {
    const { data: clients } = await supabase.from('clients').select('id, name').in('id', clientIds)
    for (const c of (clients ?? []) as Array<{ id: string; name: string | null }>) nameById.set(c.id, c.name ?? '')
  }

  const forBlocks: ScheduleForBlock[] = list.map((r) => ({
    id: r.id as string,
    versionKey: `${(r.effective_from as string | null) ?? ''}|${(r.updated_at as string | null) ?? ''}`,
    effectiveFrom: (r.effective_from as string | null) ?? null,
    name: (r.name as string | null) ?? '',
    customerName: r.customer_client_id ? (nameById.get(r.customer_client_id as string) ?? null) : null,
    classification: (r.classification as 'residential' | 'commercial' | null) ?? null,
    serviceType: (r.service_type as string | null) ?? null,
    serviceAddress: (r.service_address as string | null) ?? null,
    startDate: (r.start_date as string | null) ?? null,
    frequency: (r.frequency as string | null) ?? null,
    term: (r.term as 'ongoing' | 'fixed' | null) ?? null,
    paymentMethod: (r.payment_method as ScheduleForBlock['paymentMethod']) ?? null,
    paymentBasis: (r.payment_basis as ScheduleForBlock['paymentBasis']) ?? null,
    rateBasis: (r.rate_basis as ScheduleForBlock['rateBasis']) ?? null,
    agreedAmount: r.agreed_amount == null ? null : Number(r.agreed_amount),
    noticePeriod: (r.notice_period as string | null) ?? null,
    priceReviewDate: (r.price_review_date as string | null) ?? null,
    closureTreatment: (r.closure_treatment as string | null) ?? null,
    additionalWorkApproval: (r.additional_work_approval as string | null) ?? null,
    equipmentProducts: (r.equipment_products as string | null) ?? null,
    status: (r.status as string) ?? 'draft',
  }))

  // Build in the STAFF-SELECTED order, eligibility enforced by buildScheduleBlocks.
  return buildScheduleBlocks(forBlocks, selected)
}
