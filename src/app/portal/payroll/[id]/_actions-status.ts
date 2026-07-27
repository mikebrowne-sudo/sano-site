'use server'

// Pay-run workflow ticks that keep the three obligations SEPARATE:
//   - markIrdCompared:     records the IRD-calculator/IR340 comparison (readiness)
//   - markFilingSubmitted / markFilingAccepted: payday-filing status only
//   - markEmpRegistered:   flips Sano's EMP registration once IRD activates it
// None of these touch employee payment status or the IRD remittance ledger.
// Admin-only; service-role write after the gate; audited.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

type Result = { ok?: true; error?: string }

async function adminGate(): Promise<{ error?: string; userId?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  return { userId: user.id }
}

async function audit(action: string, entityId: string, detail: string, userId?: string) {
  try {
    await getServiceSupabase().from('audit_log').insert({
      entity_table: 'pay_runs', entity_id: entityId, action, detail, performed_by: userId ?? null,
    })
  } catch { /* audit shape varies; never block */ }
}

export async function markIrdCompared(input: { runId: string; note?: string }): Promise<Result> {
  const g = await adminGate()
  if (g.error) return { error: g.error }
  const { error } = await getServiceSupabase().from('pay_runs')
    .update({ ird_compared_at: new Date().toISOString(), ird_compared_note: input.note?.trim() || null })
    .eq('id', input.runId)
  if (error) return { error: error.message }
  await audit('ird_comparison_confirmed', input.runId, input.note?.trim() || 'Compared to IRD calculator / IR340.', g.userId)
  revalidatePath(`/portal/payroll/${input.runId}`)
  return { ok: true }
}

export async function markFilingSubmitted(input: { runId: string }): Promise<Result> {
  const g = await adminGate()
  if (g.error) return { error: g.error }
  const { error } = await getServiceSupabase().from('pay_runs')
    .update({ payday_filing_status: 'submitted', payday_filing_submitted_at: new Date().toISOString() })
    .eq('id', input.runId)
  if (error) return { error: error.message }
  await audit('payday_filing_submitted', input.runId, 'Payday filing (IR348) submitted to IRD.', g.userId)
  revalidatePath(`/portal/payroll/${input.runId}`)
  return { ok: true }
}

export async function markFilingAccepted(input: { runId: string }): Promise<Result> {
  const g = await adminGate()
  if (g.error) return { error: g.error }
  const { error } = await getServiceSupabase().from('pay_runs')
    .update({ payday_filing_status: 'accepted', payday_filing_accepted_at: new Date().toISOString() })
    .eq('id', input.runId)
  if (error) return { error: error.message }
  await audit('payday_filing_accepted', input.runId, 'IRD accepted the payday filing.', g.userId)
  revalidatePath(`/portal/payroll/${input.runId}`)
  return { ok: true }
}

export async function markEmpRegistered(input: { runId: string; registered: boolean; note?: string }): Promise<Result> {
  const g = await adminGate()
  if (g.error) return { error: g.error }
  const svc = getServiceSupabase()
  // workforce_settings is a single-row settings table.
  const { data: row } = await svc.from('workforce_settings').select('id').limit(1).maybeSingle()
  const patch = { emp_registered: input.registered, emp_note: input.note?.trim() || null }
  const { error } = row
    ? await svc.from('workforce_settings').update(patch).eq('id', (row as { id: string }).id)
    : await svc.from('workforce_settings').insert(patch)
  if (error) return { error: error.message }
  await audit('emp_registration_updated', input.runId, input.registered ? 'EMP registration marked active.' : 'EMP registration marked pending.', g.userId)
  revalidatePath(`/portal/payroll/${input.runId}`)
  return { ok: true }
}
