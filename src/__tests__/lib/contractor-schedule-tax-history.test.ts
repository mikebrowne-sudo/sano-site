// Regression: service-schedule tax classification is part of the effective-dated
// schedule version. Draft edits in place; ACTIVE changes SUPERSEDE (never mutate),
// with who/when/which-version recorded. Plus declaration-applicability fields.

import { readFileSync } from 'fs'
import { join } from 'path'
import { classificationChangeMode } from '@/lib/contractor-tax-gate'

describe('classificationChangeMode (pure rule)', () => {
  it('draft → edit in place', () => {
    expect(classificationChangeMode('draft')).toBe('edit_in_place')
  })
  it('active / paused → supersede (never mutate in place)', () => {
    expect(classificationChangeMode('active')).toBe('supersede')
    expect(classificationChangeMode('paused')).toBe('supersede')
  })
  it('superseded / ended / unknown → rejected (not the current version)', () => {
    expect(classificationChangeMode('superseded')).toBe('rejected')
    expect(classificationChangeMode('ended')).toBe('rejected')
    expect(classificationChangeMode(null)).toBe('rejected')
  })
})

describe('setScheduleTaxTreatment — supersede-not-mutate (action contract)', () => {
  const action = readFileSync(join(process.cwd(), 'src/app/portal/contractors/[id]/tax/_actions.ts'), 'utf8')

  it('an ACTIVE schedule inserts a NEW version and marks the old one superseded (no in-place tax change)', () => {
    // supersede branch clones + inserts a new row…
    expect(action).toMatch(/\.insert\(clone\)/)
    // …sets effective_from + supersedes_id on the new version…
    expect(action).toMatch(/clone\.effective_from\s*=/)
    expect(action).toMatch(/clone\.supersedes_id\s*=\s*scheduleId/)
    // …and marks the OLD row superseded with a forward pointer.
    expect(action).toMatch(/status:\s*'superseded'[\s\S]*superseded_by:\s*newRow\.id/)
  })

  it('records who/when + which version it superseded (audited)', () => {
    expect(action).toMatch(/contractor_schedule\.tax_treatment_superseded/)
    expect(action).toMatch(/effective_from:\s*effIso/)
    expect(action).toMatch(/supersedes:\s*scheduleId/)
    // actor is recorded on the audit + the new version's created_by/approved_by.
    expect(action).toMatch(/clone\.created_by\s*=\s*user\.id/)
  })

  it('a DRAFT edits in place (classification is part of the version being built)', () => {
    expect(action).toMatch(/if\s*\(mode === 'edit_in_place'\)/)
  })

  it('the contractor cannot reach schedule classification (admin-gated only)', () => {
    expect(action).toMatch(/if\s*\(!user\)\s*return\s*\{\s*error:\s*'Admin only\.'/)
    // and the contractor token module never touches tax_treatment (asserted in
    // contractor-tax-security.test.ts).
  })
})

describe('agreement snapshot preserves the accepted tax classification (internal)', () => {
  const blocks = readFileSync(join(process.cwd(), 'src/lib/agreement-schedule-blocks.ts'), 'utf8')
  const snap = readFileSync(join(process.cwd(), 'src/lib/agreement-schedule-snapshot.ts'), 'utf8')
  const doc = readFileSync(join(process.cwd(), 'src/components/EmploymentAgreementDocument.tsx'), 'utf8')

  it('the schedule block carries taxTreatment and the snapshot selects/maps tax_treatment', () => {
    expect(blocks).toContain('taxTreatment')
    expect(snap).toContain('tax_treatment')
    expect(snap).toMatch(/taxTreatment:\s*\(r\.tax_treatment/)
  })

  it('taxTreatment is INTERNAL — not rendered in the general signed document/PDF', () => {
    // The document must not print the block's taxTreatment in a detail row.
    expect(doc).not.toMatch(/\.taxTreatment/)
  })
})

describe('declaration applicability — enough to select the declaration valid on a date', () => {
  const data = readFileSync(join(process.cwd(), 'src/lib/contractor-tax-declaration-data.ts'), 'utf8')
  const decl = readFileSync(join(process.cwd(), 'src/lib/contractor-tax-declaration.ts'), 'utf8')

  it('the full declaration record exposes effective/expiry/status/type/verified + supersession lineage', () => {
    for (const f of ['effectiveDate', 'expiryDate', 'status', 'declarationType', 'verifiedAt', 'supersedesId', 'supersededAt', 'contractingEntityType', 'contractingLegalName']) {
      expect(data).toContain(f)
    }
  })

  it('declarationTaxState keys off status + expiry (not "whatever is current today")', () => {
    // A verified-but-expired certificate does not satisfy → date-aware selection.
    expect(decl).toMatch(/isDeclarationExpired/)
    // status is examined (submitted/rejected/superseded gate out before verified).
    expect(decl).toMatch(/d\.status === 'submitted'/)
    expect(decl).toMatch(/d\.status === 'superseded'/)
  })
})
