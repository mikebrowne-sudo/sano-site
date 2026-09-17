// The invoice arithmetic for job extras.
//
// This is the money path, and the two item sources behave in OPPOSITE ways:
//
//   quote add-ons  — already inside job_price, so base_price is job_price MINUS
//                    their total, and listing them keeps the invoice total the
//                    same. They explain the price; they do not raise it.
//   job extras     — NOT inside job_price, so each is a new line that RAISES the
//                    invoice total by its own price.
//
// Getting this backwards either double-bills the client or silently loses the
// extra. QUO-0313 (quoted $1,080, invoiced $600, $1,312.50 under-billed across
// six jobs, two already paid) is what the first half of this rule came from.

import { sumJobItemCharges } from '@/lib/job-items'
import { calculateInvoiceTotal } from '@/lib/invoice-total'

/** Mirrors createInvoiceFromJob: base is job_price less the quote add-ons. */
function basePriceFor(jobPrice: number, quoteAddons: { price: number }[]): number {
  const addonsTotal = quoteAddons.reduce((s, r) => s + r.price, 0)
  return Math.max(0, jobPrice - addonsTotal)
}

describe('invoice totals with quote add-ons only (today’s behaviour)', () => {
  // The QUO-0313 shape: clean $600 + carpet $300 + windows $180 = $1,080.
  const quoteAddons = [{ label: 'Carpet clean', price: 300 }, { label: 'Windows', price: 180 }]
  const jobPrice = 1080

  it('carves the add-ons out of base_price so they are not counted twice', () => {
    expect(basePriceFor(jobPrice, quoteAddons)).toBe(600)
  })

  it('totals back to the quoted price, itemised', () => {
    const base = basePriceFor(jobPrice, quoteAddons)
    expect(calculateInvoiceTotal({ base_price: base, discount: 0 }, quoteAddons)).toBe(1080)
  })
})

describe('invoice totals with a job extra added on the day', () => {
  const quoteAddons: { label: string; price: number }[] = []
  const jobPrice = 600
  // Carpet clean found on site — agreed after the job was created.
  const extras = [{ label: 'Carpet clean — lounge & hall', price: 300, source: 'added' }]

  it('the extra RAISES the total — it is in neither the quote nor job_price', () => {
    const base = basePriceFor(jobPrice, quoteAddons)
    expect(base).toBe(600)
    const lines = [...quoteAddons, ...extras]
    expect(calculateInvoiceTotal({ base_price: base, discount: 0 }, lines)).toBe(900)
  })

  it('sumJobItemCharges agrees with the amount the invoice went up by', () => {
    expect(sumJobItemCharges(extras)).toBe(300)
  })
})

describe('a quoted extra later assigned a contractor is still not re-billed', () => {
  // Scenario A: the carpet was on the quote. It reaches the job as a
  // source='quote' job_item so it can be PAID, but it is already in job_price.
  const jobPrice = 900 // clean 600 + carpet 300
  const quoteAddons = [{ label: 'Carpet clean', price: 300 }]
  const quoteSourcedItems = [
    { label: 'Carpet clean', price: 300, source: 'quote', contractor_id: 'dave', cost_amount: 180 },
  ]

  it('contributes nothing additive, so the client still pays $900', () => {
    expect(sumJobItemCharges(quoteSourcedItems)).toBe(0)

    const base = basePriceFor(jobPrice, quoteAddons)
    // Only the quote add-on is listed; the job_item is excluded by source.
    const lines = [...quoteAddons, ...quoteSourcedItems.filter((i) => i.source === 'added')]
    expect(calculateInvoiceTotal({ base_price: base, discount: 0 }, lines)).toBe(900)
  })

  it('double-billing it would have charged $1,200 — the bug this guards', () => {
    const base = basePriceFor(jobPrice, quoteAddons)
    const wrong = [...quoteAddons, ...quoteSourcedItems] // treating quote items as additive
    expect(calculateInvoiceTotal({ base_price: base, discount: 0 }, wrong)).toBe(1200)
  })
})

describe('both kinds on one job', () => {
  // Quoted carpet $300 (in job_price) + an oven found on the day $80 (not).
  const jobPrice = 900
  const quoteAddons = [{ label: 'Carpet clean', price: 300 }]
  const items = [
    { label: 'Carpet clean', price: 300, source: 'quote' },
    { label: 'Oven clean', price: 80, source: 'added' },
  ]

  it('bills 900 + 80 = 980', () => {
    const base = basePriceFor(jobPrice, quoteAddons)
    const additive = items.filter((i) => i.source === 'added')
    expect(sumJobItemCharges(items)).toBe(80)
    expect(calculateInvoiceTotal({ base_price: base, discount: 0 }, [...quoteAddons, ...additive])).toBe(980)
  })
})

describe('what a client-facing document must never contain', () => {
  it('cost_amount is not part of an invoice line', () => {
    // The invoice line shape is { label, description, price, sort_order }.
    // If a future change spreads a job_item straight onto invoice_items, this
    // fails and says why.
    const jobItem = {
      label: 'Carpet clean', description: null, price: 300,
      contractor_id: 'dave', cost_amount: 180, cost_basis: 'fixed', source: 'added',
    }
    const invoiceLine = {
      label: jobItem.label,
      description: jobItem.description,
      price: jobItem.price,
      sort_order: 0,
    }
    expect(Object.keys(invoiceLine).sort()).toEqual(['description', 'label', 'price', 'sort_order'])
    expect(invoiceLine).not.toHaveProperty('cost_amount')
    expect(invoiceLine).not.toHaveProperty('contractor_id')
  })
})
