'use server'

// Contractor payment tax snapshot actions (PR 7). Persist the canonical
// computeContractorPayment result as an immutable snapshot; approve only a
// resolved ('ok') result; corrections supersede (never overwrite). Admin-gated,
// audited. NO IRD liability / filing / payment / money movement. No auto-backfill.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { computeContractorPayment, type PaymentCalcInput } from '@/lib/contractor-payment-calc'
import { canApproveSnapshot, calcToSnapshotRow } from '@/lib/contractor-payment-snapshot'
import { getContractorDeclarations } from '@/lib/contractor-tax-declaration-data'
import { getContractorGstHistory } from '@/lib/contractor-gst-history-data'
import type { DeclarationRecord } from '@/lib/contractor-tax-declaration'
import type { GstHistoryRecord } from '@/lib/contractor-gst-history'
import type { PaymentBasis, RateBasis } from '@/lib/contractor-schedule-preview'
import type { ScheduleTaxTreatment } from '@/lib/contractor-tax-gate'

async function admin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { supabase, user: null as null }
  return { supabase, user }
}
const revalidate = (id: string) => revalidatePath(`/portal/contractors/${id}/tax`)

/** Recompute the canonical result for a schedule as at the supply date (from the
 *  verified histories) — the single source the snapshot persists. */
async function computeForSchedule(
  supabase: ReturnType<typeof createClient>,
  contractorId: string,
  scheduleId: string,
  supplyDateIso: string,
) {
  const { data: s } = await supabase
    .from('contractor_service_schedules')
    .select('id, agreed_amount, payment_method, payment_basis, rate_basis, tax_treatment, effective_from, updated_at')
    .eq('id', scheduleId).eq('contractor_id', contractorId).maybeSingle()
  if (!s) return null
  const { history: decls } = await getContractorDeclarations(contractorId)
  const { history: gst } = await getContractorGstHistory(contractorId)
  const taxDeclarations: DeclarationRecord[] = decls.map((d) => ({ id: d.id, status: d.status, declarationType: d.declarationType, withholdingRate: d.withholdingRate, effectiveDate: d.effectiveDate, expiryDate: d.expiryDate }))
  const gstHistory: GstHistoryRecord[] = gst.map((g) => ({ id: g.id, status: g.status, gstRegistered: g.gstRegistered, gstNumber: g.gstNumber, effectiveDate: g.effectiveDate, endDate: g.endDate }))
  const input: PaymentCalcInput = {
    scheduleId: s.id as string,
    scheduleVersionKey: `${(s.effective_from as string | null) ?? ''}|${(s.updated_at as string | null) ?? ''}`,
    paymentMethod: (s.payment_method as string | null) ?? null,
    agreedAmount: Number(s.agreed_amount ?? 0),
    paymentBasis: (s.payment_basis as PaymentBasis) ?? 'gross_fee',
    rateBasis: (s.rate_basis as RateBasis) ?? 'gst_exclusive',
    taxTreatment: (s.tax_treatment ?? null) as ScheduleTaxTreatment,
    taxDeclarations, gstHistory, supplyDateIso,
  }
  return computeContractorPayment(input)
}

/**
 * Create a DRAFT snapshot for a schedule as at a supply date. Persists the exact
 * canonical result (any status). A draft is never payable; approval is separate.
 */
export async function createPaymentSnapshot(
  contractorId: string,
  scheduleId: string,
  supplyDateIso: string,
): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  const calc = await computeForSchedule(supabase, contractorId, scheduleId, supplyDateIso)
  if (!calc) return { error: 'Schedule not found for this contractor.' }

  const { data, error } = await supabase
    .from('contractor_payment_tax_snapshots')
    .insert({ ...calcToSnapshotRow(calc, contractorId), status: 'draft', created_by: user.id })
    .select('id').single()
  if (error) return { error: error.message }
  await supabase.from('contractor_payment_tax_snapshots').update({ snapshot_number: `CPS-${String(data.id).slice(0, 4).toUpperCase()}` }).eq('id', data.id)
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_payment_snapshot.drafted',
    entity_table: 'contractor_payment_tax_snapshots', entity_id: data.id,
    before: null, after: { schedule: scheduleId, supply_date: supplyDateIso, calc_status: calc.status },
  })
  revalidate(contractorId)
  return { ok: true, id: data.id as string }
}

/** Approve a draft snapshot → payable. HARD GATE: only calc_status='ok'. */
export async function approvePaymentSnapshot(snapshotId: string): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  const { data: snap } = await supabase.from('contractor_payment_tax_snapshots').select('id, contractor_id, status, calc_status').eq('id', snapshotId).maybeSingle()
  if (!snap) return { error: 'Snapshot not found.' }
  if (snap.status !== 'draft') return { error: `Only a draft snapshot can be approved (this is ${snap.status}).` }
  const gate = canApproveSnapshot({ status: snap.calc_status as never })
  if (!gate.ok) return { error: gate.reason }

  const nowIso = new Date().toISOString()
  const { error } = await supabase.from('contractor_payment_tax_snapshots')
    .update({ status: 'approved', approved_at: nowIso, approved_by: user.id })
    .eq('id', snapshotId).eq('status', 'draft')
  if (error) return { error: error.message }
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_payment_snapshot.approved',
    entity_table: 'contractor_payment_tax_snapshots', entity_id: snapshotId, before: { status: 'draft' }, after: { status: 'approved' },
  })
  revalidate(snap.contractor_id as string)
  return { ok: true }
}

/**
 * Correct an APPROVED snapshot: recompute now, insert a new draft that supersedes
 * the old one (which is marked superseded). The original stays for audit; it is
 * never overwritten (the DB trigger enforces that too).
 */
export async function correctPaymentSnapshot(snapshotId: string, reason: string): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  if (!reason?.trim()) return { error: 'A correction reason is required.' }
  const { data: old } = await supabase.from('contractor_payment_tax_snapshots')
    .select('id, contractor_id, service_schedule_id, supply_date, status').eq('id', snapshotId).maybeSingle()
  if (!old) return { error: 'Snapshot not found.' }
  if (old.status === 'superseded' || old.status === 'void') return { error: 'This snapshot is no longer current.' }

  const calc = await computeForSchedule(supabase, old.contractor_id as string, old.service_schedule_id as string, old.supply_date as string)
  if (!calc) return { error: 'Could not recompute — the schedule may have been removed.' }

  const nowIso = new Date().toISOString()
  const { data: replacement, error: insErr } = await supabase.from('contractor_payment_tax_snapshots')
    .insert({ ...calcToSnapshotRow(calc, old.contractor_id as string), status: 'draft', supersedes_id: snapshotId, correction_reason: reason.trim(), created_by: user.id })
    .select('id').single()
  if (insErr) return { error: insErr.message }
  await supabase.from('contractor_payment_tax_snapshots').update({ snapshot_number: `CPS-${String(replacement.id).slice(0, 4).toUpperCase()}` }).eq('id', replacement.id)

  const { error: supErr } = await supabase.from('contractor_payment_tax_snapshots')
    .update({ status: 'superseded', superseded_at: nowIso, superseded_by_id: replacement.id })
    .eq('id', snapshotId)
  if (supErr) return { error: `Replacement created but superseding the old one failed: ${supErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_payment_snapshot.corrected',
    entity_table: 'contractor_payment_tax_snapshots', entity_id: replacement.id,
    before: { superseded: snapshotId }, after: { reason: reason.trim(), calc_status: calc.status },
  })
  revalidate(old.contractor_id as string)
  return { ok: true, id: replacement.id as string }
}
