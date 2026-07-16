import { parseCoverAmount } from '@/lib/parse-cover-amount'

describe('parseCoverAmount', () => {
  it('parses a currency-formatted string', () => {
    expect(parseCoverAmount('$1,000,000')).toBe(1000000)
    expect(parseCoverAmount('$2,000,000.00')).toBe(2000000)
    expect(parseCoverAmount('1000000')).toBe(1000000)
    expect(parseCoverAmount('1,000,000')).toBe(1000000)
  })

  it('returns null for empty / missing / non-numeric input', () => {
    expect(parseCoverAmount(undefined)).toBeNull()
    expect(parseCoverAmount(null)).toBeNull()
    expect(parseCoverAmount('')).toBeNull()
    expect(parseCoverAmount('   ')).toBeNull()
    expect(parseCoverAmount('n/a')).toBeNull()
  })

  it('returns null for zero or negative-looking values', () => {
    expect(parseCoverAmount('$0')).toBeNull()
    expect(parseCoverAmount('0')).toBeNull()
  })
})
