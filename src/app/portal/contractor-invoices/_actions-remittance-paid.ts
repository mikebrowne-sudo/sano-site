'use server'

// Staff-controlled remittance paid state (2026-07).
//
// A remittance is created UNPAID (see _actions-remittance-batch). Once the
// money actually leaves the bank, staff mark it paid here. Both operations now
// delegate to ATOMIC SECURITY DEFINER RPCs so the remittance, its linked
// payables AND any linked contractor_statement move together (or not at all).
// The RPCs no-op the statement part for statement-less manual remittances.
//
// Neither touches the finance/expenses ledger — P&L cost comes from the
// separate wages_payroll expenses + bank reconciliation. Admin-only, audited.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

function revalidate(remittanceId: string) {
  revalidatePath(`/portal/contractor-invoices/remittances/${remittanceId}`)
  revalidatePath('/portal/contractor-invoices/remittances')
  revalidatePath('/portal/contractor-invoices')
  revalidatePath('/portal/contractor-statements')
}

export async function markRemittancePaid(remittanceId: string, paymentDate?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: remit } = await supabase
    .from('contractor_remittances')
    .select('payment_date, paid_at')
    .eq('id', remittanceId)
    .maybeSingle()
  if (!remit) return { error: 'Remittance not found.' }
  if (remit.paid_at) return { error: 'This remittance is already marked paid.' }
  const payDate = (paymentDate || (remit.payment_date as string | null) || '').trim()
  if (!payDate) return { error: 'A payment date is required to mark this remittance paid.' }

  const { error } = await supabase.rpc('mark_contractor_remittance_paid', { p_remittance_id: remittanceId, p_payment_date: payDate })
  if (error) return { error: error.message }
  revalidate(remittanceId)
  return { ok: true as const }
}

export async function markRemittanceUnpaid(remittanceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { error } = await supabase.rpc('mark_contractor_remittance_unpaid', { p_remittance_id: remittanceId })
  if (error) return { error: error.message }
  revalidate(remittanceId)
  return { ok: true as const }
}
