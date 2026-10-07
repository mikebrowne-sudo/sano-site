/**
 * Mileage must never be stranded outside a pay run's date window.
 *
 * The creation path used to bound mileage BOTH ends — the run's own period,
 * shifted back a cycle when wages are paid in advance. Anything older than that
 * (logged late, or approved after its run was created) fell outside the window
 * and no future run would ever look back far enough to find it. It could only
 * be released by a separate mileage-only catch-up run. That stranded $490.20
 * across two pay cycles.
 *
 * Now the sweep has NO lower bound: everything outstanding up to the end of the
 * period. `pay_run_id is null` is what prevents double payment, not the dates.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const create = read('src/lib/payroll/create-employee-pay-run.ts')
const refresh = read('src/app/portal/payroll/[id]/_actions-refresh-mileage.ts')

const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('pay run creation — mileage sweep', () => {
  it('has NO lower date bound, so old mileage can never be stranded', () => {
    expect(codeOnly(create)).not.toMatch(/\.gte\('log_date'/)
  })

  it('still bounds the top — mileage after this period belongs to the next run', () => {
    expect(codeOnly(create)).toMatch(/\.lte\('log_date', mileageTo\)/)
  })

  it('relies on pay_run_id to prevent double payment', () => {
    expect(codeOnly(create)).toMatch(/\.is\('pay_run_id', null\)/)
  })

  it('only sweeps APPROVED mileage — draft stays out until checked', () => {
    expect(codeOnly(create)).toMatch(/\.eq\('status', 'approved'\)/)
  })

  it('still shifts the upper bound when wages are paid in advance', () => {
    expect(create).toMatch(/mileage_from_prior_week/)
    expect(create).toMatch(/shiftIso\(input\.pay_period_end/)
  })
})

describe('refreshPayRunMileage — pulling newly-approved mileage into a draft', () => {
  it('refuses on anything that is not a draft', () => {
    expect(refresh).toMatch(/run\.status !== 'draft'/)
    expect(refresh).toMatch(/figures are frozen/)
  })

  it('uses the same sweep rule as creation — no lower bound', () => {
    const code = codeOnly(refresh)
    expect(code).not.toMatch(/\.gte\('log_date'/)
    expect(code).toMatch(/\.lte\('log_date', run\.pay_period_end/)
  })

  it('only picks up approved, unattached mileage', () => {
    expect(codeOnly(refresh)).toMatch(/\.eq\('status', 'approved'\)/)
    expect(codeOnly(refresh)).toMatch(/\.is\('pay_run_id', null\)/)
  })

  it('stamps the logs so the same mileage cannot be paid twice', () => {
    expect(refresh).toMatch(/pay_run_id: payRunId/)
  })

  it('stamps LAST, so a failure leaves mileage re-sweepable rather than marked paid', () => {
    const stampAt = refresh.indexOf("update({ pay_run_id: payRunId })")
    const lineUpdateAt = refresh.indexOf('mileage_reimbursement: next')
    expect(lineUpdateAt).toBeGreaterThan(-1)
    expect(stampAt).toBeGreaterThan(lineUpdateAt)
  })

  it('adds to the existing figure rather than overwriting it', () => {
    expect(refresh).toMatch(/Number\(line\.mileage_reimbursement \?\? 0\) \+ add/)
  })

  it('is admin only and audited', () => {
    expect(refresh).toMatch(/isAdminUser/)
    expect(refresh).toMatch(/pay_run\.mileage_refreshed/)
  })
})
