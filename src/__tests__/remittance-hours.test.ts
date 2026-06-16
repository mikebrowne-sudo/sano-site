import { reconcileRemittanceHours } from '@/lib/remittance-hours'

describe('reconcileRemittanceHours', () => {
  it('shows hours when hours × rate equals the amount', () => {
    expect(reconcileRemittanceHours(2, 35, 70)).toBe(2)
    expect(reconcileRemittanceHours(2.5, 40, 100)).toBe(2.5)
    expect(reconcileRemittanceHours(3, 30, 90.004)).toBe(3) // within a cent
  })

  it('leaves hours blank (fixed-price) when the amount does not match', () => {
    expect(reconcileRemittanceHours(2, 35, 80)).toBeNull() // e.g. carpet/oven fixed price
    expect(reconcileRemittanceHours(3, 30, 135)).toBeNull()
  })

  it('leaves hours blank when rate or hours are missing', () => {
    expect(reconcileRemittanceHours(null, 35, 70)).toBeNull()
    expect(reconcileRemittanceHours(2, null, 70)).toBeNull()
    expect(reconcileRemittanceHours(null, null, 70)).toBeNull()
  })

  it('leaves hours blank for zero/negative hours or rate', () => {
    expect(reconcileRemittanceHours(0, 35, 0)).toBeNull()
    expect(reconcileRemittanceHours(2, 0, 0)).toBeNull()
  })
})
