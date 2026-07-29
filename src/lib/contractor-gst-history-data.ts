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

/**
 * Sync the contractors.gst_* DERIVED CACHE to the verified GST status APPLICABLE
 * ON `asOfIso` (default today) — date-resolved, NOT the newest verified row. A
 * future-effective verified replacement therefore does NOT update the cache
 * early: the cache keeps showing the status in force until that effective date.
 * After a verified end date the cache shows not-registered. Never inferred.
 *
 * The cache has no scheduled job, so it can go stale as an effective/end date
 * passes with no write. `refreshGstCacheIfStale` (below) re-syncs it on read /
 * before a GST-sensitive action; the history remains the authoritative source for
 * any date-based resolution regardless of the cache.
 */
export async function syncGstCache(
  supabase: ReturnType<typeof getServiceSupabase>,
  contractorId: string,
  asOfIso?: string,
): Promise<void> {
  const asOf = asOfIso ?? new Date().toISOString().slice(0, 10)
  const { data } = await supabase
    .from('contractor_gst_history')
    .select('id, status, gst_registered, gst_number, effective_date, end_date')
    .eq('contractor_id', contractorId)
    .in('status', ['verified', 'superseded']) // superseded rows still cover historical/current windows
  const rows = (data ?? []).map((r) => ({
    id: r.id as string, status: r.status as GstHistoryRecord['status'],
    gstRegistered: !!r.gst_registered, gstNumber: (r.gst_number as string | null) ?? null,
    effectiveDate: (r.effective_date as string | null) ?? null, endDate: (r.end_date as string | null) ?? null,
  }))
  // selectGstStatusForDate only accepts 'verified'; a superseded row that was
  // verified for a past window is not re-verified, so we resolve over verified
  // rows only — the applicable CURRENT status is a verified, in-window row.
  const applicable = selectGstStatusForDate(rows.filter((r) => r.status === 'verified'), asOf)
  await supabase.from('contractors').update({
    gst_registered: applicable ? applicable.gstRegistered : false,
    gst_number: applicable?.gstNumber ?? null,
    gst_effective_date: applicable?.effectiveDate ?? null,
    gst_end_date: applicable?.endDate ?? null,
  }).eq('id', contractorId)
}

/**
 * Refresh the cache to the status applicable today, but only if it has drifted —
 * cheap enough to call on a GST-sensitive contractor read. This is what makes a
 * future-effective registration "arrive": the first read on/after the effective
 * date re-syncs the cache. Returns the applicable-today record (authoritative).
 */
export async function refreshGstCacheIfStale(
  supabase: ReturnType<typeof getServiceSupabase>,
  contractorId: string,
  history: FullGstHistory[],
): Promise<FullGstHistory | null> {
  const today = new Date().toISOString().slice(0, 10)
  const applicable = selectGstStatusForDate(history, today)
  const { data: c } = await supabase.from('contractors').select('gst_registered, gst_number, gst_effective_date, gst_end_date').eq('id', contractorId).maybeSingle()
  const cache = {
    reg: !!c?.gst_registered, num: (c?.gst_number as string | null) ?? null,
    eff: (c?.gst_effective_date as string | null) ?? null, end: (c?.gst_end_date as string | null) ?? null,
  }
  const want = {
    reg: applicable ? applicable.gstRegistered : false, num: applicable?.gstNumber ?? null,
    eff: applicable?.effectiveDate ?? null, end: applicable?.endDate ?? null,
  }
  if (cache.reg !== want.reg || cache.num !== want.num || cache.eff !== want.eff || cache.end !== want.end) {
    await syncGstCache(supabase, contractorId, today)
  }
  return applicable
}
