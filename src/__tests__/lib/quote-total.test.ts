/**
 * Quote total must include add-on lines.
 *
 * The quote to job conversion carried only base_price - discount onto
 * jobs.job_price, dropping the priced add-on lines. The invoice then copied
 * job_price faithfully, so nothing looked wrong: the invoice was internally
 * consistent and simply billed the wrong amount.
 *
 * Found on QUO-0313 - quoted $1,080 (600 base + 300 carpet + 180 windows),
 * invoiced $600. An audit across every quote with add-ons found six affected
 * jobs and $1,312.50 under-billed, two of them already paid.
 */

import { computeQuoteTotal, sumQuoteAddons } from '@/lib/quote-total'

describe('sumQuoteAddons', () => {
  it('sums priced lines', () => {
    expect(sumQuoteAddons([{ price: 300 }, { price: 180 }])).toBe(480)
  })

  it('treats absent, null and non-numeric prices as zero', () => {
    expect(sumQuoteAddons([{ price: null }, {}, { price: 'abc' }, { price: 50 }])).toBe(50)
  })

  it('handles no items', () => {
    expect(sumQuoteAddons(null)).toBe(0)
    expect(sumQuoteAddons(undefined)).toBe(0)
    expect(sumQuoteAddons([])).toBe(0)
  })

  it('accepts numeric strings, as returned by the DB driver', () => {
    expect(sumQuoteAddons([{ price: '300.00' }, { price: '180.00' }])).toBe(480)
  })
})

describe('computeQuoteTotal', () => {
  it('reproduces the QUO-0313 total that was under-billed', () => {
    // 600 base + 300 carpet + 180 external windows = 1080, invoiced as 600.
    expect(computeQuoteTotal({ base_price: 600, discount: 0 }, [
      { price: 300 }, { price: 180 },
    ])).toBe(1080)
  })

  it('applies the discount to the base before adding add-ons', () => {
    // A discount is negotiated on the service, not on the extras.
    expect(computeQuoteTotal({ base_price: 600, discount: 100 }, [{ price: 200 }])).toBe(700)
  })

  it('matches base minus discount when there are no add-ons', () => {
    expect(computeQuoteTotal({ base_price: 415, discount: 0 }, [])).toBe(415)
    expect(computeQuoteTotal({ base_price: 500, discount: 50 })).toBe(450)
  })

  it('never returns a negative price', () => {
    // A discount larger than the base is operator error; carrying a negative
    // onto a job would produce a credit-note-shaped invoice nobody intended.
    expect(computeQuoteTotal({ base_price: 100, discount: 500 }, [])).toBe(0)
  })

  it('returns null only when no price is set at all', () => {
    expect(computeQuoteTotal({ base_price: null, discount: null }, [])).toBeNull()
    expect(computeQuoteTotal({})).toBeNull()
  })

  it('still totals add-ons when the base is unset', () => {
    // An add-on-only quote is unusual but must not be dropped to null.
    expect(computeQuoteTotal({ base_price: null }, [{ price: 220 }])).toBe(220)
  })

  it('reproduces each remaining under-billed job from the audit', () => {
    expect(computeQuoteTotal({ base_price: 600, discount: 0 }, [{ price: 300 }])).toBe(900)
    expect(computeQuoteTotal({ base_price: 595, discount: 0 }, [{ price: 220 }])).toBe(815)
    expect(computeQuoteTotal({ base_price: 600, discount: 0 }, [{ price: 175 }])).toBe(775)
    expect(computeQuoteTotal({ base_price: 415, discount: 0 }, [{ price: 60 }])).toBe(475)
  })

  it('ignores zero-priced promotional lines without dropping the rest', () => {
    // "Carpet Clean - No Charge - Barfoot promotion $0.00" alongside a real line.
    expect(computeQuoteTotal({ base_price: 967.5, discount: 0 }, [
      { price: 10 }, { price: 0 },
    ])).toBe(977.5)
  })
})
