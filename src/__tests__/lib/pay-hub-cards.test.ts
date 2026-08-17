// Pay hub cards + period-as-selection.
//
// Two properties this locks:
//
//  1. /portal/pay presents FOUR primary cards, each a summary with one obvious
//     way in — Contractor Pay, Employee Pay, Payment History, IRD &
//     Reconciliation. Contractor and employee pay stay separate.
//
//  2. The pay period SUGGESTS what to tick; it never hides a payable. It used
//     to filter the plan server-side, so choosing "16-31 Jul" physically
//     removed May and June work — overdue backlog vanished rather than being
//     offered as "Older unpaid".

import { readFileSync } from 'fs'
import { join } from 'path'
import { classifyPayable, defaultSelection } from '@/lib/pay-run-selection'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const hub = read('src/app/portal/pay/page.tsx')
const page = read('src/app/portal/contractor-invoices/pay-run/page.tsx')
const view = read('src/app/portal/contractor-invoices/pay-run/_components/PayRunView.tsx')
const action = read('src/app/portal/contractor-invoices/remittances/_actions-by-contractor.ts')

describe('pay hub — four primary cards', () => {
  it('renders exactly the four named cards', () => {
    for (const t of ['Contractor Pay', 'Employee Pay', 'Payment History', 'IRD &amp; Reconciliation']) {
      expect(hub).toContain(t)
    }
    // One <PayCard> per card.
    expect(hub.match(/<PayCard/g)).toHaveLength(4)
  })

  it('each card has one obvious primary action', () => {
    expect(hub).toMatch(/Open Contractor Pay/)
    expect(hub).toMatch(/Open Employee Payroll/)
    expect(hub).toMatch(/View Payment History/)
    expect(hub).toMatch(/Bank reconciliation/)
  })

  it('card totals come from the canonical loaders, not bespoke queries', () => {
    expect(hub).toMatch(/loadContractorPayOverview/)
    expect(hub).toMatch(/loadEmployeePayOverview/)
    expect(hub).toMatch(/loadAwaitingPayment/)
    // Approval count reuses the same source Contractor Pay uses.
    expect(hub).toMatch(/awaitingAuthorisation\(await loadApprovalRows/)
  })

  it('uses the portal design system rather than a bespoke look', () => {
    expect(hub).toMatch(/buttonClasses/)
  })

  it('keeps contractor and employee pay separate', () => {
    const contractorAt = hub.indexOf('Contractor Pay')
    const employeeAt = hub.indexOf('Employee Pay')
    expect(contractorAt).toBeGreaterThan(-1)
    expect(employeeAt).toBeGreaterThan(contractorAt)
    expect(hub).toMatch(/\/portal\/payroll/)
  })

  it('is read-only — viewing the hub changes no payment state', () => {
    expect(hub).not.toMatch(/\.update\(|\.insert\(|\.delete\(|\.rpc\(/)
  })
})

describe('period suggests, never hides', () => {
  const P_START = '2026-07-16'
  const P_END = '2026-07-31'

  it('the plan is loaded unfiltered so nothing disappears', () => {
    expect(page).toMatch(/previewRemittancesForContractors\(allContractorIds, payDate, \{\}\)/)
  })

  it('awaiting approval is also unfiltered — a backlog, not a period concern', () => {
    expect(page).toMatch(/loadApprovalRows\(supabase, \{\}\)/)
  })

  it('current-period work defaults selected', () => {
    expect(classifyPayable({ ciId: 'a', serviceDate: '2026-07-23' }, P_START, P_END))
      .toMatchObject({ selected: true, reason: 'in_period' })
  })

  it('older unpaid work is VISIBLE and defaults selected', () => {
    expect(classifyPayable({ ciId: 'b', serviceDate: '2026-05-03' }, P_START, P_END))
      .toMatchObject({ selected: true, reason: 'overdue' })
  })

  it('next-period work stays visible but unselected', () => {
    expect(classifyPayable({ ciId: 'c', serviceDate: '2026-08-13' }, P_START, P_END))
      .toMatchObject({ selected: false, reason: 'later_period' })
  })

  it('undated work stays visible and unselected (PR #569 safety, unchanged)', () => {
    expect(classifyPayable({ ciId: 'd', serviceDate: null }, P_START, P_END))
      .toMatchObject({ selected: false, reason: 'undated' })
  })

  it('the whole Upasni set resolves to exactly the three July-run payables', () => {
    const sel = defaultSelection([
      { ciId: 'CI-0085', serviceDate: '2026-07-23' },
      { ciId: 'CI-0088', serviceDate: '2026-05-03' },
      { ciId: 'CI-0086', serviceDate: '2026-06-11' },
      { ciId: 'CI-0099', serviceDate: '2026-08-13' },
    ], P_START, P_END)
    expect(Array.from(sel).sort()).toEqual(['CI-0085', 'CI-0086', 'CI-0088'])
  })

  it('the UI explains preselection rather than filtering', () => {
    expect(view).toMatch(/Everything owed is listed/)
    expect(view).not.toMatch(/Filtered to one pay period/)
  })
})

describe('#569 safeguards remain intact', () => {
  it('the server still pays the INTERSECTION of eligible and selected', () => {
    expect(action).toMatch(/g\.ciIds\.filter\(\(id\) => selected\.has\(id\)\)/)
  })

  it('an empty selection is still rejected, never "pay everything"', () => {
    expect(action).toMatch(/Select at least one job to pay/)
  })

  it('the create call still sends explicit selected ids', () => {
    expect(view).toMatch(/selectedCiIds: Array\.from\(selectedCiIds\)/)
  })

  it('payees with nothing selected are excluded from review', () => {
    expect(view).toMatch(/const selectedGroups = payableGroups\.filter\(\(g\) => groupSelection\(g\)\.count > 0\)/)
    expect(view).toMatch(/const payeeCount = selectedGroups\.length/)
  })

  it('search stays display-only — hiding a row never deselects it', () => {
    expect(view).toMatch(/const visibleGroups = needle/)
    expect(view).not.toMatch(/needle[\s\S]{0,200}setSelectedCiIds/)
  })

  it('awaiting payment is unaffected by period selection', () => {
    expect(page).toMatch(/loadAwaitingPayment\(supabase\)/)
    expect(page).not.toMatch(/loadAwaitingPayment\(supabase, period/)
  })

  it('shared-payee grouping still rolls selected items into one payment', () => {
    expect(action).toMatch(/payeeLabel: g\.payeeName/)
    expect(action).toMatch(/ciIds: payIds/)
  })

  it('unapproved work cannot enter the payment selection', () => {
    // The planner only ever considers status='approved' payables.
    expect(action).toMatch(/\.eq\('status', 'approved'\)/)
  })
})
