// Freeze a contractor's active service schedules onto an agreement as display
// blocks, so the signed agreement is stable even if a schedule is later edited
// (schedule edits supersede, never overwrite). Server-side; no tax math.

import { buildScheduleBlocks, type AgreementScheduleBlock, type ScheduleForBlock } from './agreement-schedule-blocks'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Load a contractor's non-superseded schedules and their customer names, and
 *  build the labelled display blocks. Returns [] for a contractor with none. */
export async function buildAgreementScheduleSnapshot(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<AgreementScheduleBlock[]> {
  const { data: rows } = await supabase
    .from('contractor_service_schedules')
    .select('id, name, customer_client_id, classification, service_type, service_address, start_date, frequency, term, payment_method, payment_basis, rate_basis, agreed_amount, notice_period, price_review_date, closure_treatment, additional_work_approval, equipment_products, status')
    .eq('contractor_id', contractorId)
    .in('status', ['draft', 'active'])
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

  return buildScheduleBlocks(forBlocks)
}
