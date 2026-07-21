'use server'

// Admin Full Edit Mode — Stage 4. Audited, remittance-aware admin edit of a
// contractor payable (contractor_invoice): contractor, linked job, amount,
// date submitted and notes. The amount IS the payable's total (flat), so
// there is no hours/rate to recompute — fixed-price work stays fixed.
//
// A reason is ALWAYS required for a payable edit. The change is blocked when
// the payable is paid, or already snapshotted into a (draft or sent)
// remittance batch — see contractor-payable-guard. Saving NEVER changes
// status / date_paid / invoice_number (no auto paid/unpaid, no renumber),
// NEVER creates or sends a remittance, and NEVER touches an existing
// remittance snapshot. Admin/staff only; audited via logSensitiveEdit (#246).

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { evaluatePayableEdit, EDITABLE_PAYABLE_FIELDS, flattenRef, type RemittanceRef } from '@/lib/contractor-payable-guard'
import { summariseChanges } from '@/lib/sensitive-edit'
import { logSensitiveEdit } from '@/app/portal/_actions-sensitive-edit'
import { statementEditBlock } from '@/lib/contractor-statement-lock'
import { revalidatePath } from 'next/cache'

export interface UpdateContractorPayableInput {
  id: string
  contractor_id: string
  job_id: string | null
  amount: number
  date_submitted: string
  notes: string | null
  payment_type?: string | null
  site_label?: string | null
  period_label?: string | null
  reason?: string | null
}

export async function updateContractorPayable(
  input: UpdateContractorPayableInput,
): Promise<{ ok: true; total: number } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.id) return { error: 'Payable is required.' }
  if (!input.contractor_id) return { error: 'Contractor is required.' }

  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Amount must be greater than zero.' }

  // A reason is required for ANY contractor payable edit.
  const reason = (input.reason ?? '').trim()
  if (!reason) return { error: 'A reason is required to edit a contractor payable.' }

  const { data: ci } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, contractor_id, job_id, amount, date_submitted, date_paid, status, notes, payment_type, site_label, period_label, statement_id')
    .eq('id', input.id)
    .maybeSingle()
  if (!ci) return { error: 'Contractor payable not found.' }

  // Locked once on a non-draft statement — corrections require supersede.
  if (ci.statement_id) {
    const { data: st } = await supabase
      .from('contractor_statements')
      .select('status, statement_number')
      .eq('id', ci.statement_id)
      .maybeSingle()
    const block = statementEditBlock(st?.status as string | null, st?.statement_number as string | null)
    if (block) return { error: block }
  }

  // Remittance batches this payable was snapshotted into (drives the guard).
  const { data: linkRaw } = await supabase
    .from('contractor_remittance_items')
    .select('remittance_id, contractor_remittances ( sent_at )')
    .eq('contractor_invoice_id', input.id)
  const remittances = ((linkRaw ?? []) as unknown as Array<{ contractor_remittances: RemittanceRef }>)
    .map((r) => ({ sent: !!flattenRef(r.contractor_remittances)?.sent_at }))

  const guard = evaluatePayableEdit({
    status: (ci.status as string | null) ?? null,
    datePaid: (ci.date_paid as string | null) ?? null,
    remittances,
  })
  if (!guard.editable) return { error: guard.message ?? 'This contractor payable can no longer be edited.' }

  const paymentType = input.payment_type === 'fixed_contract' ? 'fixed_contract' : 'standard'
  const before = {
    contractor_id: (ci.contractor_id as string | null) ?? null,
    job_id: (ci.job_id as string | null) ?? null,
    amount: (ci.amount as number | null) ?? null,
    date_submitted: (ci.date_submitted as string | null) ?? null,
    notes: (ci.notes as string | null) ?? null,
    payment_type: (ci.payment_type as string | null) ?? 'standard',
    site_label: (ci.site_label as string | null) ?? null,
    period_label: (ci.period_label as string | null) ?? null,
  }
  const after = {
    contractor_id: input.contractor_id,
    job_id: input.job_id || null,
    amount,
    date_submitted: input.date_submitted,
    notes: input.notes?.trim() || null,
    payment_type: paymentType,
    site_label: paymentType === 'fixed_contract' ? (input.site_label?.trim() || null) : null,
    period_label: paymentType === 'fixed_contract' ? (input.period_label?.trim() || null) : null,
  }

  const changes = summariseChanges(before, after, [...EDITABLE_PAYABLE_FIELDS])
  if (changes.length === 0) return { error: 'No changes to save.' }

  // Apply only the editable fields — never status / date_paid / invoice_number.
  const { error: updErr } = await supabase
    .from('contractor_invoices')
    .update(after)
    .eq('id', input.id)
  if (updErr) return { error: `Could not save payable: ${updErr.message}` }

  await logSensitiveEdit({
    entity: 'contractor_invoice',
    entityId: input.id,
    entityNumber: (ci.invoice_number as string | null) ?? null,
    reason,
    // On the editable path both are false (paid / sent-remittance are
    // blocked above); passed through for an honest at-edit-time record.
    milestone: { paid: guard.isPaid, remitted: guard.inSentRemittance },
    changes,
    beforeTotal: (ci.amount as number | null) ?? null,
    afterTotal: amount,
  })

  revalidatePath(`/portal/contractor-invoices/${input.id}`)
  revalidatePath('/portal/contractor-invoices')
  return { ok: true, total: amount }
}
