import { splitGstInclusive, contractorGstOnPayment, resolveContractorPaymentGst, GST_INCLUSIVE_FRACTION } from '@/lib/payroll/gst'

describe('resolveContractorPaymentGst — supply-date GST snapshot (flags, never guesses)', () => {
  const reg = { gstRegistered: true, gstNumber: '123-456-789', gstEffectiveDate: '2026-04-01', taxTreatment: 'ordinary_trade_creditor' }

  it('GST-registered on the supply date → 3/23 split, full amount preserved', () => {
    const r = resolveContractorPaymentGst(reg, 230, '2026-05-10')
    expect(r).toMatchObject({ status: 'applied', applied: true, gstAmount: 30, exclusive: 200 })
  })

  it('non-GST contractor → no GST, whole amount exclusive', () => {
    const r = resolveContractorPaymentGst({ gstRegistered: false }, 230, '2026-05-10')
    expect(r).toMatchObject({ status: 'not_registered', applied: false, gstAmount: 0, exclusive: 230 })
  })

  it('registration starting mid-month: before effective date → no GST; on/after → GST', () => {
    expect(resolveContractorPaymentGst(reg, 230, '2026-03-31')).toMatchObject({ status: 'before_effective_date', applied: false, gstAmount: 0 })
    expect(resolveContractorPaymentGst(reg, 230, '2026-04-01')).toMatchObject({ status: 'applied', applied: true, gstAmount: 30 })
  })

  it('deregistered (registered flag off) later → no GST (note: no deregistration DATE is tracked)', () => {
    expect(resolveContractorPaymentGst({ gstRegistered: false, gstNumber: '123', gstEffectiveDate: '2026-04-01' }, 230, '2026-09-01'))
      .toMatchObject({ status: 'not_registered', applied: false })
  })

  it('GST-inclusive NEGATIVE adjustment → GST split stays proportional', () => {
    const r = resolveContractorPaymentGst(reg, -230, '2026-05-10')
    expect(r).toMatchObject({ status: 'applied', applied: true, gstAmount: -30, exclusive: -200 })
  })

  it('fixed-contract style payable (registered) resolves the same way at its supply date', () => {
    const r = resolveContractorPaymentGst(reg, 1500, '2026-06-30')
    expect(r.status).toBe('applied')
    expect(r.gstAmount).toBeCloseTo(1500 * 3 / 23, 2)
  })

  it('legacy contractor with incomplete GST data → FLAGGED (no guessing)', () => {
    // registered but missing GST number / effective date
    expect(resolveContractorPaymentGst({ gstRegistered: true, gstNumber: null, gstEffectiveDate: '2026-04-01' }, 230, '2026-05-10')).toMatchObject({ status: 'incomplete', applied: false })
    expect(resolveContractorPaymentGst({ gstRegistered: true, gstNumber: '123', gstEffectiveDate: null }, 230, '2026-05-10')).toMatchObject({ status: 'incomplete', applied: false })
  })

  it('tax treatment pending_review → FLAGGED, GST not applied', () => {
    expect(resolveContractorPaymentGst({ ...reg, taxTreatment: 'pending_review' }, 230, '2026-05-10')).toMatchObject({ status: 'pending_review', applied: false, gstAmount: 0 })
  })
})

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
