'use server'

// Reversal actions for mistaken contractor pay. Two safe, audited operations:
//
//  - voidContractorPayable: marks an approved/paid payable as 'void' so the
//    job's "Approve for pay" button returns and it can be redone with the
//    correct amount/basis. The row is kept (never hard-deleted) so the
//    invoice number and history survive for audit. Blocked while the payable
//    is snapshotted onto a remittance — void that batch first.
//
//  - voidRemittanceBatch: deletes a remittance batch (its snapshot lines
//    cascade) and reverts the payables it marked paid back to 'approved'
//    (clears date_paid), so they can be corrected or voided.
//
// Neither touches the finance/expenses ledger — the P&L cost comes from the
// separate wages_payroll expenses + bank reconciliation, so reversing an
// operational payable that never hit the bank has no tax impact.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { statementEditBlock } from '@/lib/contractor-statement-lock'
import { revalidatePath } from 'next/cache'

export async function voidContractorPayable(payableId: string, reason: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!reason.trim()) return { error: 'A reason is required to void a payable.' }

  const { data: ci } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, status, amount, job_id, contractor_id, date_paid, statement_id')
    .eq('id', payableId)
    .maybeSingle()
  if (!ci) return { error: 'Contractor payable not found.' }
  if (ci.status === 'void') return { error: 'This payable is already voided.' }

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

  // Blocked while snapshotted onto a remittance — the advice would silently
  // disagree. Void the remittance batch first.
  const { data: onRemit } = await supabase
    .from('contractor_remittance_items')
    .select('remittance_id, contractor_remittances ( remittance_number )')
    .eq('contractor_invoice_id', payableId)
    .limit(1)
    .maybeSingle()
  if (onRemit) {
    const ref = Array.isArray(onRemit.contractor_remittances) ? onRemit.contractor_remittances[0] : onRemit.contractor_remittances
    const num = (ref as { remittance_number?: string | null } | null)?.remittance_number
    return { error: `This payable is on remittance ${num ?? ''}. Void that remittance batch first, then void the payable.`.trim() }
  }

  const { error: uErr } = await supabase
    .from('contractor_invoices')
    .update({ status: 'void' })
    .eq('id', payableId)
  if (uErr) return { error: `Could not void the payable: ${uErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_pay.voided',
    entity_table: 'contractor_invoices',
    entity_id: payableId,
    before: { status: ci.status, amount: ci.amount, date_paid: ci.date_paid },
    after: { status: 'void', reason: reason.trim() },
  })

  if (ci.job_id) revalidatePath(`/portal/jobs/${ci.job_id}`)
  revalidatePath('/portal/contractor-invoices')
  revalidatePath('/portal/contractor-invoices/pending-approvals')
  return { ok: true }
}

export async function voidRemittanceBatch(remittanceId: string, reason: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!reason.trim()) return { error: 'A reason is required to void a remittance.' }

  // Atomic: reverts paid CIs to approved, reverts any linked statement out of
  // 'paid' (the ON DELETE SET NULL FK unlinks it), deletes the batch + items,
  // and audits — all in one transaction. No-ops the statement part for manual
  // (statement-less) remittances.
  const { error } = await supabase.rpc('void_contractor_remittance', { p_remittance_id: remittanceId, p_reason: reason.trim() })
  if (error) return { error: error.message }

  revalidatePath('/portal/contractor-invoices')
  revalidatePath('/portal/contractor-invoices/pending-approvals')
  revalidatePath('/portal/contractor-statements')
  return { ok: true }
}
