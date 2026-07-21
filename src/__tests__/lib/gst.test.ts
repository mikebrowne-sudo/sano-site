import { splitGstInclusive, contractorGstOnPayment, resolveContractorPaymentGst, GST_INCLUSIVE_FRACTION } from '@/lib/payroll/gst'

describe('resolveContractorPaymentGst — registration-window GST snapshot (flags, never guesses)', () => {
  const reg = { gstRegistered: true, gstNumber: '123-456-789', gstEffectiveDate: '2026-04-01', gstEndDate: null, taxTreatment: 'ordinary_trade_creditor' }

  it('approved while currently registered (in window) → 3/23 split, full amount preserved', () => {
    expect(resolveContractorPaymentGst(reg, 230, '2026-05-10')).toMatchObject({ status: 'applied', applied: true, gstAmount: 30, exclusive: 200 })
  })

  it('work completed BEFORE registration began → before_effective_date, no GST', () => {
    expect(resolveContractorPaymentGst(reg, 230, '2026-03-31')).toMatchObject({ status: 'before_effective_date', applied: false, gstAmount: 0 })
  })

  it('completed DURING registration but approved after deregistration → still applied (window, not current flag)', () => {
    // deregistered 30 Jun (end date recorded); flag now off; supply 10 May is inside the window
    const dereg = { gstRegistered: false, gstNumber: '123-456-789', gstEffectiveDate: '2026-04-01', gstEndDate: '2026-06-30', taxTreatment: 'ordinary_trade_creditor' }
    expect(resolveContractorPaymentGst(dereg, 230, '2026-05-10')).toMatchObject({ status: 'applied', applied: true, gstAmount: 30 })
  })

  it('work completed AFTER deregistration (end date) → not_registered', () => {
    const dereg = { gstRegistered: false, gstNumber: '123', gstEffectiveDate: '2026-04-01', gstEndDate: '2026-06-30', taxTreatment: 'ordinary_trade_creditor' }
    expect(resolveContractorPaymentGst(dereg, 230, '2026-07-15')).toMatchObject({ status: 'not_registered', applied: false })
  })

  it('registered but MISSING effective date → incomplete (can’t confirm the window)', () => {
    expect(resolveContractorPaymentGst({ gstRegistered: true, gstNumber: '123', gstEffectiveDate: null, gstEndDate: null }, 230, '2026-05-10')).toMatchObject({ status: 'incomplete', applied: false })
  })

  it('registered, effective set, MISSING end date, still registered → applied (open window)', () => {
    expect(resolveContractorPaymentGst({ ...reg, gstEndDate: null }, 230, '2026-12-01')).toMatchObject({ status: 'applied', applied: true })
  })

  it('conflicting: flag OFF but historical effective date present, no end → pending_review (not auto no-GST)', () => {
    expect(resolveContractorPaymentGst({ gstRegistered: false, gstNumber: '123', gstEffectiveDate: '2026-04-01', gstEndDate: null }, 230, '2026-05-10'))
      .toMatchObject({ status: 'pending_review', applied: false })
  })

  it('plainly not registered (no dates) → not_registered', () => {
    expect(resolveContractorPaymentGst({ gstRegistered: false }, 230, '2026-05-10')).toMatchObject({ status: 'not_registered', applied: false, exclusive: 230 })
  })

  it('in-window but missing GST number → incomplete', () => {
    expect(resolveContractorPaymentGst({ gstRegistered: true, gstNumber: null, gstEffectiveDate: '2026-04-01', gstEndDate: null }, 230, '2026-05-10')).toMatchObject({ status: 'incomplete', applied: false })
  })

  it('tax treatment pending_review → flagged regardless of dates', () => {
    expect(resolveContractorPaymentGst({ ...reg, taxTreatment: 'pending_review' }, 230, '2026-05-10')).toMatchObject({ status: 'pending_review', applied: false })
  })

  it('GST-inclusive NEGATIVE adjustment (in window) → GST split stays proportional', () => {
    expect(resolveContractorPaymentGst(reg, -230, '2026-05-10')).toMatchObject({ status: 'applied', gstAmount: -30, exclusive: -200 })
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
