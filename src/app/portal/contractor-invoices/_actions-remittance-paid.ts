'use server'

// Staff-controlled remittance paid state (2026-07).
//
// A remittance is created UNPAID (see _actions-remittance-batch). Once the
// money actually leaves the bank, staff mark it paid here — which stamps
// contractor_remittances.paid_at AND flips the linked payables to paid with
// the payment date, so the contractor's pay view and totals move together.
// markRemittanceUnpaid reverses it (mistake / not actually paid yet).
//
// Neither touches the finance/expenses ledger — P&L cost comes from the
// separate wages_payroll expenses + bank reconciliation. This is the
// operational payment-tracking layer only. Admin-only, audited.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

async function linkedPayableIds(
  supabase: ReturnType<typeof createClient>,
  remittanceId: string,
): Promise<string[]> {
  const { data: items } = await supabase
    .from('contractor_remittance_items')
    .select('contractor_invoice_id')
    .eq('remittance_id', remittanceId)
  return (items ?? [])
    .map((i) => (i as { contractor_invoice_id: string | null }).contractor_invoice_id)
    .filter((x): x is string => !!x)
}

export async function markRemittancePaid(remittanceId: string, paymentDate?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: remit } = await supabase
    .from('contractor_remittances')
    .select('id, remittance_number, payment_date, paid_at')
    .eq('id', remittanceId)
    .maybeSingle()
  if (!remit) return { error: 'Remittance not found.' }
  if (remit.paid_at) return { error: 'This remittance is already marked paid.' }

  // The date the money left the bank. Defaults to the remittance's own
  // payment date so a one-tap "mark paid" just works.
  const payDate = (paymentDate || (remit.payment_date as string | null) || '').trim()
  if (!payDate) return { error: 'A payment date is required to mark this remittance paid.' }

  const payableIds = await linkedPayableIds(supabase, remittanceId)
  if (payableIds.length > 0) {
    const { error: uErr } = await supabase
      .from('contractor_invoices')
      .update({ status: 'paid', date_paid: payDate })
      .in('id', payableIds)
      .neq('status', 'void')
    if (uErr) return { error: `Could not mark the payables paid: ${uErr.message}` }
  }

  const { error: rErr } = await supabase
    .from('contractor_remittances')
    .update({ paid_at: new Date(payDate).toISOString() })
    .eq('id', remittanceId)
  if (rErr) return { error: `Could not mark the remittance paid: ${rErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_remittance.marked_paid',
    entity_table: 'contractor_remittances',
    entity_id: remittanceId,
    before: { paid_at: null },
    after: { remittance_number: remit.remittance_number, paid_at: payDate, payables: payableIds.length },
  })

  revalidatePath(`/portal/contractor-invoices/remittances/${remittanceId}`)
  revalidatePath('/portal/contractor-invoices/remittances')
  revalidatePath('/portal/contractor-invoices')
  return { ok: true as const }
}

export async function markRemittanceUnpaid(remittanceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: remit } = await supabase
    .from('contractor_remittances')
    .select('id, remittance_number, paid_at')
    .eq('id', remittanceId)
    .maybeSingle()
  if (!remit) return { error: 'Remittance not found.' }
  if (!remit.paid_at) return { error: 'This remittance is not marked paid.' }

  const payableIds = await linkedPayableIds(supabase, remittanceId)
  if (payableIds.length > 0) {
    // Revert only the ones this batch marked paid; leave any 'void' alone.
    const { error: uErr } = await supabase
      .from('contractor_invoices')
      .update({ status: 'approved', date_paid: null })
      .in('id', payableIds)
      .eq('status', 'paid')
    if (uErr) return { error: `Could not revert the payables: ${uErr.message}` }
  }

  const { error: rErr } = await supabase
    .from('contractor_remittances')
    .update({ paid_at: null })
    .eq('id', remittanceId)
  if (rErr) return { error: `Could not mark the remittance unpaid: ${rErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_remittance.marked_unpaid',
    entity_table: 'contractor_remittances',
    entity_id: remittanceId,
    before: { paid_at: remit.paid_at },
    after: { remittance_number: remit.remittance_number, paid_at: null, payables_reverted: payableIds.length },
  })

  revalidatePath(`/portal/contractor-invoices/remittances/${remittanceId}`)
  revalidatePath('/portal/contractor-invoices/remittances')
  revalidatePath('/portal/contractor-invoices')
  return { ok: true as const }
}
