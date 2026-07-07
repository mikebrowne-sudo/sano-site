import {
  roundKm,
  estimateReimbursement,
  tripAddresses,
  summariseMileage,
  HOME_BASE,
} from '@/lib/mileage'

describe('mileage helpers', () => {
  it('rounds km to one decimal', () => {
    expect(roundKm(12.34)).toBe(12.3)
    expect(roundKm(12.36)).toBe(12.4)
  })

  it('wraps stops with the home base at both ends', () => {
    const addrs = tripAddresses([{ address: '10 Queen St' }, { address: '5 King St' }])
    expect(addrs[0]).toBe(HOME_BASE)
    expect(addrs[addrs.length - 1]).toBe(HOME_BASE)
    expect(addrs).toEqual([HOME_BASE, '10 Queen St', '5 King St', HOME_BASE])
  })

  it('drops blank stops and returns nothing when there are none', () => {
    expect(tripAddresses([{ address: '  ' }, { address: '' }])).toEqual([])
  })

  it('estimates reimbursement at a given rate', () => {
    expect(estimateReimbursement(100, 1.0)).toBe(100)
    expect(estimateReimbursement(12.3, 1.04)).toBeCloseTo(12.79, 2)
  })

  it('summarises logs into totals', () => {
    const s = summariseMileage([{ distanceKm: 10.2 }, { distanceKm: 5.3 }], 1.0)
    expect(s.totalKm).toBe(15.5)
    expect(s.logCount).toBe(2)
    expect(s.estimatedReimbursement).toBe(15.5)
  })
})
