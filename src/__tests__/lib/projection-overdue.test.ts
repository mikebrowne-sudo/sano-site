// "Projected in" — overdue invoices belong in the CURRENT month.
//
// Money that should already be in is still expected: you want it now. Bucketing
// it by its original due month buried it in the past, where the chart's window
// starts at the current month — so it vanished entirely.
//
// Real case (2026-08-17): $1,420 across three June/July invoices was genuinely
// owed but invisible on the projection, because the query itself started at
// rangeStart and never fetched them.

import { readFileSync } from 'fs'
import { join } from 'path'

const src = readFileSync(
  join(process.cwd(), 'src/app/portal/_lib/dashboard-finance.ts'),
  'utf8',
)

/** Mirrors the bucketing rule in buildIncomeProjection. */
function bucketFor(dueMonth: string, currentMonth: string): string {
  return dueMonth < currentMonth ? currentMonth : dueMonth
}

describe('overdue bucketing rule', () => {
  const CURRENT = '2026-08'

  it('an invoice due THIS month stays in this month', () => {
    expect(bucketFor('2026-08', CURRENT)).toBe('2026-08')
  })

  it('an OVERDUE invoice rolls into the current month', () => {
    expect(bucketFor('2026-06', CURRENT)).toBe('2026-08')
    expect(bucketFor('2026-07', CURRENT)).toBe('2026-08')
  })

  it('a FUTURE invoice stays in its own month', () => {
    expect(bucketFor('2026-09', CURRENT)).toBe('2026-09')
    expect(bucketFor('2026-10', CURRENT)).toBe('2026-10')
  })

  it('the real production case resolves as expected', () => {
    // 16 invoices due Aug ($8,145) + 3 overdue Jun/Jul ($1,420) = $9,565 in Aug.
    const invoices = [
      { due: '2026-06', amount: 580 },
      { due: '2026-07', amount: 420 },
      { due: '2026-07', amount: 420 },
      { due: '2026-08', amount: 8145 },
    ]
    const totals: Record<string, number> = {}
    for (const i of invoices) {
      const k = bucketFor(i.due, CURRENT)
      totals[k] = (totals[k] ?? 0) + i.amount
    }
    expect(totals['2026-08']).toBe(9565)
    // Nothing is left stranded in a past month.
    expect(totals['2026-06']).toBeUndefined()
    expect(totals['2026-07']).toBeUndefined()
  })
})

describe('projection query (source-level)', () => {
  it('has NO lower bound on due_date, so overdue invoices are fetched', () => {
    // The bug: `.gte('due_date', rangeStart)` meant overdue invoices were never
    // even returned, so no amount of re-bucketing could have surfaced them.
    expect(src).not.toMatch(/\.gte\('due_date', rangeStart\)/)
    // The upper bound stays — invoices beyond the window are still excluded.
    expect(src).toMatch(/\.lte\('due_date', rangeEnd\)/)
  })

  it('buckets anything due before this month into the current month', () => {
    expect(src).toMatch(/dueKey < currentKey \? currentKey : dueKey/)
  })

  it('still counts only SENT unpaid invoices', () => {
    expect(src).toMatch(/\.eq\('status', 'sent'\)/)
    expect(src).toMatch(/\.is\('deleted_at', null\)/)
  })
})
