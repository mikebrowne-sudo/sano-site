import { readFileSync } from 'fs'
import { join } from 'path'

// Regression: employee pay runs pull "approved, pay_run_id IS NULL" mileage as a
// non-taxable reimbursement. If the consumed logs are NOT stamped with the run's
// id, the SAME mileage is re-pulled and re-paid on every subsequent run — a
// double-pay bug (the mileage logs had 4 approved / 0 stamped in prod). This
// test guards the stamp (and the pre-existing delete-draft un-stamp that assumes
// it) so the guard can't silently disappear again.

const src = readFileSync(
  join(process.cwd(), 'src/lib/payroll/create-employee-pay-run.ts'),
  'utf8',
)

describe('employee pay run stamps consumed mileage (double-pay guard)', () => {
  it('only pulls unconsumed approved mileage (pay_run_id IS NULL)', () => {
    expect(src).toMatch(/\.eq\('status', 'approved'\)/)
    expect(src).toMatch(/\.is\('pay_run_id', null\)/)
  })

  it('collects the consumed mileage log ids', () => {
    expect(src).toMatch(/consumedMileageLogIds\.push\(m\.id/)
    expect(src).toMatch(/\.select\('id, contractor_id, reimbursement_amount'\)/)
  })

  it('stamps those logs with the run id after inserting the lines', () => {
    expect(src).toMatch(/from\('mileage_logs'\)\.update\(\{ pay_run_id: data\.id \}\)\.in\('id', consumedMileageLogIds\)/)
  })
})

describe('delete-draft un-stamps the mileage (mirror of the stamp)', () => {
  const del = readFileSync(
    join(process.cwd(), 'src/app/portal/payroll/[id]/_actions-delete-draft.ts'),
    'utf8',
  )
  it('sets pay_run_id back to null for the discarded run', () => {
    expect(del).toMatch(/from\('mileage_logs'\)\.update\(\{ pay_run_id: null \}\)\.eq\('pay_run_id', input\.runId\)/)
  })
})
