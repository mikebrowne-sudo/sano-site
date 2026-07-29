// Security + safeguard invariants for the contractor IR330C declaration workflow
// (PR 4). Source-level assertions that lock the guarantees the spec requires so a
// later change can't silently regress them.

import { readFileSync } from 'fs'
import { join } from 'path'
import { computeReadiness, type SectionStatusMap } from '@/lib/contractor-setup-status'

const contractorTaxAction = readFileSync(join(process.cwd(), 'src/app/contractor-setup/[token]/_tax-actions.ts'), 'utf8')
const taxData = readFileSync(join(process.cwd(), 'src/lib/contractor-tax-declaration-data.ts'), 'utf8')
const contractorForm = readFileSync(join(process.cwd(), 'src/app/contractor-setup/[token]/_components/TaxDeclarationForm.tsx'), 'utf8')

describe('contractor cannot self-verify or bypass review', () => {
  it("the contractor submission always writes status: 'submitted' and never 'verified'", () => {
    expect(contractorTaxAction).toMatch(/status:\s*'submitted'/)
    // No path in the contractor action sets verified.
    expect(contractorTaxAction).not.toMatch(/status:\s*'verified'/)
    expect(contractorTaxAction).not.toContain('verified_at:')
    expect(contractorTaxAction).not.toContain('verified_by:')
  })

  it('the contractor action forces source = contractor_submitted', () => {
    expect(contractorTaxAction).toMatch(/source:\s*'contractor_submitted'/)
  })
})

describe('contractor cannot classify schedule tax treatment', () => {
  it('the contractor token module never writes tax_treatment on a schedule', () => {
    expect(contractorTaxAction).not.toContain('tax_treatment')
    // (schedule classification lives only in the admin-gated portal tax actions)
  })
})

describe('token route exposes only contractor-safe declaration fields', () => {
  it('the safe view type/select excludes verification + review + internal refs', () => {
    // The contractor-safe select must NOT pull review_notes / verified_* / evidence_ref
    // / created_by. Find the getContractorSafeDeclarationByToken select.
    const start = taxData.indexOf('getContractorSafeDeclarationByToken')
    const region = taxData.slice(start)
    const selectMatch = region.match(/\.select\('([^']*)'\)/)
    const cols = selectMatch?.[1] ?? ''
    for (const forbidden of ['review_notes', 'verified_at', 'verified_by', 'evidence_ref', 'created_by', 'supersedes_id']) {
      expect(cols.includes(forbidden)).toBe(false)
    }
    // And the safe interface itself must not carry them.
    for (const forbidden of ['reviewNotes', 'verifiedAt', 'verifiedBy', 'evidenceRef']) {
      // The ContractorSafeDeclaration interface block.
      const ifaceStart = taxData.indexOf('export interface ContractorSafeDeclaration')
      const iface = taxData.slice(ifaceStart, taxData.indexOf('}', ifaceStart))
      expect(iface.includes(forbidden)).toBe(false)
    }
  })

  it('the token read is length-guarded and status-gated (generic errors, no enumeration)', () => {
    expect(taxData).toMatch(/token\.length < 16/)
    expect(taxData).toMatch(/OPEN\.has/)
  })

  it('the contractor form imports only the safe declaration type (never the full record)', () => {
    expect(contractorForm).toContain('ContractorSafeDeclaration')
    expect(contractorForm).not.toContain('FullDeclaration')
  })
})

describe('immutable + superseding declaration model (staff action contract)', () => {
  const staffAction = readFileSync(join(process.cwd(), 'src/app/portal/contractors/[id]/tax/_actions.ts'), 'utf8')

  it('recordDeclaration supersedes the prior current row (never overwrites it)', () => {
    expect(staffAction).toMatch(/status:\s*'superseded'/)
    expect(staffAction).toContain('superseded_by_id')
    // A new row is INSERTED, not an update of the old facts.
    expect(staffAction).toMatch(/\.insert\(\{[\s\S]*declaration_type:/)
  })

  it('verify/reject only acts on a submitted declaration (a verified one is not re-verified/overwritten)', () => {
    // The status change is guarded to submitted rows on both the read and the update.
    expect(staffAction).toMatch(/status !== 'submitted'/)
    expect(staffAction).toMatch(/\.eq\('status',\s*'submitted'\)/)
  })

  it('verification actions are audited with old and new status', () => {
    expect(staffAction).toMatch(/before:\s*\{\s*status:\s*'submitted'\s*\}/)
    expect(staffAction).toMatch(/contractor_tax_declaration\.\$\{status\}/)
  })

  it('setScheduleTaxTreatment is admin-gated and scoped to the contractor', () => {
    expect(staffAction).toMatch(/if\s*\(!user\)\s*return\s*\{\s*error:\s*'Admin only\.'/)
    expect(staffAction).toMatch(/\.eq\('contractor_id',\s*contractorId\)/)
  })
})

describe('tax gate readiness — per-schedule, not universal', () => {
  const settled: SectionStatusMap = {
    identity: 'verified', structure: 'verified', service_schedules: 'verified',
    banking: 'verified', insurance: 'not_applicable', gst: 'not_applicable',
    tax_declaration: 'blocked_pending_workflow', agreement_acceptance: 'verified',
  }

  it('a blocked schedule keeps the setup NOT payment-ready even if the raw section says otherwise', () => {
    const r = computeReadiness(settled, {
      schedular: true,
      taxGate: { allClear: false, blocked: [{ name: 'Residential cleaning', reason: 'not classified' }] },
    })
    expect(r.paymentReady).toBe(false)
    expect(r.blockers.some((b) => b.section === 'tax_declaration' && b.reason.includes('Residential cleaning'))).toBe(true)
  })

  it('allClear tax gate satisfies the tax section regardless of the raw section-status value', () => {
    const r = computeReadiness(settled, { schedular: true, taxGate: { allClear: true, blocked: [] } })
    expect(r.paymentReady).toBe(true)
  })
})
