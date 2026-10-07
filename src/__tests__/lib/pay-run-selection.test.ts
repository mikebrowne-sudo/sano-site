// Explicit payable selection in Pay Run.
//
// THE INVARIANT: what staff tick and review is exactly what is placed onto the
// remittance. Previously Pay Run swept every eligible payable for a contractor,
// so paying Upasni's July work also paid her August job.
//
// Default rule: everything due BY the end of the selected period — the period's
// own work plus older unpaid backlog — but never later-period work. Undated
// items are surfaced for review rather than silently swept in.

import { classifyPayable, defaultSelection, REASON_LABEL } from '@/lib/pay-run-selection'
import { readFileSync } from 'fs'
import { join } from 'path'

// The real Upasni case: 16–31 July run.
const P_START = '2026-07-16'
const P_END = '2026-07-31'

const CI_0085 = { ciId: 'CI-0085', serviceDate: '2026-07-23' }  // in period
const CI_0088 = { ciId: 'CI-0088', serviceDate: '2026-05-03' }  // older unpaid
const CI_0086 = { ciId: 'CI-0086', serviceDate: '2026-06-11' }  // older unpaid
const CI_0099 = { ciId: 'CI-0099', serviceDate: '2026-08-13' }  // NEXT period
const UNDATED = { ciId: 'CI-XXXX', serviceDate: null }

describe('default selection rule', () => {
  it('preselects current-period items', () => {
    const c = classifyPayable(CI_0085, P_START, P_END)
    expect(c.selected).toBe(true)
    expect(c.reason).toBe('in_period')
  })

  it('preselects OLDER unpaid items as overdue backlog', () => {
    for (const ci of [CI_0088, CI_0086]) {
      const c = classifyPayable(ci, P_START, P_END)
      expect(c.selected).toBe(true)
      expect(c.reason).toBe('overdue')
    }
  })

  it('does NOT preselect later-period items', () => {
    const c = classifyPayable(CI_0099, P_START, P_END)
    expect(c.selected).toBe(false)
    expect(c.reason).toBe('later_period')
  })

  it('surfaces undated items for review rather than silently including them', () => {
    const c = classifyPayable(UNDATED, P_START, P_END)
    expect(c.selected).toBe(false)
    expect(c.reason).toBe('undated')
    expect(REASON_LABEL.undated).toMatch(/review/i)
  })

  it('selects every dated payable when no period is set (everything owed)', () => {
    expect(classifyPayable(CI_0099, null, null).selected).toBe(true)
    expect(classifyPayable(CI_0088, null, null).selected).toBe(true)
    // Undated still needs a human.
    expect(classifyPayable(UNDATED, null, null).selected).toBe(false)
  })

  it('THE UPASNI CASE — 16–31 Jul selects exactly CI-0085, CI-0088, CI-0086', () => {
    const sel = defaultSelection([CI_0085, CI_0088, CI_0086, CI_0099], P_START, P_END)
    expect(Array.from(sel).sort()).toEqual(['CI-0085', 'CI-0086', 'CI-0088'])
    expect(sel.has('CI-0099')).toBe(false)
    expect(sel.size).toBe(3)
  })

  it('boundary dates are inclusive at both ends', () => {
    expect(classifyPayable({ ciId: 'a', serviceDate: P_START }, P_START, P_END).selected).toBe(true)
    expect(classifyPayable({ ciId: 'b', serviceDate: P_END }, P_START, P_END).selected).toBe(true)
    // One day past the end is next period.
    expect(classifyPayable({ ciId: 'c', serviceDate: '2026-08-01' }, P_START, P_END).selected).toBe(false)
  })
})

describe('selection reaches payment (source-level)', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  const view = read('src/app/portal/contractor-invoices/pay-run/_components/PayRunView.tsx')
  const action = read('src/app/portal/contractor-invoices/remittances/_actions-by-contractor.ts')

  it('the create call sends the ticked ids', () => {
    expect(view).toMatch(/selectedCiIds: Array\.from\(selectedCiIds\)/)
  })

  it('the server pays only the INTERSECTION of eligible and selected', () => {
    // Intersecting keeps the server authoritative on eligibility — a stale or
    // tampered payload can never widen what is paid.
    expect(action).toMatch(/g\.ciIds\.filter\(\(id\) => selected\.has\(id\)\)/)
    expect(action).toMatch(/selectedCiIds\?: string\[\]/)
  })

  it('an empty selection is rejected rather than silently paying everything', () => {
    expect(action).toMatch(/Select at least one job to pay/)
  })

  it('an unselected eligible invoice is skipped, not remitted', () => {
    expect(action).toMatch(/reason: selected \? 'nothing selected' : 'no unpaid jobs'/)
  })

  it('per-payee review totals use the SELECTED subset', () => {
    expect(action).toMatch(/const paySum =/)
    expect(view).toMatch(/const sel = groupSelection\(g\)/)
    expect(view).toMatch(/money\(sel\.total\)/)
  })

  it('search hiding a row does not deselect it — selection is separate state', () => {
    // visibleGroups drives DISPLAY; selectedCiIds is independent of `needle`.
    expect(view).toMatch(/const visibleGroups = needle/)
    expect(view).not.toMatch(/needle[\s\S]{0,200}setSelectedCiIds/)
  })

  it('selection re-seeds only when the PERIOD changes, not on every render', () => {
    expect(view).toMatch(/seededRef/)
    expect(view).toMatch(/if \(seededRef\.current === seedKey\) return/)
  })

  it('offers select-all, clear-all and re-apply-default controls', () => {
    expect(view).toMatch(/Select due for this run/)
    expect(view).toMatch(/Select all/)
    expect(view).toMatch(/Clear all/)
  })

  it('shared-payee grouping still rolls selected items into one payment', () => {
    // Selection filters WITHIN the derived group, so VMK's combined
    // Kritika + Anishal group still produces a single remittance.
    expect(action).toMatch(/payeeLabel: g\.payeeName/)
    expect(action).toMatch(/ciIds: payIds/)
  })

  it('the one-invoice-one-remittance guard is still in the create path', () => {
    const batch = read('src/app/portal/contractor-invoices/_actions-remittance-batch.ts')
    expect(batch).toMatch(/INVARIANT: one contractor invoice/)
    expect(batch).toMatch(/can only be paid once/)
  })
})
