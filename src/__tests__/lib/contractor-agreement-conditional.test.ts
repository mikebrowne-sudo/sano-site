import { readFileSync } from 'fs'
import { join } from 'path'
import { agreementSections, buildContractorSections } from '@/lib/employment-agreement-content'
import { contractorSafeInsuranceSnapshot, type InsuranceArrangement } from '@/lib/contractor-setup-data'

const contractorText = (opts?: Parameters<typeof buildContractorSections>[0]) =>
  buildContractorSections(opts).map((s) => `${s.title}\n${s.body.join('\n')}`).join('\n\n')

const clause = (opts: Parameters<typeof buildContractorSections>[0], startsWith: string) =>
  buildContractorSections(opts).find((s) => s.title.startsWith(startsWith))!.body.join(' ')

describe('clause 2 — ongoing schedule vs ad-hoc', () => {
  it('WITHOUT an ongoing schedule keeps the ad-hoc "no guaranteed or regular work" wording', () => {
    expect(clause({ hasOngoingSchedule: false }, '2.')).toMatch(/no guaranteed or regular work/)
  })
  it('WITH an ongoing schedule removes "no guaranteed or regular work" and reflects the accepted commitment', () => {
    const c2 = clause({ hasOngoingSchedule: true }, '2.')
    expect(c2).not.toMatch(/no guaranteed or regular work/)
    expect(c2).toMatch(/set out in the service schedules attached/)
    expect(c2).toMatch(/in accordance with its agreed frequency, scope and term/)
  })
  it('additional work remains optional even with an ongoing schedule', () => {
    const c2 = clause({ hasOngoingSchedule: true }, '2.')
    expect(c2).toMatch(/may accept or decline any additional job/)
    expect(c2).toMatch(/not required to offer any minimum amount of additional work/)
    expect(c2).toMatch(/Declining additional work will not, by itself, result in any penalty/)
  })
})

describe('clause 5.1 — GST defers to the schedule', () => {
  it('no longer states every agreed rate is GST inclusive', () => {
    const c5 = clause({}, '5.')
    expect(c5).not.toMatch(/The agreed rate is inclusive of GST/)
    expect(c5).toMatch(/Each schedule will state whether the fee is GST-inclusive or GST-exclusive/)
    expect(c5).toMatch(/GST is payable only where the Contractor is registered for GST/)
  })
  it('keeps clause 5.3 (IR330C / schedular withholding)', () => {
    expect(clause({}, '5.')).toMatch(/IR330C/)
    expect(clause({}, '5.')).toMatch(/schedular payments under the Income Tax Act 2007/)
  })
})

describe('clause 9 — insurance reflects the arrangement', () => {
  it('covered_by_sano: not required to hold own cover; no "does not extend to you"', () => {
    const c9 = clause({ insuranceMode: 'covered_by_sano' }, '9.')
    expect(c9).toMatch(/included under the Principal’s insurance arrangement/)
    expect(c9).toMatch(/not required to maintain separate public liability insurance/)
    expect(c9).not.toMatch(/does not extend to the Contractor/)
    expect(c9).not.toMatch(/minimum requirement is/)
  })
  it('own_required: keeps the own-insurance requirement (with the min cover)', () => {
    const c9 = clause({ insuranceMode: 'own_required', insuranceMinCover: 1000000 }, '9.')
    expect(c9).toMatch(/must hold and maintain current public liability insurance/)
    expect(c9).toMatch(/\$1,000,000/)
  })
  it('not_required: neutral wording, subject to written review', () => {
    const c9 = clause({ insuranceMode: 'not_required' }, '9.')
    expect(c9).toMatch(/not currently required/)
    expect(c9).toMatch(/subject to written review/)
    expect(c9).not.toMatch(/does not extend to the Contractor/)
  })
  it('default (no mode) falls back to the own-insurance requirement (safe)', () => {
    expect(clause({}, '9.')).toMatch(/must hold and maintain current public liability insurance/)
  })
  it('never leaks insurer / policy-number / internal-note wording in any insurance mode', () => {
    for (const mode of ['own_required', 'covered_by_sano', 'not_required'] as const) {
      const t = contractorText({ insuranceMode: mode })
      // The clauses speak only of "the Principal's insurance arrangement" — never
      // a policy number or internal insurer reference. (Note clause 9.1 legitimately
      // says "recorded and confirmed by the Principal" — that's contractor-facing.)
      expect(t.toLowerCase()).not.toMatch(/policy number|internal reference|internal evidence|policy #/)
    }
  })
})

describe('agreementSections(type, opts) — employees unaffected', () => {
  it('permanent/casual return unchanged regardless of opts', () => {
    const a = agreementSections('permanent_employee')
    const b = agreementSections('permanent_employee', { hasOngoingSchedule: true, insuranceMode: 'covered_by_sano' })
    expect(a).toEqual(b)
  })
})

describe('contractorSafeInsuranceSnapshot — contractor-safe fields only', () => {
  const full: InsuranceArrangement = {
    id: 'i1', scope: 'contractor_default', serviceScheduleId: null, mode: 'covered_by_sano',
    requiredType: 'public_liability', minCover: 1000000, insurer: 'ACME Insure', policyNumber: 'POL-999',
    effectiveDate: '2026-01-01', expiryDate: null, verificationStatus: 'verified', sanoPolicyRef: 'SANO-1',
    coverType: 'public_liability', coverLimit: 5000000, confirmedAt: '2026-01-02', notes: 'internal note', status: 'current',
  }
  it('returns only mode/minCover/requiredType — never insurer/policy/limit/notes', () => {
    const snap = contractorSafeInsuranceSnapshot(full)
    expect(snap).toEqual({ mode: 'covered_by_sano', minCover: null, requiredType: null })
    expect(JSON.stringify(snap)).not.toMatch(/ACME|POL-999|SANO-1|internal note|5000000/)
  })
  it('own_required keeps minCover + requiredType', () => {
    expect(contractorSafeInsuranceSnapshot({ ...full, mode: 'own_required' }))
      .toEqual({ mode: 'own_required', minCover: 1000000, requiredType: 'public_liability' })
  })
  it('null arrangement → null', () => {
    expect(contractorSafeInsuranceSnapshot(null)).toBeNull()
  })
})

describe('send-time wiring + draft parity (source-level)', () => {
  const send = readFileSync(join(process.cwd(), 'src/app/portal/agreements/_actions.ts'), 'utf8')
  const detail = readFileSync(join(process.cwd(), 'src/app/portal/agreements/[id]/page.tsx'), 'utf8')
  const print = readFileSync(join(process.cwd(), 'src/app/portal/agreements/[id]/print/page.tsx'), 'utf8')
  const publicSign = readFileSync(join(process.cwd(), 'src/app/agreement/[token]/page.tsx'), 'utf8')
  const migration = readFileSync(join(process.cwd(), 'docs/db/2026-08-05-agreement-insurance-snapshot.sql'), 'utf8')

  it('send blocks a pending_review insurance arrangement', () => {
    expect(send).toMatch(/insuranceDefault\?\.mode === 'pending_review'/)
    expect(send).toMatch(/pending review/)
  })
  it('send freezes the contractor-safe insurance snapshot', () => {
    expect(send).toMatch(/insurance_arrangement_snapshot: insuranceSnapshot/)
    expect(send).toMatch(/contractorSafeInsuranceSnapshot/)
  })
  it('draft detail + print BOTH use the shared live view (parity)', () => {
    expect(detail).toMatch(/liveDraftAgreementView/)
    expect(print).toMatch(/liveDraftAgreementView/)
  })
  it('the public sign page does NOT live-compute (frozen snapshot only)', () => {
    expect(publicSign).not.toMatch(/liveDraftAgreementView/)
    expect(publicSign).not.toMatch(/buildAgreementScheduleSnapshot/)
  })
  it('migration adds the insurance snapshot column (jsonb, additive)', () => {
    expect(migration).toMatch(/add column if not exists insurance_arrangement_snapshot jsonb/)
    expect(migration).toMatch(/contractor-facing fields ONLY|CONTRACTOR-FACING FIELDS ONLY/i)
  })
})
