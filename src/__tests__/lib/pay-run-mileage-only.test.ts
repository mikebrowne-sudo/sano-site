import { readFileSync } from 'fs'
import { join } from 'path'

// Mileage catch-up: a pay run can pay ONLY the period's approved mileage (0
// hours, 0 wages, 0 PAYE/KiwiSaver), to release mileage that predates the
// normal cycle without double-paying wages. Mileage is non-taxable so nothing
// is withheld. Guards the zero-wage line + that mileage still flows.

describe('mileage-only pay run zeros wages but keeps mileage', () => {
  const src = readFileSync(join(process.cwd(), 'src/lib/payroll/create-employee-pay-run.ts'), 'utf8')

  it('accepts a mileage_only flag on the input', () => {
    expect(src).toMatch(/mileage_only\?: boolean/)
  })

  it('a mileage-only line is zero wages / PAYE / KiwiSaver but carries the mileage amount', () => {
    expect(src).toMatch(/if \(input\.mileage_only\) \{[\s\S]{0,400}gross_pay: 0,[\s\S]{0,200}paye: 0,/)
    expect(src).toMatch(/if \(input\.mileage_only\) \{[\s\S]{0,600}mileage_reimbursement: mileageAmt/)
  })

  it('still filters mileage to the period (so the catch-up period controls what is paid)', () => {
    expect(src).toMatch(/\.gte\('log_date', input\.pay_period_start\)/)
    expect(src).toMatch(/\.lte\('log_date', input\.pay_period_end\)/)
  })
})

describe('the New Pay Run form offers the catch-up mode', () => {
  const form = readFileSync(join(process.cwd(), 'src/app/portal/payroll/new/_components/NewPayRunForm.tsx'), 'utf8')
  it('has a mileage-only toggle that is passed to createPayRun', () => {
    expect(form).toMatch(/Mileage catch-up \(no wages\)/)
    expect(form).toMatch(/mileage_only: mileageOnly/)
  })
})
