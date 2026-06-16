import { computeApprovedAmount } from '@/lib/contractor-pay'

describe('computeApprovedAmount', () => {
  it('hourly: amount = approved hours × rate', () => {
    expect(computeApprovedAmount({ approvedHours: 4, rate: 35 })).toEqual({ amount: 140, basis: 'hourly', hours: 4 })
    expect(computeApprovedAmount({ approvedHours: 2.5, rate: 35.5 })).toEqual({ amount: 88.75, basis: 'hourly', hours: 2.5 })
  })

  it('fixed: uses the amount and never forces hours', () => {
    expect(computeApprovedAmount({ fixedAmount: 280 })).toEqual({ amount: 280, basis: 'fixed', hours: null })
  })

  it('fixed wins when both are supplied', () => {
    expect(computeApprovedAmount({ fixedAmount: 200, approvedHours: 4, rate: 35 }))
      .toEqual({ amount: 200, basis: 'fixed', hours: null })
  })

  it('errors clearly on missing rate / hours / amount', () => {
    expect(computeApprovedAmount({ approvedHours: 4, rate: null })).toEqual({ error: expect.stringMatching(/hourly rate/i) })
    expect(computeApprovedAmount({ approvedHours: 0, rate: 35 })).toEqual({ error: expect.stringMatching(/approved hours/i) })
    expect(computeApprovedAmount({ fixedAmount: 0 })).toEqual({ error: expect.stringMatching(/fixed amount/i) })
    expect(computeApprovedAmount({})).toEqual({ error: expect.stringMatching(/approved hours.*fixed amount/i) })
  })
})
