// Phase 5 — Pay hub + worker-level Pay views.
//
// These are read-model/navigation surfaces. The properties worth locking are:
//  1. they never write payment state,
//  2. their figures derive the same way the detail screens derive them, so the
//     hub can't disagree with Contractor Pay / Payment History,
//  3. retired concepts (statements, legacy pay runs) stay out of the live path,
//  4. worker_type decides which pay model is shown.

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

const data = read('src/lib/pay-overview-data.ts')
const hub = read('src/app/portal/pay/page.tsx')
const worker = read('src/app/portal/contractors/[id]/pay/page.tsx')

/**
 * Strip comments before asserting a table is UNUSED — these files name the
 * retired tables in their headers to explain why they're avoided, and a naive
 * substring check would flag that documentation as usage.
 */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('pay overview loaders', () => {
  it('never write — these are view-only surfaces', () => {
    for (const src of [data, hub, worker]) {
      expect(src).not.toMatch(/\.update\(/)
      expect(src).not.toMatch(/\.insert\(/)
      expect(src).not.toMatch(/\.delete\(/)
      expect(src).not.toMatch(/\.rpc\(/)
    }
  })

  it('derives "owed" the same way the pay-run planner does', () => {
    // approved, minus anything already on a remittance item.
    expect(data).toMatch(/\.eq\('status', 'approved'\)/)
    expect(data).toMatch(/remitted\.has\(ci\.id\)/)
  })

  it('counts only LIVE bank allocations', () => {
    expect(data).toMatch(/\.is\('reversed_at', null\)/)
  })

  it('derives the same four payment states as Payment History', () => {
    expect(data).toMatch(/payment_confirmed/)
    // partial is distinguished from untouched by the allocation sum
    expect(data).toMatch(/alloc > 0/)
  })

  it('excludes open (unpaid) remittances from payment counts', () => {
    expect(data).toMatch(/if \(!r\.paid_at\) continue/)
  })

  it('reads employee runs from pay_runs / pay_run_lines / payslips only', () => {
    expect(data).toMatch(/from\('pay_runs'\)/)
    expect(data).toMatch(/from\('pay_run_lines'\)/)
    expect(data).toMatch(/from\('payslips'\)/)
    // NOT the retired free-text helper table.
    expect(codeOnly(data)).not.toMatch(/employee_pay_runs/)
  })

  it('uses no retired contractor pay concepts', () => {
    for (const src of [data, worker]) {
      expect(codeOnly(src)).not.toMatch(/contractor_statements/)
      expect(codeOnly(src)).not.toMatch(/pay_run_items|pay_run_remittances/)
    }
  })

  it('scopes employee pay runs to real employee runs', () => {
    expect(data).toMatch(/kind\.is\.null,kind\.eq\.employee/)
  })
})

describe('pay hub', () => {
  it('shows contractor and employee summaries', () => {
    expect(hub).toMatch(/loadContractorPayOverview/)
    expect(hub).toMatch(/loadEmployeePayOverview/)
    expect(hub).toMatch(/Ready to pay/)
    expect(hub).toMatch(/Awaiting approval/)
    expect(hub).toMatch(/Awaiting bank confirmation/)
  })

  it('takes the awaiting-approval count from the same loader Contractor Pay uses', () => {
    expect(hub).toMatch(/awaitingAuthorisation\(await loadApprovalRows/)
  })

  it('surfaces the primary paths for both worker types', () => {
    expect(hub).toMatch(/\/portal\/contractor-invoices\/pay-run/)
    expect(hub).toMatch(/\/portal\/contractor-invoices\/remittances/)
    expect(hub).toMatch(/\/portal\/payroll/)
    expect(hub).toMatch(/\/portal\/payroll\/ird/)
    expect(hub).toMatch(/\/portal\/mileage/)
  })

  it('labels the statements archive as historical rather than an active action', () => {
    expect(hub).toMatch(/Contractor statements \(historical\)/)
  })

  it('does not manufacture urgency — awaiting bank is reported, not alerted', () => {
    // Only partial (a genuine mismatch) reaches Needs attention; plain
    // awaiting-bank does not.
    expect(hub).toMatch(/partlyConfirmedCount > 0/)
    expect(hub).not.toMatch(/attention\.push\([\s\S]{0,120}awaitingBankCount/)
  })
})

describe('worker pay view', () => {
  it('branches on worker_type rather than forcing one shape', () => {
    expect(worker).toMatch(/worker_type/)
    expect(worker).toMatch(/isEmployee/)
    expect(worker).toMatch(/loadContractorWorkerPay/)
    expect(worker).toMatch(/loadEmployeeWorkerPay/)
  })

  it('shows contractor owed + canonical remittance history', () => {
    expect(worker).toMatch(/Currently owed/)
    expect(worker).toMatch(/Payment history/)
    expect(worker).toMatch(/remittances\/\$\{p\.remittanceId\}/)
  })

  it('reads contractor history from frozen remittance items', () => {
    expect(data).toMatch(/contractor_remittance_items/)
    expect(data).toMatch(/tax_status/)
  })

  it('shows employee pay terms + payslips, not contractor fields', () => {
    expect(worker).toMatch(/Pay terms/)
    expect(worker).toMatch(/Recent pay runs/)
    expect(worker).toMatch(/payslips\/\$\{r\.lineId\}\/pdf/)
  })

  it('has clean empty states for both worker types', () => {
    expect(worker).toMatch(/Nothing outstanding/)
    expect(worker).toMatch(/No payments yet/)
    expect(worker).toMatch(/No pay runs for this employee yet/)
  })
})

/**
 * "To pay" — the single total to transfer.
 *
 * Wages and mileage are separate pay runs, so a normal payday is several
 * approved runs settled with ONE bank transfer. Nothing told the operator that
 * total, so it was worked out by hand — and a hand-calculated transfer is how a
 * payment ends up not matching the records.
 */
describe('Pay hub — to pay today', () => {
  it('counts only APPROVED runs — draft is not owed, paid is gone', () => {
    expect(data).toMatch(/r\.status === 'approved'/)
  })

  it('pays net PLUS mileage — what actually lands in the account', () => {
    expect(data).toMatch(/net_pay[\s\S]{0,80}mileage_reimbursement/)
  })

  it('exposes a single total alongside the per-run breakdown', () => {
    expect(data).toMatch(/toPayToday/)
    expect(data).toMatch(/total: round2\(/)
  })

  it('stays read-only like the rest of the hub', () => {
    const code = codeOnly(data)
    expect(code).not.toMatch(/\.update\(/)
    expect(code).not.toMatch(/\.insert\(/)
  })

  it('the hub renders the total and tells the operator to reuse one reference', () => {
    expect(hub).toMatch(/Total to transfer/)
    expect(hub).toMatch(/same bank reference/)
  })

  it('the hub links each run so it can be marked paid', () => {
    expect(hub).toMatch(/\/portal\/payroll\/\$\{r\.id\}/)
  })
})

/**
 * Unattached mileage — the failure that underpaid an employee twice.
 * Mileage is captured when a run is CREATED, so anything approved afterwards
 * is silently skipped by the frozen figures.
 */
describe('Pay hub — unattached mileage indicator', () => {
  it('counts only mileage no run has consumed', () => {
    expect(data).toMatch(/\.is\('pay_run_id', null\)/)
  })

  it('includes draft as well as approved — draft is skipped by every run', () => {
    expect(data).toMatch(/\['approved', 'draft'\]/)
  })

  it('states the money, not just a count', () => {
    expect(data).toMatch(/unreimbursedMileageTotal/)
    expect(hub).toMatch(/unreimbursedMileageTotal/)
  })

  it('warns louder when mileage is still unapproved', () => {
    expect(hub).toMatch(/unapprovedMileageCount/)
    expect(hub).toMatch(/won’t be picked up/)
  })
})
