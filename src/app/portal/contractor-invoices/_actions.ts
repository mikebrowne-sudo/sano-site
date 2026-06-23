'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

interface CIInput {
  contractor_id: string
  job_id?: string
  amount: number
  date_submitted: string
  notes?: string
  status?: string
  // Fixed monthly contractor payments (commercial contracts). Defaults to
  // 'standard' so existing callers are unchanged. Site/period are only used
  // for 'fixed_contract' payables (where there is usually no linked job).
  payment_type?: string
  site_label?: string | null
  period_label?: string | null
  // Bypass the soft fixed-payment duplicate warning after the operator
  // confirms "create anyway".
  force?: boolean
}

async function requireAdmin(supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  return isAdminUser(user) ? null : 'Admin only.'
}

export async function createContractorInvoice(input: CIInput) {
  const supabase = createClient()
  const gate = await requireAdmin(supabase)
  if (gate) return { error: gate }

  if (!input.contractor_id) return { error: 'Contractor is required.' }
  if (!input.amount || input.amount <= 0) return { error: 'Amount is required.' }

  const paymentType = input.payment_type === 'fixed_contract' ? 'fixed_contract' : 'standard'
  const siteLabel = input.site_label?.trim() || null
  const periodLabel = input.period_label?.trim() || null

  // Lightweight duplicate guard for fixed contract payments: warn (don't
  // hard-block) if this contractor already has a fixed payment for the same
  // site + period, so a monthly payment isn't entered twice by accident.
  if (paymentType === 'fixed_contract' && siteLabel && periodLabel && !input.force) {
    const { data: dupe } = await supabase
      .from('contractor_invoices')
      .select('invoice_number')
      .eq('contractor_id', input.contractor_id)
      .eq('payment_type', 'fixed_contract')
      .eq('site_label', siteLabel)
      .eq('period_label', periodLabel)
      .limit(1)
      .maybeSingle()
    if (dupe) {
      return {
        duplicate: true as const,
        message: `A fixed payment for this contractor at ${siteLabel} for ${periodLabel} already exists (${dupe.invoice_number ?? 'existing payable'}). Create another?`,
      }
    }
  }

  const { data, error } = await supabase
    .from('contractor_invoices')
    .insert({
      contractor_id: input.contractor_id,
      job_id: input.job_id || null,
      amount: input.amount,
      date_submitted: input.date_submitted || new Date().toISOString().slice(0, 10),
      notes: input.notes?.trim() || null,
      status: input.status || 'pending',
      payment_type: paymentType,
      site_label: paymentType === 'fixed_contract' ? siteLabel : null,
      period_label: paymentType === 'fixed_contract' ? periodLabel : null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: `Failed to create: ${error?.message}` }
  redirect(`/portal/contractor-invoices/${data.id}`)
}

// Editing an existing payable goes through the guarded, audited path in
// `_actions-payable-edit.ts` (updateContractorPayable) — never a raw,
// unaudited update. (Admin Full Edit Mode — Stage 4.)

export async function markContractorInvoicePaid(id: string) {
  const supabase = createClient()
  const gate = await requireAdmin(supabase)
  if (gate) return { error: gate }
  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('contractor_invoices')
    .update({ status: 'paid', date_paid: today })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/portal/contractor-invoices/${id}`)
  revalidatePath('/portal/contractor-invoices')
  return { success: true }
}

export async function approveContractorInvoice(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  // Authorise for payment: stamp who/when so a fixed contract payment (or any
  // payable) carries an audit-friendly authorised-by/at. Mirrors the
  // sent_by / created_by pattern on contractor_remittances.
  const { error } = await supabase
    .from('contractor_invoices')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: user?.id ?? null })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/portal/contractor-invoices/${id}`)
  revalidatePath('/portal/contractor-invoices')
  return { success: true }
}
