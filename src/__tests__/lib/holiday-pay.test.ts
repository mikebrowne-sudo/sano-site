import { computePayslip } from '@/lib/payroll/payslip'

describe('holiday pay modes', () => {
  it('inclusive (default): rate includes 8%, identified within gross (8/108)', () => {
    const p = computePayslip({ hours: 20, rate: 25, period: 'weekly' })
    expect(p.holidayPayMode).toBe('inclusive')
    expect(p.gross).toBe(500)
    expect(p.holidayPayComponent).toBeCloseTo((500 * 8) / 108, 2) // ≈ 37.04
    expect(p.baseEarnings).toBeCloseTo(500 - (500 * 8) / 108, 2) // ≈ 462.96
  })

  it('exclusive_on_top: 8% added on top of the base rate', () => {
    const p = computePayslip({ hours: 20, rate: 25, period: 'weekly', holidayPayMode: 'exclusive_on_top' })
    expect(p.baseEarnings).toBe(500)
    expect(p.holidayPayComponent).toBeCloseTo(40, 2) // 8% of 500
    expect(p.gross).toBeCloseTo(540, 2)
  })

  it('exclusive gross > inclusive gross for the same rate (staff paid more)', () => {
    const inc = computePayslip({ hours: 20, rate: 25, period: 'weekly', holidayPayMode: 'inclusive' })
    const exc = computePayslip({ hours: 20, rate: 25, period: 'weekly', holidayPayMode: 'exclusive_on_top' })
    expect(exc.gross).toBeGreaterThan(inc.gross)
    // PAYE is on the full gross in both modes
    expect(exc.paye).toBeGreaterThan(inc.paye)
  })
})
