import { calculatePayPreview } from '@/lib/nz-paye'

// The /new batch pay flow uses calculatePayPreview. These cover the ESCT it now
// returns for a KiwiSaver-member employee (mirrors Radhika: SH, loaded rate,
// employer 3.5%).
describe('calculatePayPreview — ESCT on employer KiwiSaver', () => {
  it('withholds ESCT from the employer contribution for a member', () => {
    const p = calculatePayPreview({
      hoursWorked: 20,
      hourlyRate: 29.16, // loaded rate (base 27 + 8%), holiday already in rate
      payFrequency: 'weekly',
      taxCode: 'SH',
      kiwisaverEnrolled: true,
      kiwisaverEmployeeRate: 3,
      kiwisaverEmployerRate: 3.5,
      holidayPayMethod: null,
    })
    // gross 583.20; employer KS 3.5% = 20.41; threshold ≈ 31,388 → 17.5% band
    expect(p.employerKiwisaver).toBeCloseTo(20.41, 2)
    expect(p.esctRate).toBe(0.175)
    expect(p.employerEsct).toBe(4) // 17.5% × 20.41 = 3.57 → $4 whole-dollar
    expect(p.employerKiwisaverNet).toBeCloseTo(16.41, 2)
    // ESCT doesn't touch the employee's net
    expect(p.netPay).toBeCloseTo(p.effectiveGross - p.paye - p.studentLoan - p.employeeKiwisaver, 2)
  })

  it('is zero when the employee is not a KiwiSaver member', () => {
    const p = calculatePayPreview({
      hoursWorked: 20,
      hourlyRate: 35,
      payFrequency: 'weekly',
      taxCode: 'SH SL',
      kiwisaverEnrolled: false,
      kiwisaverEmployeeRate: 0,
      kiwisaverEmployerRate: 3.5,
      holidayPayMethod: null,
    })
    expect(p.employerKiwisaver).toBe(0)
    expect(p.employerEsct).toBe(0)
    expect(p.employerKiwisaverNet).toBe(0)
  })
})
