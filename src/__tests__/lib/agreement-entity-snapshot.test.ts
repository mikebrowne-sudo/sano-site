// Freeze + safeguard invariants for the structure-aware entity/signatory snapshot
// (PR 3). Source-level assertions that lock the guarantees the review requires so
// a later change can't silently regress them.

import { readFileSync } from 'fs'
import { join } from 'path'
import { structureFieldRules } from '@/lib/contractor-structure-fields'

const doc = readFileSync(join(process.cwd(), 'src/components/EmploymentAgreementDocument.tsx'), 'utf8')
const signAction = readFileSync(join(process.cwd(), 'src/app/agreement/[token]/_actions.ts'), 'utf8')

describe('entity/signatory snapshot is frozen (read from the agreement row, written at sign)', () => {
  it('the document maps entity + signatory fields from the agreement row (a.*), never a live contractor join', () => {
    // agreementViewFromRow(a) maps a = employment_agreements row. If these came
    // from a live join they would read c.* — assert they read a.*.
    for (const col of [
      'a.contractor_business_structure', 'a.contractor_legal_name', 'a.contractor_nzbn',
      'a.contractor_company_number', 'a.authorised_signatory_name', 'a.authorised_signatory_capacity',
    ]) {
      expect(doc.includes(col)).toBe(true)
    }
  })

  it('the sign action persists the entity + signatory snapshot onto the agreement', () => {
    for (const col of [
      'contractor_business_structure:', 'contractor_legal_name:', 'contractor_nzbn:',
      'contractor_company_number:', 'authorised_signatory_name:', 'authorised_signatory_capacity:',
    ]) {
      expect(signAction.includes(col)).toBe(true)
    }
  })

  it('a signed agreement is immutable via the token (sign refuses when already signed)', () => {
    expect(signAction).toMatch(/status === 'signed'[\s\S]{0,80}already been signed/)
  })

  it('no staff/portal action writes the signatory or entity columns (staff cannot change the signatory)', () => {
    // Grep the portal agreements actions for any write of the signatory/entity cols.
    const portal = readFileSync(join(process.cwd(), 'src/app/portal/agreements/_actions.ts'), 'utf8')
    for (const col of ['authorised_signatory_name', 'contractor_legal_name', 'contractor_business_structure']) {
      expect(portal.includes(col)).toBe(false)
    }
  })
})

describe('IRD number is not rendered in the signed PDF/document', () => {
  it('the document does not render a Contractor IRD row', () => {
    expect(doc).not.toContain("'Contractor IRD No.'")
  })
})

describe('sole trader is not asked for company-only fields', () => {
  it('sole trader rules hide legal-entity name, company number, signatory', () => {
    const r = structureFieldRules('sole_trader')
    expect(r.legalName.show).toBe(false)
    expect(r.companyNumber.show).toBe(false)
    expect(r.signatory.show).toBe(false)
  })
})
