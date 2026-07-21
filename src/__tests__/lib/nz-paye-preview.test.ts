import { calculatePayPreview } from '@/lib/nz-paye'

// PAYE is calculated on the whole-dollar gross and truncated to the cent
// (IRD payroll method). Real staff are on secondary codes.
describe('calculatePayPreview — PAYE truncation (whole-dollar gross)', () => {
  it('Radhika (SH, fortnightly): truncates gross to $1,749 → PAYE $555.30', () => {
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
    // 1749 × (30% + 1.75% ACC) = 555.3075 → truncate → 555.30
    expect(p.paye).toBeCloseTo(555.3, 2)
  })

  it('Dipesh (SH SL, fortnightly): PAYE $666.75 on $2,100 gross', () => {
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
    // 2100 × (30% + 1.75%) = 666.75
    expect(p.paye).toBeCloseTo(666.75, 2)
  })
})
