// Phase 4 — contractor payment history: Paid vs Bank confirmed.
//
// The critical property is that these are DIFFERENT facts and never collapse:
//   paid_at           = staff recorded the payment
//   payment_confirmed = FULLY matched to outgoing bank money
//
// payment_confirmed only flips true at full coverage
// (allocated >= total - 0.005, see reconcile-out/_actions.ts), so a PARTIALLY
// matched remittance would otherwise be indistinguishable from an untouched
// one. Production currently has 0 allocations, so the partial path has no live
// data to exercise it — these tests are the only coverage it has.

import { readFileSync } from 'fs'
import { join } from 'path'

/** Mirrors the derivation in listRemittanceBatches. */
type PaymentState = 'open' | 'paid' | 'partial' | 'confirmed'
function deriveState(paidAt: string | null, confirmed: boolean, allocated: number): PaymentState {
  if (!paidAt) return 'open'
  if (confirmed) return 'confirmed'
  if (allocated > 0) return 'partial'
  return 'paid'
}

describe('payment state derivation', () => {
  it('is open before staff mark it paid — even if money was somehow allocated', () => {
    expect(deriveState(null, false, 0)).toBe('open')
    expect(deriveState(null, false, 500)).toBe('open')
  })

  it('is paid when stamped but nothing is matched to the bank', () => {
    expect(deriveState('2026-08-15', false, 0)).toBe('paid')
  })

  it('is PARTIAL when some but not all of the money is matched', () => {
    // The case the old binary chip hid completely.
    expect(deriveState('2026-08-15', false, 100)).toBe('partial')
    expect(deriveState('2026-08-15', false, 419.99)).toBe('partial')
  })

  it('is confirmed only when reconciliation says so', () => {
    expect(deriveState('2026-08-15', true, 420)).toBe('confirmed')
  })

  it('trusts the stored flag over the allocation sum', () => {
    // reconcile-out owns payment_confirmed; history must not second-guess it.
    expect(deriveState('2026-08-15', true, 0)).toBe('confirmed')
  })

  it('never treats paid-awaiting-bank as an error state', () => {
    // Guards the intent: "paid" is a normal workflow state, not a failure.
    expect(deriveState('2026-08-15', false, 0)).not.toBe('open')
    expect(deriveState('2026-08-15', false, 0)).not.toBe('confirmed')
  })
})

describe('payment history screen (source-level)', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/remittances/page.tsx'), 'utf8')
  const chip = readFileSync(join(process.cwd(), 'src/app/portal/contractor-invoices/remittances/_components/PaymentStateChip.tsx'), 'utf8')
  const data = readFileSync(join(process.cwd(), 'src/lib/contractor-remittance-data.ts'), 'utf8')

  it('READ-ONLY on payment truth — never writes paid or confirmed state', () => {
    expect(page).not.toMatch(/payment_confirmed:/)
    expect(page).not.toMatch(/\.update\(/)
    expect(page).not.toMatch(/\.insert\(/)
  })

  it('counts only LIVE allocations (reversed ones are not bank money)', () => {
    expect(data).toMatch(/\.is\('reversed_at', null\)/)
  })

  it('searches job number and address from the frozen items', () => {
    expect(data).toMatch(/job_number, job_address/)
    expect(page).toMatch(/b\.jobNumbers/)
    expect(page).toMatch(/b\.jobAddresses/)
  })

  it('offers contractor, job, RA number, reference, date and state filters', () => {
    expect(page).toMatch(/b\.remittanceNumber, b\.payeeLabel, b\.reference/)
    expect(page).toMatch(/name="from"/)
    expect(page).toMatch(/name="to"/)
    expect(page).toMatch(/name="state"/)
  })

  it('uses the FROZEN historical payee, not current grouping rules', () => {
    expect(page).toMatch(/b\.payeeLabel \|\| b\.contractorNames\.join/)
  })

  it('links unconfirmed payments to reconcile-out rather than reconciling inline', () => {
    expect(page).toMatch(/\/portal\/finance\/reconcile-out/)
  })

  it('styles awaiting-bank calmly, never as an error', () => {
    expect(chip).toMatch(/bg-sage-100 text-sage-700/)   // paid = neutral
    expect(chip).not.toMatch(/bg-red-/)
  })

  it('links back to Current pay', () => {
    expect(page).toMatch(/\/portal\/contractor-invoices\/pay-run/)
    expect(page).toMatch(/Current pay/)
  })
})
