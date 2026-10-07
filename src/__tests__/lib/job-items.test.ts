import {
  costBasisOf,
  sourceOf,
  isChargeable,
  sumJobItemCharges,
  sumJobItemCosts,
  jobItemPayable,
  jobItemsMargin,
  type JobItemLine,
} from '@/lib/job-items'

const CONTRACTOR = '11111111-1111-1111-1111-111111111111'

/** A carpet clean found on site: $300 to the client, $180 to the contractor. */
const addedCarpet: JobItemLine = {
  label: 'Carpet clean — lounge & hall',
  price: 300,
  contractor_id: CONTRACTOR,
  cost_amount: 180,
  cost_basis: 'fixed',
  source: 'added',
}

/** The same carpet clean, but quoted up front — charge already in job_price. */
const quotedCarpet: JobItemLine = { ...addedCarpet, source: 'quote' }

describe('costBasisOf', () => {
  it('reads hourly', () => {
    expect(costBasisOf('hourly')).toBe('hourly')
  })

  it('defaults anything else to fixed — never invents hours', () => {
    expect(costBasisOf('fixed')).toBe('fixed')
    expect(costBasisOf(null)).toBe('fixed')
    expect(costBasisOf(undefined)).toBe('fixed')
    expect(costBasisOf('per_visit')).toBe('fixed')
    expect(costBasisOf('nonsense')).toBe('fixed')
  })
})

describe('sourceOf / isChargeable', () => {
  it('reads quote', () => {
    expect(sourceOf('quote')).toBe('quote')
    expect(isChargeable(quotedCarpet)).toBe(false)
  })

  it('defaults anything unreadable to added, so a charge is never silently dropped', () => {
    expect(sourceOf(null)).toBe('added')
    expect(sourceOf(undefined)).toBe('added')
    expect(sourceOf('nonsense')).toBe('added')
    expect(isChargeable({ price: 50 })).toBe(true)
  })
})

describe('sumJobItemCharges — THE MONEY RULE', () => {
  it('sums added items', () => {
    expect(sumJobItemCharges([addedCarpet, { price: 120, source: 'added' }])).toBe(420)
  })

  it('EXCLUDES quote-sourced items — their charge is already inside job_price', () => {
    expect(sumJobItemCharges([quotedCarpet])).toBe(0)
  })

  it('mixes correctly: only the added half is additive', () => {
    expect(sumJobItemCharges([quotedCarpet, addedCarpet])).toBe(300)
  })

  it('handles empty, non-array and missing prices', () => {
    expect(sumJobItemCharges([])).toBe(0)
    expect(sumJobItemCharges(null as unknown as JobItemLine[])).toBe(0)
    expect(sumJobItemCharges([{ label: 'No price' }])).toBe(0)
  })

  it('rounds to cents', () => {
    expect(sumJobItemCharges([{ price: 0.1 }, { price: 0.2 }])).toBe(0.3)
  })
})

describe('sumJobItemCosts', () => {
  it('counts EVERY item regardless of source — quoted work is still money out', () => {
    expect(sumJobItemCosts([quotedCarpet, addedCarpet])).toBe(360)
  })

  it('treats an unassigned or unpriced item as zero cost', () => {
    expect(sumJobItemCosts([{ price: 300 }])).toBe(0)
    expect(sumJobItemCosts([{ price: 300, contractor_id: CONTRACTOR }])).toBe(0)
  })
})

describe('jobItemPayable', () => {
  it('pays a fixed amount as the whole payable, never multiplied by hours', () => {
    expect(jobItemPayable(addedCarpet)).toEqual({ amount: 180, basis: 'fixed', hours: null })
  })

  it('pays a quote-sourced item too — scenario A is the point of those rows', () => {
    expect(jobItemPayable(quotedCarpet)).toEqual({ amount: 180, basis: 'fixed', hours: null })
  })

  it('recovers the rate for an hourly item and reports hours', () => {
    const hourly: JobItemLine = {
      ...addedCarpet,
      cost_basis: 'hourly',
      cost_amount: 150,
      cost_hours: 3,
    }
    expect(jobItemPayable(hourly)).toEqual({ amount: 150, basis: 'hourly', hours: 3 })
  })

  it('refuses an item with no contractor rather than returning zero', () => {
    const result = jobItemPayable({ ...addedCarpet, contractor_id: null })
    expect(result).toHaveProperty('error')
  })

  it('refuses an item with no cost rather than returning zero', () => {
    expect(jobItemPayable({ ...addedCarpet, cost_amount: null })).toHaveProperty('error')
    expect(jobItemPayable({ ...addedCarpet, cost_amount: 0 })).toHaveProperty('error')
  })

  it('refuses an hourly item with no hours', () => {
    const result = jobItemPayable({ ...addedCarpet, cost_basis: 'hourly', cost_hours: null })
    expect(result).toHaveProperty('error')
  })
})

describe('jobItemsMargin', () => {
  it('bills on top less paid out', () => {
    expect(jobItemsMargin([addedCarpet])).toBe(120)
  })

  it('a quoted item is pure cost here — its charge sits in job_price', () => {
    expect(jobItemsMargin([quotedCarpet])).toBe(-180)
  })
})
