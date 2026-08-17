// NZ bank account normalisation + shared-payee resolution.
//
// The real case: VMK LTD's account was stored two ways —
//   Kritika  06-0878-0765722-00
//   Anishal  06-0878-0765-722-00
// Identical account, different punctuation. Raw string comparison makes one
// payee look like it has two accounts.
//
// Rule that matters most: when grouped workers genuinely disagree, NEVER pick
// one. Silently choosing an account is how money reaches the wrong place.

import {
  normalizeBankAccount, sameBankAccount, isPlausibleBankAccount,
  formatBankAccount, resolvePayeeBankAccount,
} from '@/lib/bank-account'

const KRITIKA = '06-0878-0765722-00'
const ANISHAL = '06-0878-0765-722-00'   // same account, extra hyphen
const UPASNI = '02-0110-0408111-000'    // 16 digits — 3-digit suffix, valid
const MARINA = '38-9015-011835203'      // no hyphens at all
const OTHER = '12-3074-0009511-00'

describe('normalisation', () => {
  it('strips all formatting to comparable digits', () => {
    expect(normalizeBankAccount(KRITIKA)).toBe('060878076572200')
    expect(normalizeBankAccount(ANISHAL)).toBe('060878076572200')
    expect(normalizeBankAccount('12 3274 0579551 00')).toBe('123274057955100')
  })

  it('handles null/empty without throwing', () => {
    expect(normalizeBankAccount(null)).toBe('')
    expect(normalizeBankAccount(undefined)).toBe('')
    expect(normalizeBankAccount('   ')).toBe('')
  })
})

describe('comparison', () => {
  it('formatting variants of the SAME account compare equal', () => {
    expect(sameBankAccount(KRITIKA, ANISHAL)).toBe(true)
    expect(sameBankAccount('12 3274 0579551 00', '12-3274-0579551-00')).toBe(true)
  })

  it('genuinely different accounts compare different', () => {
    expect(sameBankAccount(KRITIKA, OTHER)).toBe(false)
    expect(sameBankAccount(UPASNI, MARINA)).toBe(false)
  })

  it('a blank account is never equal to anything — unknown must not pass', () => {
    expect(sameBankAccount(null, KRITIKA)).toBe(false)
    expect(sameBankAccount('', '')).toBe(false)
  })
})

describe('plausibility + display', () => {
  it('accepts both 15-digit and 16-digit NZ forms', () => {
    expect(isPlausibleBankAccount(KRITIKA)).toBe(true)   // 15
    expect(isPlausibleBankAccount(UPASNI)).toBe(true)    // 16
  })

  it('rejects lengths it cannot safely interpret', () => {
    expect(isPlausibleBankAccount('123')).toBe(false)
    expect(isPlausibleBankAccount('0608780765722001234')).toBe(false)
  })

  it('formats consistently regardless of stored punctuation', () => {
    expect(formatBankAccount(KRITIKA)).toBe(formatBankAccount(ANISHAL))
    expect(formatBankAccount(MARINA)).toBe('38-9015-0118352-03')
  })

  it('returns the original untouched when it cannot be parsed — never invents digits', () => {
    expect(formatBankAccount('not-an-account')).toBe('not-an-account')
    expect(formatBankAccount('123')).toBe('123')
  })
})

describe('shared payee resolution', () => {
  const src = (name: string, acct: string | null, accountName = 'VMK LTD') => ({
    contractorId: name, contractorName: name, accountName, accountNumber: acct,
  })

  it('matching normalised accounts proceed — the real VMK case', () => {
    const r = resolvePayeeBankAccount([src('Kritika Kumar', KRITIKA), src('Anishal Kumar', ANISHAL)])
    expect(r.status).toBe('ok')
    expect(r.normalized).toBe('060878076572200')
    expect(r.formatted).toBe('06-0878-0765722-00')
    expect(r.accountName).toBe('VMK LTD')
  })

  it('CONFLICTING accounts are blocked and never silently resolved', () => {
    const r = resolvePayeeBankAccount([src('Kritika Kumar', KRITIKA), src('Anishal Kumar', OTHER)])
    expect(r.status).toBe('conflict')
    // The critical assertion: no account is chosen.
    expect(r.normalized).toBeNull()
    expect(r.formatted).toBeNull()
    expect(r.message).toMatch(/need review/i)
    expect(r.variants).toHaveLength(2)
  })

  it('a single contractor is unaffected', () => {
    const r = resolvePayeeBankAccount([src('Marina Rabangaki', MARINA, 'Marina Rabangaki')])
    expect(r.status).toBe('ok')
    expect(r.accountNameDiffersFromWorker).toBe(false)
  })

  it('a company account name does NOT block payment — only flags for display', () => {
    // Upasni Devi pays to "Export and Import Trades Ltd" — legitimate.
    const r = resolvePayeeBankAccount([
      { contractorId: '1', contractorName: 'Upasni Devi', accountName: 'Export and Import Trades Ltd', accountNumber: UPASNI },
    ])
    expect(r.status).toBe('ok')
    expect(r.accountNameDiffersFromWorker).toBe(true)
    expect(r.accountName).toBe('Export and Import Trades Ltd')
  })

  it('reports missing rather than guessing', () => {
    const r = resolvePayeeBankAccount([src('Nobody', null)])
    expect(r.status).toBe('missing')
    expect(r.normalized).toBeNull()
  })

  it('flags an unreadable number instead of correcting it', () => {
    const r = resolvePayeeBankAccount([src('Odd', '12-345')])
    expect(r.status).toBe('unreadable')
    // The stored value is preserved, not rewritten.
    expect(r.normalized).toBe('12345')
  })

  it('ignores members with no account when others agree', () => {
    const r = resolvePayeeBankAccount([src('Kritika Kumar', KRITIKA), src('Anishal Kumar', null)])
    expect(r.status).toBe('ok')
    expect(r.normalized).toBe('060878076572200')
  })
})

describe('pay run integration (source-level)', () => {
  const { readFileSync } = jest.requireActual('fs') as typeof import('fs')
  const { join } = jest.requireActual('path') as typeof import('path')
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  const view = read('src/app/portal/contractor-invoices/pay-run/_components/PayRunView.tsx')
  const planner = read('src/app/portal/contractor-invoices/remittances/_actions-by-contractor.ts')

  it('the planner resolves a bank account per payee group', () => {
    expect(planner).toMatch(/resolvePayeeBankAccount/)
    expect(planner).toMatch(/bank_account_name, bank_account_number/)
  })

  it('Pay Run review displays the resolved account', () => {
    expect(view).toMatch(/g\.bank\.formatted/)
    expect(view).toMatch(/Pay to/)
  })

  it('only a genuine CONFLICT blocks creation', () => {
    expect(view).toMatch(/g\.bank\?\.status === 'conflict'/)
    expect(view).toMatch(/disabled=\{isPending \|\| bankConflicts\.length > 0\}/)
  })

  it('remittances still store NO bank details — payment stays a human step', () => {
    const batch = read('src/app/portal/contractor-invoices/_actions-remittance-batch.ts')
    expect(batch).not.toMatch(/bank_account_number/)
  })
})
