// "Awaiting payment" — the missing middle stage of the contractor pay workflow.
//
//   Awaiting approval -> Ready to pay -> AWAITING PAYMENT -> Paid -> Bank confirmed
//
// Once payables are bundled into a remittance they correctly leave "Ready to
// pay". Before this stage existed the money then had nowhere to show, so a
// prepared-but-unpaid run could be forgotten entirely — which is what happened
// to the July run (RA-0024..RA-0027, $3,890).
//
// Read-only: this stage must never write payment state.

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

const data = read('src/lib/awaiting-payment-data.ts')
const section = read('src/app/portal/contractor-invoices/pay-run/_components/AwaitingPaymentSection.tsx')
const view = read('src/app/portal/contractor-invoices/pay-run/_components/PayRunView.tsx')
const page = read('src/app/portal/contractor-invoices/pay-run/page.tsx')
const planner = read('src/app/portal/contractor-invoices/remittances/_actions-by-contractor.ts')

describe('awaiting-payment loader', () => {
  it('selects only UNPAID remittances', () => {
    expect(data).toMatch(/\.is\('paid_at', null\)/)
  })

  it('needs no void filter — voiding hard-deletes the batch', () => {
    expect(data).toMatch(/HARD-DELETES/)
  })

  it('ignores superseded lines (corrections are not live money)', () => {
    expect(data).toMatch(/=== 'superseded'\) continue/)
  })

  it('derives the service range from resolved item dates, not payment date', () => {
    expect(data).toMatch(/resolveContractorServiceDate/)
    expect(data).toMatch(/serviceFrom/)
    expect(data).toMatch(/serviceTo/)
  })

  it('never invents a period — undated items are counted, not guessed', () => {
    expect(data).toMatch(/undatedCount/)
    expect(data).toMatch(/never invent a range/)
  })

  it('sorts by payment date so periods stay separate', () => {
    expect(data).toMatch(/\.order\('payment_date'/)
  })

  it('is read-only — writes no payment state', () => {
    // Matches Supabase query-builder mutations specifically. A bare /\.delete\(/
    // would also catch Set.delete() on local expand/collapse state, which is
    // not a database write.
    const dbWrite = /supabase[\s\S]{0,200}?\.(update|insert|upsert|delete)\(/
    for (const src of [data, section, page]) {
      expect(src).not.toMatch(dbWrite)
      expect(src).not.toMatch(/from\('contractor_remittances'\)[\s\S]{0,120}\.update\(/)
    }
  })
})

describe('period separation', () => {
  it('does NOT group by payee — one payee can hold two periods', () => {
    // VMK LTD holds both the July run (RA-0027) and August (RA-0023).
    // Grouping by name would invite paying the wrong one.
    expect(data).toMatch(/NOT grouped by payee/)
    expect(section).toMatch(/never grouped by payee/i)
  })

  it('shows a single date once, not as a range of itself', () => {
    expect(section).toMatch(/serviceFrom === r\.serviceTo/)
  })

  it('falls back honestly when no item resolved to a date', () => {
    expect(section).toMatch(/Dates unavailable/)
  })
})

describe('display + actions', () => {
  it('reuses the canonical mark-paid control — no duplicated payment logic', () => {
    expect(section).toMatch(/RemittancePaidControl/)
    expect(section).not.toMatch(/markRemittancePaid\(/)
  })

  it('links through to the existing remittance detail page', () => {
    expect(section).toMatch(/remittances\/\$\{r\.id\}/)
    // The row's "View" action (whitespace-tolerant — JSX wraps the label).
    expect(section).toMatch(/>\s*View\s*</)
  })

  it('shows the job breakdown from frozen items', () => {
    expect(section).toMatch(/l\.jobNumber/)
    expect(section).toMatch(/l\.jobAddress/)
    expect(section).toMatch(/l\.serviceDate/)
  })

  it('distinguishes adjustment lines from job payments', () => {
    expect(section).toMatch(/isAdjustment/)
    expect(section).toMatch(/Adjustment/)
  })

  it('is calm, not an error state', () => {
    expect(section).not.toMatch(/bg-red-/)
    expect(section).toMatch(/amber/)
  })
})

describe('relationship to Ready to pay', () => {
  it('is NOT period-filtered — an unpaid run is owed regardless of view', () => {
    expect(page).toMatch(/loadAwaitingPayment\(supabase\)/)
    // No period argument is threaded into the call.
    expect(page).not.toMatch(/loadAwaitingPayment\(supabase, period/)
  })

  it('tells the user Ready to pay is not the whole obligation', () => {
    expect(view).toMatch(/Does not include the/)
  })

  it('leaves the Ready-to-pay calculation untouched', () => {
    // Already-remitted invoices stay excluded, exactly as before.
    expect(planner).toMatch(/!remittedSet\.has\(c\.id\)/)
  })

  it('renders the three stages in workflow order', () => {
    // Section headings are the anchors — Awaiting payment first, then Ready to
    // pay, then Awaiting approval (least advanced stage last).
    const awaitingPay = view.indexOf('AwaitingPaymentSection')
    const readyToPay = view.indexOf('>Ready to pay<')
    const approval = view.indexOf('>Awaiting approval<')
    expect(awaitingPay).toBeGreaterThan(-1)
    expect(readyToPay).toBeGreaterThan(-1)
    expect(approval).toBeGreaterThan(-1)
    expect(awaitingPay).toBeLessThan(readyToPay)
    expect(readyToPay).toBeLessThan(approval)
  })
})
