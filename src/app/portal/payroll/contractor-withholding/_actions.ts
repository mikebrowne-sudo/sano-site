'use server'

// Contractor schedular withholding liability + filing actions (PR 8). Create a
// withholding line from an APPROVED payment snapshot; track manual filing; record
// an IRD payment. Admin-gated, audited. NO money movement (records existing
// transfers), NO auto-pay, NO electronic filing transmission.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { validateWithholdingSource, withholdingPeriod, snapshotToWithholdingRow, type ApprovedSnapshotForWithholding } from '@/lib/contractor-withholding'

async function admin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) return { supabase, user: null as null }
  return { supabase, user }
}
const revalidate = () => revalidatePath('/portal/payroll/contractor-withholding')

/** Ensure the CONTRACTOR-withholding period row for a payday exists; return its
 *  id. Uses the isolated contractor_withholding_periods (never ird_liabilities),
 *  so contractor withholding can't attach to a PAYE/GST period. */
async function ensurePeriod(supabase: ReturnType<typeof createClient>, payday: string): Promise<string | null> {
  const p = withholdingPeriod(payday)
  await supabase.from('contractor_withholding_periods').upsert(
    { period_key: p.periodKey, period_start: p.periodStart, period_end: p.periodEnd, due_date: p.dueDate },
    { onConflict: 'period_key', ignoreDuplicates: true },
  )
  const { data } = await supabase.from('contractor_withholding_periods').select('id').eq('period_key', p.periodKey).maybeSingle()
  return (data?.id as string) ?? null
}

/**
 * Create the withholding liability line for an APPROVED payment snapshot at a
 * payday. One line per snapshot (DB unique). Frozen from the snapshot; audited.
 */
export async function createWithholdingLine(snapshotId: string, payday: string): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  if (!payday) return { error: 'A payday is required (drives the IRD period).' }

  const { data: snap } = await supabase
    .from('contractor_payment_tax_snapshots')
    .select('id, contractor_id, status, calc_status, supply_date, withholding_rate, gross_ex_gst, withholding_amount, net_bank, calc_version, tax_treatment')
    .eq('id', snapshotId).maybeSingle()
  if (!snap) return { error: 'Snapshot not found.' }

  const source: ApprovedSnapshotForWithholding = {
    id: snap.id as string, contractorId: snap.contractor_id as string, status: snap.status as string,
    calcStatus: snap.calc_status as string, supplyDate: snap.supply_date as string,
    withholdingRate: snap.withholding_rate == null ? null : Number(snap.withholding_rate),
    grossExGst: snap.gross_ex_gst == null ? null : Number(snap.gross_ex_gst),
    withholdingAmount: snap.withholding_amount == null ? null : Number(snap.withholding_amount),
    netBank: snap.net_bank == null ? null : Number(snap.net_bank),
    calcVersion: snap.calc_version as string, taxTreatment: (snap.tax_treatment as string | null) ?? null,
  }
  const err = validateWithholdingSource(source)
  if (err) return { error: err }

  const periodId = await ensurePeriod(supabase, payday)
  if (!periodId) return { error: 'Could not resolve the withholding period.' }

  const { data: line, error: insErr } = await supabase
    .from('contractor_withholding_lines')
    .insert({ ...snapshotToWithholdingRow(source, payday), withholding_period_id: periodId, created_by: user.id })
    .select('id').single()
  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') return { error: 'A withholding line already exists for this snapshot.' }
    return { error: insErr.message }
  }
  await supabase.from('contractor_withholding_lines').update({ line_number: `CWL-${String(line.id).slice(0, 4).toUpperCase()}` }).eq('id', line.id)
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_withholding.line_created',
    entity_table: 'contractor_withholding_lines', entity_id: line.id,
    before: null, after: { snapshot: snapshotId, payday, withholding: source.withholdingAmount },
  })
  revalidate()
  return { ok: true, id: line.id as string }
}

/** Advance filing status (manual — no transmission). not_filed → filed → accepted;
 *  or → correction_required. Audited old→new. */
export async function setWithholdingFilingStatus(
  lineId: string,
  filingStatus: 'filed' | 'accepted' | 'correction_required',
  filingReference: string | null,
): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  const { data: line } = await supabase.from('contractor_withholding_lines').select('id, status, filing_status, filed_at').eq('id', lineId).maybeSingle()
  if (!line) return { error: 'Line not found.' }
  if (line.status !== 'active') return { error: 'This line is no longer current.' }

  // accepted is terminal — this action can never target not_filed (see type), so the
  // only revert risk is DB-side, where cwl_block_fact_updates blocks it. Here we only
  // guard the forward transitions.
  if (filingStatus === 'accepted' && !(filingReference ?? '').trim()) return { error: 'A filing reference is required before marking a filing accepted.' }

  const nowIso = new Date().toISOString()
  // filed_at/by are set for filed AND accepted, and preserved once set.
  const patch: Record<string, unknown> = { filing_status: filingStatus }
  if (filingReference != null) patch.filing_reference = filingReference || null
  const alreadyFiled = (line as { filed_at?: string | null }).filed_at != null
  if ((filingStatus === 'filed' || filingStatus === 'accepted' || filingStatus === 'correction_required') && !alreadyFiled) {
    patch.filed_at = nowIso; patch.filed_by = user.id
  }
  const { error } = await supabase.from('contractor_withholding_lines').update(patch).eq('id', lineId)
  if (error) return { error: error.message }
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_withholding.filing_status',
    entity_table: 'contractor_withholding_lines', entity_id: lineId,
    before: { filing_status: line.filing_status }, after: { filing_status: filingStatus, filing_reference: filingReference || null },
  })
  revalidate()
  return { ok: true }
}

/** Record an EXISTING IRD payment for a period (records, never initiates). */
export async function recordWithholdingPayment(input: {
  periodId: string; paymentDate: string; amount: number; irdReference?: string | null; notes?: string | null
}): Promise<{ ok?: true; id?: string; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  if (!(input.amount > 0)) return { error: 'The payment amount must be greater than zero.' }
  const { data, error } = await supabase.from('contractor_withholding_payments').insert({
    withholding_period_id: input.periodId, payment_date: input.paymentDate, amount: input.amount,
    ird_reference: input.irdReference || null, notes: input.notes || null, recorded_by: user.id,
  }).select('id').single()
  if (error) return { error: error.message }
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_withholding.payment_recorded',
    entity_table: 'contractor_withholding_payments', entity_id: data.id,
    before: null, after: { amount: input.amount, date: input.paymentDate },
  })
  revalidate()
  return { ok: true, id: data.id as string }
}

/**
 * Reverse a recorded payment (never edit/delete). Marks the original reversed
 * (with a reason) and, if a corrective amount is given, records a NEW payment that
 * references the reversed one. Both records are retained. Records only — no bank
 * payment is initiated.
 */
export async function reverseWithholdingPayment(input: {
  paymentId: string; reason: string; correction?: { paymentDate: string; amount: number; irdReference?: string | null } | null
}): Promise<{ ok?: true; error?: string }> {
  const { supabase, user } = await admin()
  if (!user) return { error: 'Admin only.' }
  if (!input.reason?.trim()) return { error: 'A reversal reason is required.' }
  const { data: p } = await supabase.from('contractor_withholding_payments').select('id, withholding_period_id, status').eq('id', input.paymentId).maybeSingle()
  if (!p) return { error: 'Payment not found.' }
  if (p.status !== 'active') return { error: 'This payment is already reversed.' }

  const nowIso = new Date().toISOString()
  const { error: revErr } = await supabase.from('contractor_withholding_payments')
    .update({ status: 'reversed', reversed_at: nowIso, reversed_by: user.id, reversal_reason: input.reason.trim() })
    .eq('id', input.paymentId).eq('status', 'active')
  if (revErr) return { error: revErr.message }

  if (input.correction && input.correction.amount > 0) {
    await supabase.from('contractor_withholding_payments').insert({
      withholding_period_id: p.withholding_period_id, payment_date: input.correction.paymentDate,
      amount: input.correction.amount, ird_reference: input.correction.irdReference || null,
      reverses_id: input.paymentId, recorded_by: user.id,
    })
  }
  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'contractor_withholding.payment_reversed',
    entity_table: 'contractor_withholding_payments', entity_id: input.paymentId,
    before: { status: 'active' }, after: { status: 'reversed', reason: input.reason.trim() },
  })
  revalidate()
  return { ok: true }
}
