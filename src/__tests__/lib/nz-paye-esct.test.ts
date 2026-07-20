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
    // ESCT on whole-dollar base $20: 20 × 17.5% = 3.50; net = 20.41 − 3.50 = 16.91
    expect(p.employerKiwisaver).toBeCloseTo(20.41, 2)
    expect(p.esctRate).toBe(0.175)
    expect(p.employerEsct).toBeCloseTo(3.5, 2)
    expect(p.employerKiwisaverNet).toBeCloseTo(16.91, 2)
    // ESCT doesn't touch the employee's net
    expect(p.netPay).toBeCloseTo(p.effectiveGross - p.paye - p.studentLoan - p.employeeKiwisaver, 2)
  })

  it('deducts student loan at 12% above the fortnightly threshold ($928) for SH SL', () => {
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
    // gross 2100 → SL = (2100 − 928) × 12% = 140.64
    expect(p.effectiveGross).toBeCloseTo(2100, 2)
    expect(p.studentLoan).toBeCloseTo(140.64, 2)
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
