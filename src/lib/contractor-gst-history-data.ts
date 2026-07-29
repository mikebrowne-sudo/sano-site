// Contractor GST history — server-side reads + derived-cache sync.
//
// Staff reads use the RLS admin client; the token read uses the service-role
// client with a strict contractor-safe allowlist (never review notes,
// verification metadata, evidence refs, other contractors).

import { getServiceSupabase } from './supabase-service'
import { selectGstStatusForDate, type GstHistoryRecord } from './contractor-gst-history'

export interface FullGstHistory extends GstHistoryRecord {
  gstNumberRef: string | null
  contractorId: string
  evidenceRef: string | null
  signedName: string | null
  signedAt: string | null
  source: string
  verifiedAt: string | null
  verifiedBy: string | null
  reviewNotes: string | null
  supersedesId: string | null
  supersededAt: string | null
  createdAt: string | null
}

function mapFull(r: Record<string, unknown>): FullGstHistory {
  return {
    id: r.id as string,
    gstNumberRef: (r.gst_number_ref as string | null) ?? null,
    contractorId: r.contractor_id as string,
    status: (r.status as GstHistoryRecord['status']) ?? 'submitted',
    gstRegistered: !!r.gst_registered,
    gstNumber: (r.gst_number as string | null) ?? null,
    effectiveDate: (r.effective_date as string | null) ?? null,
    endDate: (r.end_date as string | null) ?? null,
    evidenceRef: (r.evidence_ref as string | null) ?? null,
    signedName: (r.signed_name as string | null) ?? null,
    signedAt: (r.signed_at as string | null) ?? null,
    source: (r.source as string) ?? 'staff_recorded',
    verifiedAt: (r.verified_at as string | null) ?? null,
    verifiedBy: (r.verified_by as string | null) ?? null,
    reviewNotes: (r.review_notes as string | null) ?? null,
    supersedesId: (r.supersedes_id as string | null) ?? null,
    supersededAt: (r.superseded_at as string | null) ?? null,
    createdAt: (r.created_at as string | null) ?? null,
  }
}

/** Staff read: current verified + pending replacement + full history. */
export async function getContractorGstHistory(contractorId: string): Promise<{
  verifiedCurrent: FullGstHistory | null
  pendingReplacement: FullGstHistory | null
  history: FullGstHistory[]
}> {
  const svc = getServiceSupabase()
  const { data } = await svc.from('contractor_gst_history').select('*').eq('contractor_id', contractorId).order('created_at', { ascending: false })
  const all = (data ?? []).map((r) => mapFull(r as Record<string, unknown>))
  return {
    verifiedCurrent: all.find((h) => h.status === 'verified' && !h.supersededAt) ?? null,
    pendingReplacement: all.find((h) => h.status === 'submitted') ?? null,
    history: all,
  }
}

/** The GST window applicable on a date (date-resolved, never newest/turnover). */
export function gstRecordForDate(history: FullGstHistory[], dateIso: string): FullGstHistory | null {
  return selectGstStatusForDate(history, dateIso)
}

/** Contractor-SAFE view for the token route — no notes / verification / evidence. */
export interface ContractorSafeGst {
  status: 'submitted' | 'verified' | 'rejected' | 'superseded'
  gstRegistered: boolean
  gstNumber: string | null
  effectiveDate: string | null
  endDate: string | null
  needsResubmit: boolean
}

export async function getContractorSafeGstByToken(token: string): Promise<{ contractorId: string; gst: ContractorSafeGst | null } | null> {
  if (!token || token.length < 16) return null
  const svc = getServiceSupabase()
  const { data: setup } = await svc.from('contractor_setup').select('contractor_id, status').eq('token', token).maybeSingle()
  if (!setup) return null
  const OPEN = new Set(['draft', 'ready_to_send', 'awaiting_contractor', 'contractor_submitted', 'sano_review_required', 'changes_requested', 'ready_to_sign'])
  if (!OPEN.has((setup.status as string) ?? '')) return null
  const contractorId = setup.contractor_id as string

  const { data } = await svc
    .from('contractor_gst_history')
    .select('status, gst_registered, gst_number, effective_date, end_date')
    .eq('contractor_id', contractorId)
    .in('status', ['submitted', 'verified', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const gst: ContractorSafeGst | null = data ? {
    status: data.status as ContractorSafeGst['status'],
    gstRegistered: !!data.gst_registered,
    gstNumber: (data.gst_number as string | null) ?? null,
    effectiveDate: (data.effective_date as string | null) ?? null,
    endDate: (data.end_date as string | null) ?? null,
    needsResubmit: data.status === 'rejected',
  } : null
  return { contractorId, gst }
}

/** Sync the contractors.gst_* DERIVED CACHE from the current verified row. Called
 *  after any verify/supersede so the flat columns reflect the current verified
 *  registration (used by the GST resolver's default path). Never inferred. */
export async function syncGstCache(supabase: ReturnType<typeof getServiceSupabase>, contractorId: string): Promise<void> {
  const { data } = await supabase
    .from('contractor_gst_history')
    .select('gst_registered, gst_number, effective_date, end_date')
    .eq('contractor_id', contractorId)
    .eq('status', 'verified')
    .is('superseded_at', null)
    .maybeSingle()
  await supabase.from('contractors').update({
    gst_registered: data ? !!data.gst_registered : false,
    gst_number: data?.gst_number ?? null,
    gst_effective_date: data?.effective_date ?? null,
    gst_end_date: data?.end_date ?? null,
  }).eq('id', contractorId)
}
