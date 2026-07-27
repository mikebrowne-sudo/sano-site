import { buildPayslipSnapshot, maskBankAccount, payslipReference } from '@/lib/payroll/payslip-snapshot'

describe('maskBankAccount', () => {
  it('shows only the last 4 digits', () => {
    expect(maskBankAccount('12-3051-0345555-50')).toBe('•••• 5550')
    expect(maskBankAccount(null)).toBeNull()
  })
})

describe('payslipReference — deterministic', () => {
  it('is stable for the same inputs and encodes the pay date', () => {
    const a = payslipReference('2026-07-27', 'line-1')
    expect(a).toBe(payslipReference('2026-07-27', 'line-1'))
    expect(a).toMatch(/^SANO-PS-2026-07-27-[0-9A-F]{6}$/)
  })
})

const carol = {
  reference: 'SANO-PS-2026-07-27-ABC123', version: 1, generatedAt: '2026-07-28T00:00:00Z',
  employeeDisplayName: 'Carol Browne', employeeId: 'c-1', bankAccount: '12-3051-0345555-50',
  payRunId: 'run-1', periodStart: '2026-07-27', periodEnd: '2026-08-02', payDate: '2026-07-27',
  paid: true, paymentDate: '2026-07-27', paymentMethod: 'bank transfer', paymentReference: 'SANO PAYROLL 270726',
  hours: 20, rate: 30, gross: 600, paye: 94.5, employeeKsRate: 3.5, employeeKsAmount: 21, net: 484.5,
  employerKsRate: 3.5, employerKsGross: 21, esct: 3.67, employerKsNet: 17.33, termsSnapshot: { basis: 'advance' },
}

describe('buildPayslipSnapshot — Carol official', () => {
  const s = buildPayslipSnapshot(carol)

  it('earnings + deductions + net', () => {
    expect(s.earnings.gross).toBe(600)
    expect(s.earnings.lines[0]).toEqual({ description: 'Ordinary hours', hours: 20, rate: 30, amount: 600 })
    expect(s.deductions.paye).toBe(94.5)
    expect(s.deductions.employeeKsAmount).toBe(21)
    expect(s.deductions.total).toBe(115.5)   // PAYE + employee KS, NOT + employer
    expect(s.deductions.net).toBe(484.5)
  })

  it('employer contributions are separate (never merged into deductions)', () => {
    expect(s.employerContributions).toEqual({ ksRate: 3.5, ksGross: 21, esct: 3.67, ksNet: 17.33 })
    // Employer KS is NOT part of employee deductions total.
    expect(s.deductions.total).not.toBe(136.5)
    expect(s.deductions.total).not.toBe(42)
  })

  it('masks the bank account and captures payment metadata', () => {
    expect(s.employee.maskedBankAccount).toBe('•••• 5550')
    expect(s.payment).toEqual({ paid: true, paymentDate: '2026-07-27', paymentMethod: 'bank transfer', paymentReference: 'SANO PAYROLL 270726' })
  })

  it('is self-contained — carries employer + terms snapshot, no live lookups', () => {
    expect(s.employer.legalName).toBe('Sano Property Services Limited')
    expect(s.employer.logoRef).toBe('/brand/sano-full-green.png')
    expect(s.termsSnapshot).toEqual({ basis: 'advance' })
  })

  it('an unpaid (preview) snapshot hides payment metadata', () => {
    const preview = buildPayslipSnapshot({ ...carol, paid: false })
    expect(preview.payment).toEqual({ paid: false, paymentDate: null, paymentMethod: null, paymentReference: null })
  })
})
