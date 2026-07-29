import { previewSchedulePayment, periodTotals } from '@/lib/contractor-schedule-preview'

describe('previewSchedulePayment — guaranteed_net (Myrtle Schedule A)', () => {
  it('grosses up $1,500 net at a verified 20% to gross $1,875 / wht $375 / $0 GST', () => {
    const p = previewSchedulePayment({
      paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive',
      agreedAmount: 1500, gstApplies: false, whtRate: 0.20, schedular: true,
    })
    expect(p.pending).toBe(false)
    expect(p.netBank).toBe(1500)
    expect(p.grossExGst).toBe(1875)
    expect(p.whtAmount).toBe(375)
    expect(p.gst).toBe(0)
    expect(p.sanoCost).toBe(1875)
  })

  it('recomputes automatically for a different verified rate (10% and 30%) — nothing hard-coded', () => {
    const at10 = previewSchedulePayment({ paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive', agreedAmount: 1500, gstApplies: false, whtRate: 0.10, schedular: true })
    expect(at10.grossExGst).toBe(1666.67)
    expect(at10.whtAmount).toBe(166.67)
    const at30 = previewSchedulePayment({ paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive', agreedAmount: 1500, gstApplies: false, whtRate: 0.30, schedular: true })
    expect(at30.grossExGst).toBe(2142.86)
    expect(at30.whtAmount).toBe(642.86)
  })

  it('shows pending (no guessed rate) when schedular and the rate is not yet verified', () => {
    const p = previewSchedulePayment({
      paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive',
      agreedAmount: 1500, gstApplies: false, whtRate: null, schedular: true,
    })
    expect(p.pending).toBe(true)
    expect(p.netBank).toBe(1500) // the known anchor
    expect(p.grossExGst).toBeNull()
    expect(p.whtAmount).toBeNull()
    expect(p.sanoCost).toBeNull()
  })

  it('guaranteed_net with GST registered adds GST on top of the grossed-up ex-GST base', () => {
    const p = previewSchedulePayment({
      paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive',
      agreedAmount: 1500, gstApplies: true, whtRate: 0.20, schedular: true,
    })
    expect(p.grossExGst).toBe(1875)
    expect(p.gst).toBe(281.25) // 1875 × 0.15
    expect(p.netBank).toBe(1500)
    expect(p.sanoCost).toBe(2156.25)
  })
})

describe('previewSchedulePayment — gross_fee', () => {
  it('exclusive gross fee, schedular 20%: wht on the full ex-GST amount', () => {
    const p = previewSchedulePayment({
      paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive',
      agreedAmount: 2000, gstApplies: false, whtRate: 0.20, schedular: true,
    })
    expect(p.grossExGst).toBe(2000)
    expect(p.whtAmount).toBe(400)
    expect(p.netBank).toBe(1600)
  })

  it('inclusive gross fee with GST strips GST first; withholding on the ex-GST base only', () => {
    const p = previewSchedulePayment({
      paymentBasis: 'gross_fee', rateBasis: 'gst_inclusive',
      agreedAmount: 2300, gstApplies: true, whtRate: 0.20, schedular: true,
    })
    expect(p.grossExGst).toBe(2000) // 2300 − 2300×3/23
    expect(p.gst).toBe(300)
    expect(p.whtAmount).toBe(400) // on 2000, not on GST
    expect(p.netBank).toBe(1600)
  })

  it('non-schedular ordinary trade creditor: no withholding at all', () => {
    const p = previewSchedulePayment({
      paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive',
      agreedAmount: 500, gstApplies: false, whtRate: null, schedular: false,
    })
    expect(p.pending).toBe(false)
    expect(p.whtAmount).toBe(0)
    expect(p.netBank).toBe(500)
  })
})

describe('withholding is never on the GST component', () => {
  it('exclusive: wht base equals grossExGst, independent of GST', () => {
    const withGst = previewSchedulePayment({ paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive', agreedAmount: 2000, gstApplies: true, whtRate: 0.20, schedular: true })
    const noGst = previewSchedulePayment({ paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive', agreedAmount: 2000, gstApplies: false, whtRate: 0.20, schedular: true })
    expect(withGst.whtAmount).toBe(noGst.whtAmount)
    expect(withGst.whtAmount).toBe(400)
  })
})

describe('periodTotals', () => {
  it('monthly fixed rolls to annual ×12', () => {
    expect(periodTotals('fixed_monthly', 1875)).toEqual({ monthly: 1875, annual: 22500 })
  })
  it('weekly fixed rolls to monthly (×52/12) and annual (×52)', () => {
    expect(periodTotals('fixed_weekly', 100)).toEqual({ monthly: 433.33, annual: 5200 })
  })
  it('hourly has no period roll-up', () => {
    expect(periodTotals('hourly', 35)).toEqual({ monthly: null, annual: null })
  })
})
