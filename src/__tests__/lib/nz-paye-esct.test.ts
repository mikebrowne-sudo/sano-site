import { calculatePayPreview } from '@/lib/nz-paye'

// Exact worked examples for the real staff, run through the /new pay flow
// (calculatePayPreview). Fortnightly, 60 hrs illustrative. All figures are
// accountant-validated against IRD (whole-dollar gross, truncated deductions,
// secondary student loan with no threshold, whole-dollar ESCT base truncated).
describe('calculatePayPreview — worked examples (fortnightly)', () => {
  it('Radhika — SH, KiwiSaver member (3% / 3.5%)', () => {
    const p = calculatePayPreview({
      hoursWorked: 60,
      hourlyRate: 29.16, // loaded rate; holiday already in rate
      payFrequency: 'fortnightly',
      taxCode: 'SH',
      kiwisaverEnrolled: true,
      kiwisaverEmployeeRate: 3,
      kiwisaverEmployerRate: 3.5,
      holidayPayMethod: null,
    })
    expect(p.effectiveGross).toBeCloseTo(1749.6, 2)
    expect(p.paye).toBeCloseTo(555.3, 2) // 1749 × 31.75% → truncated
    expect(p.studentLoan).toBe(0) // SH has no student loan
    expect(p.employeeKiwisaver).toBeCloseTo(52.48, 2) // trunc(1749.60 × 3%)
    expect(p.netPay).toBeCloseTo(1141.82, 2)
    expect(p.employerKiwisaver).toBeCloseTo(61.23, 2) // trunc(1749.60 × 3.5%)
    expect(p.esctRate).toBe(0.175)
    expect(p.employerEsct).toBeCloseTo(10.67, 2) // ESCT on $61 → 10.675 truncated
    expect(p.employerKiwisaverNet).toBeCloseTo(50.56, 2)
  })

  it('Dipesh — SH SL, not in KiwiSaver (secondary SL = no threshold)', () => {
    const p = calculatePayPreview({
      hoursWorked: 60,
      hourlyRate: 35,
      payFrequency: 'fortnightly',
      taxCode: 'SH SL',
      kiwisaverEnrolled: false,
      kiwisaverEmployeeRate: 0,
      kiwisaverEmployerRate: 3.5,
      holidayPayMethod: null,
    })
    expect(p.effectiveGross).toBeCloseTo(2100, 2)
    expect(p.paye).toBeCloseTo(666.75, 2)
    expect(p.studentLoan).toBeCloseTo(252, 2) // 2100 × 12%, no threshold
    expect(p.netPay).toBeCloseTo(1181.25, 2)
    expect(p.employerKiwisaver).toBe(0)
    expect(p.employerEsct).toBe(0)
  })
})
