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

  // The lower bound was REMOVED (2026-09). It stranded any mileage older than
  // one cycle — logged late, or approved after its run was created — because no
  // future run looked back far enough to find it. Releasing it needed a separate
  // mileage-only catch-up run. Double payment is prevented by pay_run_id, not
  // by the dates.
  it('has no lower date bound, so old mileage is never stranded', () => {
    expect(src).not.toMatch(/\.gte\('log_date'/)
  })
  it('still bounds the top — mileage after this period belongs to the next run', () => {
    expect(src).toMatch(/\.lte\('log_date', mileageTo\)/)
  })
  it('advance-pay mode shifts the upper bound back one cycle', () => {
    expect(src).toMatch(/mileageTo = input\.mileage_from_prior_week/)
    expect(src).toMatch(/shiftIso\(input\.pay_period_end/)
  })
})

describe('the New Pay Run form offers the catch-up mode', () => {
  const form = readFileSync(join(process.cwd(), 'src/app/portal/payroll/new/_components/NewPayRunForm.tsx'), 'utf8')
  it('has a mileage-only toggle that is passed to createPayRun', () => {
    expect(form).toMatch(/Mileage catch-up \(no wages\)/)
    expect(form).toMatch(/mileage_only: mileageOnly/)
  })
})
