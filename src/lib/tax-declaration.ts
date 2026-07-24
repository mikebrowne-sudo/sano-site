// Employee IR330 electronic tax declaration — immutable record model.
//
// The database record (worker_tax_declarations) is the SOURCE OF TRUTH. This
// module holds the declaration wording + version, masking / validation helpers,
// and the record helper that creates a declaration — superseding any prior one
// and reopening staff verification. Client-agnostic (takes the supabase client)
// so it runs on the service-role client from the token-keyed sign flow.

export const IR330_DECLARATION_VERSION = 'SANO-IR330-2026.07'

// Sano's OWN electronic tax-code declaration wording — the electronic equivalent
// of a paper IR330 tax code declaration, NOT a reproduction of the IRD form or
// its verbatim wording. Stored verbatim on EACH declaration row (frozen), so
// updating this constant never changes the meaning of an already-submitted
// declaration.
export const IR330_DECLARATION_TEXT =
  'This is my electronic tax code declaration for my employment with Sano Property Services Limited, ' +
  'provided in place of a paper IR330 tax code declaration. I have chosen the tax code shown based on my ' +
  'circumstances and understand it determines the PAYE deducted from my pay. ' +
  'I declare that the information I have given in this declaration is true and correct.'

/** Mask an IRD number for summary / general views: 123-456-789 → •••-•••-789. */
export function maskIrd(ird: string | null | undefined): string {
  if (!ird) return '—'
  const digits = ird.replace(/\D/g, '')
  if (digits.length < 3) return '•••'
  return `•••-•••-${digits.slice(-3)}`
}

const SL_TAX_CODES = new Set(['M SL', 'ME SL', 'SB SL', 'S SL', 'SH SL', 'ST SL', 'SA SL'])
export function taxCodeHasStudentLoan(code: string | null | undefined): boolean {
  return SL_TAX_CODES.has((code || '').toUpperCase().trim())
}

export interface TaxDeclarationFacts {
  workerId: string
  employeeLegalName: string
  irdNumber: string | null
  declaredTaxCode: string
  signedName: string
  acknowledged: boolean
  agreementId?: string | null
  submittedVia?: string
}

/** Validate the mandatory declaration inputs. Pure — returns an error or null. */
export function validateTaxDeclaration(f: {
  employeeLegalName?: string | null
  declaredTaxCode?: string | null
  acknowledged?: boolean
  signedName?: string | null
}): string | null {
  if (!f.employeeLegalName?.trim()) return 'Your legal name is required for the tax declaration.'
  if (!f.declaredTaxCode?.trim()) return 'Please choose your tax code.'
  if (!f.acknowledged) return 'You must confirm the tax code declaration to continue.'
  if (!f.signedName?.trim()) return 'An electronic signature is required.'
  return null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any

export interface RecordDeclarationResult { id: string; declarationNumber: string; supersededId: string | null }

/**
 * Create an immutable IR330 declaration for a worker. If the worker already has
 * a current (non-superseded) declaration it is superseded, and
 * payroll_tax_verified is reopened for staff review. The payroll-applied tax
 * code is NEVER changed here — that happens only at staff verification.
 */
export async function recordTaxDeclaration(
  client: AnyClient,
  facts: TaxDeclarationFacts,
): Promise<{ ok: true; declaration: RecordDeclarationResult } | { error: string }> {
  const err = validateTaxDeclaration(facts)
  if (err) return { error: err }

  // Existing current declaration to supersede (at most one — partial unique idx).
  const { data: current } = await client
    .from('worker_tax_declarations')
    .select('id')
    .eq('worker_id', facts.workerId)
    .neq('status', 'superseded')
    .maybeSingle()
  const priorId: string | null = (current?.id as string | null) ?? null

  const { data: created, error: insErr } = await client
    .from('worker_tax_declarations')
    .insert({
      worker_id: facts.workerId,
      declaration_type: 'ir330',
      declaration_version: IR330_DECLARATION_VERSION,
      employee_legal_name: facts.employeeLegalName.trim(),
      ird_number: facts.irdNumber?.trim() || null,
      declared_tax_code: facts.declaredTaxCode.trim(),
      has_student_loan: taxCodeHasStudentLoan(facts.declaredTaxCode),
      declaration_text: IR330_DECLARATION_TEXT,
      acknowledged: !!facts.acknowledged,
      signed_name: facts.signedName.trim(),
      submitted_via: facts.submittedVia || 'agreement_wizard',
      agreement_id: facts.agreementId ?? null,
      supersedes_declaration_id: priorId,
      status: 'submitted',
    })
    .select('id, declaration_number')
    .single()
  if (insErr || !created) return { error: `Couldn’t record the tax declaration: ${insErr?.message ?? 'no row'}` }

  const newId = created.id as string
  const nowIso = new Date().toISOString()

  if (priorId) {
    // Supersede the prior declaration (lifecycle-only update — facts frozen).
    await client
      .from('worker_tax_declarations')
      .update({ status: 'superseded', superseded_at: nowIso, superseded_by_declaration_id: newId })
      .eq('id', priorId)
    // Reopen staff verification; do NOT touch the applied payroll code.
    await client
      .from('contractor_onboarding')
      .update({
        status: 'pending', completed_at: null, completed_by: null, completion_source: null,
        override_reason: null, override_by: null, effective_date: null, confirmed_by: null, evidence_ref: null,
      })
      .eq('contractor_id', facts.workerId)
      .eq('item_key', 'payroll_tax_verified')
  }

  // Complete ir330_supplied, sourced worker_submitted, pointing at THIS declaration.
  await client
    .from('contractor_onboarding')
    .update({
      status: 'complete', completed_at: nowIso, completed_by: null,
      completion_source: 'worker_submitted', evidence_ref: created.declaration_number,
    })
    .eq('contractor_id', facts.workerId)
    .eq('item_key', 'ir330_supplied')

  // Audit creation + (where applicable) supersession + verification reopening.
  // System actor (service-role sign flow). No IRD number in the audit record.
  await client.from('audit_log').insert({
    actor_id: null,
    actor_role: 'system',
    action: priorId ? 'tax_declaration.superseded' : 'tax_declaration.created',
    entity_table: 'contractors',
    entity_id: facts.workerId,
    before: priorId ? { superseded_declaration_id: priorId } : {},
    after: {
      declaration: created.declaration_number,
      supersedes_declaration_id: priorId,
      ir330_supplied: 'completed',
      payroll_tax_verified_reopened: !!priorId,
    },
  })

  return { ok: true, declaration: { id: newId, declarationNumber: created.declaration_number as string, supersededId: priorId } }
}
