import { splitGstInclusive, contractorGstOnPayment, GST_INCLUSIVE_FRACTION } from '@/lib/payroll/gst'

describe('GST split (3/23 of a GST-inclusive amount)', () => {
  it('splits a GST-inclusive amount', () => {
    // $115 inclusive → $15 GST, $100 exclusive
    const s = splitGstInclusive(115)
    expect(s.gst).toBeCloseTo(15, 2)
    expect(s.exclusive).toBeCloseTo(100, 2)
  })

  it('uses the 3/23 fraction', () => {
    expect(GST_INCLUSIVE_FRACTION).toBeCloseTo(3 / 23, 10)
    const s = splitGstInclusive(230)
    expect(s.gst).toBeCloseTo(30, 2)
    expect(s.exclusive).toBeCloseTo(200, 2)
  })
})

describe('contractor GST on a payment', () => {
  it('applies GST when registered and no effective-date bound', () => {
    const r = contractorGstOnPayment({ gstRegistered: true }, 230)
    expect(r.applied).toBe(true)
    expect(r.gst).toBeCloseTo(30, 2)
  })

  it('does not apply GST when not registered', () => {
    const r = contractorGstOnPayment({ gstRegistered: false }, 230)
    expect(r.applied).toBe(false)
    expect(r.gst).toBe(0)
    expect(r.exclusive).toBeCloseTo(230, 2)
  })

  it('does not apply GST for work before the effective date', () => {
    const profile = { gstRegistered: true, gstEffectiveDate: '2026-04-01' }
    expect(contractorGstOnPayment(profile, 230, '2026-03-31').applied).toBe(false)
    expect(contractorGstOnPayment(profile, 230, '2026-04-01').applied).toBe(true)
    expect(contractorGstOnPayment(profile, 230, '2026-05-10').applied).toBe(true)
  })
})
