import {
  cleanExpensePayee,
  expensePayeeTokens,
  matchExpenseVendor,
  type VendorCandidate,
} from '@/lib/expense-vendor-match'

// The real vendor list from the expenses table.
const VENDORS: VendorCandidate[] = [
  { vendor: 'Google Workspace', category: 'software_subscriptions', gst_inclusive: true },
  { vendor: 'Elantis', category: 'insurance', gst_inclusive: true },
  { vendor: 'Weathpoint', category: 'insurance', gst_inclusive: true },
  { vendor: 'Microsoft Office', category: 'software_subscriptions', gst_inclusive: true },
  { vendor: '2 Talk', category: 'telecommunications', gst_inclusive: true },
  { vendor: 'JB Hi-FI', category: 'capital_expense', gst_inclusive: true },
  { vendor: 'Waitakere - Auckland Council', category: 'rubbish_removal', gst_inclusive: true },
  { vendor: 'Copy Booth Auckland', category: 'marketing', gst_inclusive: true },
  { vendor: 'VMK LTD', category: 'wages_payroll', gst_inclusive: true },
  { vendor: 'Moi-Ra Limited', category: 'wages_payroll', gst_inclusive: true },
]

describe('cleanExpensePayee', () => {
  it('strips bank transaction prefixes', () => {
    expect(cleanExpensePayee('PMT TO FC06-0878-0765722-00')).toBe('fc06-0878-0765722-00')
    expect(cleanExpensePayee('AUTOMATIC PAYMENT Elantis')).toBe('elantis')
  })

  it('strips trailing location noise', () => {
    expect(cleanExpensePayee('AC REFUSE STATION AUCKLAND')).toBe('ac refuse station')
    expect(cleanExpensePayee('IRD Conv FeeAuckland')).toBe('ird conv feeauckland')
  })

  it('handles empty and null-ish input', () => {
    expect(cleanExpensePayee('')).toBe('')
    expect(cleanExpensePayee(null as unknown as string)).toBe('')
  })
})

describe('expensePayeeTokens', () => {
  it('drops stopwords and short fragments', () => {
    expect(expensePayeeTokens('ELANTIS PREMIUM')).toEqual(['elantis'])
    expect(expensePayeeTokens('Moi-Ra Limited')).toEqual(['moi'])
  })

  it('splits a run-together bank payee', () => {
    expect(expensePayeeTokens('Google Workspace_sano.nz Auckland')).toEqual([
      'google',
      'workspace',
      'sano',
    ])
  })

  it('de-duplicates repeated tokens', () => {
    expect(expensePayeeTokens('GOOGLE google GOOGLE')).toEqual(['google'])
  })
})

describe('matchExpenseVendor — the real recurring payees', () => {
  it('matches Google Workspace and carries its category + GST', () => {
    const m = matchExpenseVendor('Google Workspace_sano.nz Auckland', VENDORS)
    expect(m).toMatchObject({
      vendor: 'Google Workspace',
      category: 'software_subscriptions',
      gst_inclusive: true,
    })
    expect(m!.score).toBe(2)
  })

  it('matches ELANTIS PREMIUM to Elantis (insurance)', () => {
    expect(matchExpenseVendor('ELANTIS PREMIUM', VENDORS)).toMatchObject({
      vendor: 'Elantis',
      category: 'insurance',
    })
  })

  it('matches a payee with a bank prefix', () => {
    expect(matchExpenseVendor('AUTOMATIC PAYMENT ELANTIS PREMIUM', VENDORS)).toMatchObject({
      vendor: 'Elantis',
    })
  })

  it('is case-insensitive', () => {
    expect(matchExpenseVendor('google workspace', VENDORS)?.vendor).toBe('Google Workspace')
    expect(matchExpenseVendor('MICROSOFT OFFICE', VENDORS)?.vendor).toBe('Microsoft Office')
  })
})

describe('matchExpenseVendor — refuses to guess', () => {
  it('returns null for an opaque account-number payee', () => {
    // 'PMT TO FC06-0878-0765722-00' is a contractor payment; it carries no
    // vendor signal at all and must never prefill a category.
    expect(matchExpenseVendor('PMT TO FC06-0878-0765722-00', VENDORS)).toBeNull()
  })

  it('returns null when nothing matches', () => {
    expect(matchExpenseVendor('MITRE 10 MEGA HENDERSON', VENDORS)).toBeNull()
    expect(matchExpenseVendor('INLAND REVENUE DEPT', VENDORS)).toBeNull()
  })

  it('returns null on an empty payee or empty candidate list', () => {
    expect(matchExpenseVendor('', VENDORS)).toBeNull()
    expect(matchExpenseVendor('Google Workspace', [])).toBeNull()
  })

  it('returns null when two vendors tie', () => {
    // Both insurance vendors, but the category could differ in general — an
    // ambiguous match must not silently pick one.
    const tied: VendorCandidate[] = [
      { vendor: 'Acme Cleaning Supplies', category: 'materials_supplies', gst_inclusive: true },
      { vendor: 'Acme Equipment Hire', category: 'equipment', gst_inclusive: true },
    ]
    expect(matchExpenseVendor('ACME', tied)).toBeNull()
  })

  it('rejects a single weak (short) token match', () => {
    // 'moi' alone is too short to be distinguishing.
    expect(matchExpenseVendor('MOI', VENDORS)).toBeNull()
  })

  it('accepts a single strong token match', () => {
    expect(matchExpenseVendor('WEATHPOINT', VENDORS)?.vendor).toBe('Weathpoint')
  })

  it('does not match a stopword-only payee', () => {
    expect(matchExpenseVendor('LIMITED SERVICES AUCKLAND', VENDORS)).toBeNull()
  })
})
