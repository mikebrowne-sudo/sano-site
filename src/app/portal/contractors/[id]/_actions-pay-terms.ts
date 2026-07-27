'use server'

// Save a new effective-dated version of an employee's pay terms. Changing hours,
// rate, pattern, frequency, payday or basis NEVER mutates the current row — it
// inserts a new version and closes the prior current one (effective_to = the day
// before the new version). Admin-only; service-role write after the gate;
// audited. Historical pay runs keep their own snapshot, so closing a version can
// never alter a past run.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { supersedeDate, type PayFrequency, type PayBasis } from '@/lib/payroll/pay-terms'

export interface SavePayTermsInput {
  workerId: string
  standardWeeklyHours: number
  hourlyRate: number
  workingPattern?: string | null
  payFrequency: PayFrequency
  payday: string
  basis: PayBasis
  effectiveFrom: string // 'YYYY-MM-DD'
}

export async function saveEmployeePayTerms(input: SavePayTermsInput): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  // Validate.
  if (!(input.standardWeeklyHours > 0)) return { error: 'Standard weekly hours must be greater than zero.' }
  if (!(input.hourlyRate > 0)) return { error: 'Hourly rate must be greater than zero.' }
  if (!['weekly', 'fortnightly'].includes(input.payFrequency)) return { error: 'Invalid pay frequency.' }
  if (!['advance', 'arrears'].includes(input.basis)) return { error: 'Invalid pay basis.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) return { error: 'Enter a valid effective date.' }

  const svc = getServiceSupabase()

  const { data: worker } = await svc
    .from('contractors')
    .select('id, worker_type')
    .eq('id', input.workerId)
    .maybeSingle()
  if (!worker) return { error: 'Employee not found.' }
  if ((worker as { worker_type?: string }).worker_type !== 'employee') return { error: 'Pay terms apply to employees only.' }

  // Close the current version (if any). The new version must start after it.
  const { data: current } = await svc
    .from('employee_pay_terms')
    .select('id, effective_from')
    .eq('contractor_id', input.workerId)
    .is('effective_to', null)
    .maybeSingle()

  if (current) {
    const cur = current as { id: string; effective_from: string }
    if (input.effectiveFrom <= cur.effective_from) {
      return { error: `The new terms must take effect after the current version (${cur.effective_from}).` }
    }
    const { error: closeErr } = await svc
      .from('employee_pay_terms')
      .update({ effective_to: supersedeDate(input.effectiveFrom) })
      .eq('id', cur.id)
    if (closeErr) return { error: `Couldn’t close the current terms: ${closeErr.message}` }
  }

  const { error: insErr } = await svc.from('employee_pay_terms').insert({
    contractor_id: input.workerId,
    standard_weekly_hours: input.standardWeeklyHours,
    hourly_rate: input.hourlyRate,
    working_pattern: input.workingPattern?.trim() || null,
    pay_frequency: input.payFrequency,
    payday: input.payday,
    basis: input.basis,
    effective_from: input.effectiveFrom,
    created_by: user.id,
  })
  if (insErr) return { error: `Couldn’t save the new terms: ${insErr.message}` }

  // Audit (best-effort — reuse the general audit log).
  try {
    await svc.from('audit_log').insert({
      entity_table: 'employee_pay_terms',
      entity_id: input.workerId,
      action: 'pay_terms_version_created',
      detail: `New pay terms from ${input.effectiveFrom}: ${input.standardWeeklyHours}h × $${input.hourlyRate}/hr, ${input.payFrequency}, ${input.basis}.`,
      performed_by: user.id,
    })
  } catch { /* audit_log shape varies; never block the save */ }

  revalidatePath(`/portal/contractors/${input.workerId}`)
  return { ok: true }
}
