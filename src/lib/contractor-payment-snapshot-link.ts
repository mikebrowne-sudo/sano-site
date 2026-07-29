// Server helper: load an approved payment tax snapshot by its explicit id and
// validate it for linking to a payable (PR 9). Keeps the DB shape mapping in one
// place so createContractorInvoice / approveContractorPay / any future schedular
// payable path all link the SAME validated way. Never searches by contractor/date.

import type { SupabaseClient } from '@supabase/supabase-js'
import { validateSnapshotForPayable, type ApprovedSnapshotForRemittance } from './contractor-remittance-tax'

/** Load one snapshot by explicit id, mapped to the resolver shape (or null). */
export async function loadApprovedSnapshotById(
  supabase: SupabaseClient,
  snapshotId: string,
): Promise<ApprovedSnapshotForRemittance | null> {
  const { data: s } = await supabase
    .from('contractor_payment_tax_snapshots')
    .select('id, contractor_id, status, calc_status, service_schedule_id, supply_date, gross_ex_gst, gst_amount, withholding_rate, withholding_amount, net_bank, tax_declaration_id')
    .eq('id', snapshotId)
    .maybeSingle()
  if (!s) return null
  return {
    id: s.id as string,
    contractorId: s.contractor_id as string,
    status: s.status as string,
    calcStatus: s.calc_status as string,
    serviceScheduleId: (s.service_schedule_id as string | null) ?? null,
    supplyDate: s.supply_date as string,
    grossExGst: s.gross_ex_gst == null ? null : Number(s.gross_ex_gst),
    gstAmount: s.gst_amount == null ? null : Number(s.gst_amount),
    withholdingRate: s.withholding_rate == null ? null : Number(s.withholding_rate),
    withholdingAmount: s.withholding_amount == null ? null : Number(s.withholding_amount),
    netBank: s.net_bank == null ? null : Number(s.net_bank),
    taxDeclarationId: (s.tax_declaration_id as string | null) ?? null,
  }
}

/** The set of snapshot ids already carried by an ACTIVE payable (for single-use). */
export async function activeSnapshotIds(supabase: SupabaseClient): Promise<Set<string>> {
  const { data } = await supabase
    .from('contractor_invoices')
    .select('contractor_payment_snapshot_id')
    .not('contractor_payment_snapshot_id', 'is', null)
    .neq('ci_tax_status', 'superseded')
  return new Set((data ?? []).map((r) => r.contractor_payment_snapshot_id as string).filter(Boolean))
}

/**
 * Validate + resolve the explicit snapshot for a payable at create/approve time.
 * Returns { error } on any failed source check (caller BLOCKS), or { snapshot }
 * on success (caller links the id + service_schedule_id). Never infers.
 */
export async function resolveSnapshotForPayable(
  supabase: SupabaseClient,
  args: { snapshotId: string; contractorId: string; serviceScheduleId: string | null; isCorrection?: boolean },
): Promise<{ error: string } | { snapshot: ApprovedSnapshotForRemittance }> {
  const snapshot = await loadApprovedSnapshotById(supabase, args.snapshotId)
  const active = await activeSnapshotIds(supabase)
  const err = validateSnapshotForPayable({
    snapshot,
    contractorId: args.contractorId,
    serviceScheduleId: args.serviceScheduleId,
    alreadyActiveSnapshotIds: active,
    isCorrection: args.isCorrection,
  })
  if (err) return { error: err }
  return { snapshot: snapshot! }
}
