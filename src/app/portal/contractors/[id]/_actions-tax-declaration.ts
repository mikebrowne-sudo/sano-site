'use server'

// Phase 3 — staff verification of an employee IR330 declaration. This is the
// ONLY path that sets the payroll-applied tax_code from a declaration. It stamps
// the declaration's lifecycle fields (facts stay frozen by the DB trigger),
// completes payroll_tax_verified as staff_verified, and audits.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { recomputeOnboardingStatus } from './_actions-onboarding'

export async function verifyTaxDeclaration(input: {
  declarationId: string
  contractorId: string
  appliedTaxCode: string
  payrollEffectiveDate: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.appliedTaxCode?.trim()) return { error: 'Confirm the payroll tax code to apply.' }
  if (!input.payrollEffectiveDate?.trim()) return { error: 'An effective date is required.' }

  const { data: decl } = await supabase
    .from('worker_tax_declarations')
    .select('id, worker_id, status, declared_tax_code, declaration_number')
    .eq('id', input.declarationId)
    .eq('worker_id', input.contractorId)
    .maybeSingle()
  if (!decl) return { error: 'Declaration not found.' }
  if ((decl as { status: string }).status === 'superseded') return { error: 'This declaration has been superseded — verify the current one.' }

  const nowIso = new Date().toISOString()
  const applied = input.appliedTaxCode.trim()
  const declNumber = (decl as { declaration_number: string }).declaration_number

  // Lifecycle-only update on the declaration (facts frozen by the trigger).
  const { error: dErr } = await supabase
    .from('worker_tax_declarations')
    .update({ status: 'verified', verified_at: nowIso, verified_by: user.id, applied_tax_code: applied, payroll_effective_date: input.payrollEffectiveDate })
    .eq('id', input.declarationId)
  if (dErr) return { error: dErr.message }

  // The ONLY place a declaration sets the payroll-applied tax code.
  await supabase.from('contractors').update({ tax_code: applied, ir330_received: true }).eq('id', input.contractorId)

  // Complete payroll_tax_verified — staff_verified, verifier, effective date,
  // evidence = the declaration reference.
  await supabase
    .from('contractor_onboarding')
    .update({
      status: 'complete', completed_at: nowIso, completed_by: user.id,
      completion_source: 'staff_verified', effective_date: input.payrollEffectiveDate, evidence_ref: declNumber,
    })
    .eq('contractor_id', input.contractorId)
    .eq('item_key', 'payroll_tax_verified')

  await supabase.from('audit_log').insert({
    actor_id: user.id, actor_role: 'admin', action: 'tax_declaration.verified',
    entity_table: 'contractors', entity_id: input.contractorId,
    before: { declaration: declNumber, declared_tax_code: (decl as { declared_tax_code: string }).declared_tax_code },
    after: { applied_tax_code: applied, payroll_effective_date: input.payrollEffectiveDate },
  })

  // Preserve activation gating: advance a new hire whose last required item this was.
  await recomputeOnboardingStatus(supabase, input.contractorId, { actorId: user.id })

  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}
