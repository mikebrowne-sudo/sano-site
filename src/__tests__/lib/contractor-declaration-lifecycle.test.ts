import { selectDeclarationForDate, type DeclarationStatus, type DeclarationType } from '@/lib/contractor-tax-declaration'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = { id: string; status: DeclarationStatus; declarationType: DeclarationType; effectiveDate: string | null; expiryDate: string | null }
const row = (p: Partial<Row> & { id: string }): Row => ({ status: 'verified', declarationType: 'contractor_chosen', effectiveDate: null, expiryDate: null, ...p })

describe('selectDeclarationForDate — date-based, not newest', () => {
  const prior = row({ id: 'prior', status: 'verified', effectiveDate: '2026-01-01', expiryDate: null })
  const replacement = row({ id: 'repl', status: 'verified', effectiveDate: '2026-08-01', expiryDate: null }) // future-effective

  it('a future-effective verified replacement does NOT apply before its effective date', () => {
    // On 2026-07-31 the prior declaration still applies.
    expect(selectDeclarationForDate([prior, replacement], '2026-07-31')?.id).toBe('prior')
  })

  it('the replacement applies from its effective date', () => {
    expect(selectDeclarationForDate([prior, replacement], '2026-08-01')?.id).toBe('repl')
    expect(selectDeclarationForDate([prior, replacement], '2026-09-15')?.id).toBe('repl')
  })

  it('a historical date resolves the declaration in force then', () => {
    expect(selectDeclarationForDate([prior, replacement], '2026-03-01')?.id).toBe('prior')
  })

  it('ignores submitted / rejected / superseded rows (only verified apply)', () => {
    const pending = row({ id: 'pending', status: 'submitted', effectiveDate: '2026-01-01' })
    expect(selectDeclarationForDate([pending], '2026-07-31')).toBeNull()
    const superseded = row({ id: 'old', status: 'superseded', effectiveDate: '2026-01-01' })
    expect(selectDeclarationForDate([superseded], '2026-07-31')).toBeNull()
  })

  it('respects expiry — an expired verified declaration does not apply after expiry', () => {
    const expiring = row({ id: 'ex', status: 'verified', declarationType: 'exemption', effectiveDate: '2026-01-01', expiryDate: '2026-06-30' })
    expect(selectDeclarationForDate([expiring], '2026-05-01')?.id).toBe('ex')
    expect(selectDeclarationForDate([expiring], '2026-07-31')).toBeNull()
  })

  it('a verified row with no effective date is ignored (defensive)', () => {
    expect(selectDeclarationForDate([row({ id: 'x', status: 'verified', effectiveDate: null })], '2026-07-31')).toBeNull()
  })
})

// ── Lifecycle contract (source-level) ───────────────────────────────────────
const staffAction = readFileSync(join(process.cwd(), 'src/app/portal/contractors/[id]/tax/_actions.ts'), 'utf8')
const contractorAction = readFileSync(join(process.cwd(), 'src/app/contractor-setup/[token]/_tax-actions.ts'), 'utf8')

describe('a verified declaration + a pending replacement coexist', () => {
  it('the staff submit-only path supersedes only a prior SUBMITTED row, never the verified one', () => {
    // The pending-clear only targets status = 'submitted'.
    expect(staffAction).toMatch(/priorSubmitted[\s\S]*?\.eq\('status',\s*'submitted'\)/)
    // verify-now is the only path that supersedes the prior VERIFIED row.
    expect(staffAction).toMatch(/if\s*\(input\.verifyNow && priorVerified\?\.id\)/)
  })

  it('the contractor submission never touches the verified declaration', () => {
    expect(contractorAction).toMatch(/\.eq\('status',\s*'submitted'\)/)
    // it must not select or supersede a verified row.
    expect(contractorAction).not.toMatch(/'verified'/)
  })
})

describe('verifying a replacement atomically supersedes the prior verified (both pointers)', () => {
  it('setDeclarationStatus verify supersedes the prior verified-current row', () => {
    expect(staffAction).toMatch(/priorVerified[\s\S]*?\.eq\('status',\s*'verified'\)[\s\S]*?\.is\('superseded_at',\s*null\)/)
    // new row gets supersedes_id; old row gets status superseded + superseded_by_id.
    expect(staffAction).toMatch(/supersedes_id:\s*priorVerified\?\.id/)
    expect(staffAction).toMatch(/status:\s*'superseded'[\s\S]*superseded_by_id:\s*declarationId/)
  })

  it('rejecting a replacement leaves the verified declaration untouched', () => {
    // The reject branch only updates the submitted row to rejected — no supersede.
    expect(staffAction).toMatch(/status:\s*'rejected'[\s\S]*?review_notes/)
    expect(staffAction).toMatch(/if\s*\(status === 'rejected'\)/)
  })
})

describe('migration: split indexes + consistency + completeness constraints', () => {
  const sql = readFileSync(join(process.cwd(), 'docs/db/2026-07-31-contractor-tax-declarations.sql'), 'utf8')

  it('has SEPARATE one-submitted and one-current-verified partial indexes', () => {
    expect(sql).toMatch(/ctd_one_submitted_per_contractor[\s\S]*where status = 'submitted'/)
    expect(sql).toMatch(/ctd_one_current_verified_per_contractor[\s\S]*where status = 'verified' and superseded_at is null/)
    // and NOT the old conflated index.
    expect(sql).not.toMatch(/where status in \('submitted','verified'\)/)
  })

  it('has the required consistency CHECK constraints', () => {
    for (const c of ['ctd_rate_range_chk', 'ctd_type_rate_chk', 'ctd_expiry_after_effective_chk', 'ctd_tailored_cert_chk', 'ctd_exemption_cert_chk', 'ctd_verified_complete_chk']) {
      expect(sql).toContain(c)
    }
  })

  it('the verified-complete CHECK requires effective/signed/text/version/verified', () => {
    expect(sql).toMatch(/status <> 'verified' or \([\s\S]*effective_date is not null[\s\S]*signed_name is not null and signed_at is not null[\s\S]*declaration_text is not null and declaration_version is not null[\s\S]*verified_at is not null and verified_by is not null/)
  })
})

describe('app-level verified-completeness guard', () => {
  it('verify requires effective date + signature + wording', () => {
    expect(staffAction).toMatch(/Set an effective date before verifying/)
    expect(staffAction).toMatch(/must be signed/)
    expect(staffAction).toMatch(/wording\/version is missing/)
  })
  it('verify-now record also enforces effective date + signature', () => {
    expect(staffAction).toMatch(/A verified declaration needs an effective date/)
  })
})
