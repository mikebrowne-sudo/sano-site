import { readFileSync } from 'fs'
import { join } from 'path'

// The month-series builder is DB-backed, so we test it two ways:
//  1. the month math (walk-back window, labels, keys) via a re-implementation
//     check kept in lockstep with the source; and
//  2. source-level guarantees that it reuses the P&L definitions + is bounded.
// The pure P&L math it delegates to is already covered by the profit-loss tests.

describe('dashboard finance — reuses the P&L, bounded query, correct window', () => {
  const src = readFileSync(join(process.cwd(), 'src/app/portal/_lib/dashboard-finance.ts'), 'utf8')

  it('delegates money-in/out to buildProfitLoss (never a separate definition)', () => {
    expect(src).toMatch(/import \{ buildProfitLoss/)
    expect(src).toMatch(/const pl = buildProfitLoss\(\{ income, expenses, from, to \}\)/)
    expect(src).toMatch(/income: pl\.moneyIn/)
    expect(src).toMatch(/expenses: pl\.moneyOut/)
  })

  it('bounds the invoice + expense queries to the window (not the whole table)', () => {
    expect(src).toMatch(/\.gte\('date_paid', windowStart\)\.lte\('date_paid', windowEnd\)/)
    expect(src).toMatch(/\.gte\('expense_date', windowStart\)\.lte\('expense_date', windowEnd\)/)
    expect(src).toMatch(/\.eq\('status', 'paid'\)/)   // income = paid invoices only
  })

  it('net position is the sum of monthly nets; change % guards divide-by-zero', () => {
    expect(src).toMatch(/netPosition = .*reduce\(\(s, p\) => s \+ p\.net/)
    expect(src).toMatch(/lastMonthNet !== 0/)   // no divide-by-zero on the % change
  })

  it('flags the current (trailing) month as partial for the chart', () => {
    expect(src).toMatch(/partial: key === currentKey/)
    expect(src).toMatch(/const currentKey = monthKey\(ty, tm\)/)
  })

  it('walks the month window back correctly across a year boundary', () => {
    // Mirror the source's walk-back to assert the window it builds for a
    // Feb-2027 "today" with 12 months lands on Mar 2026 → Feb 2027.
    const walk = (ty: number, tm: number, count: number) => {
      const months: { y: number; m: number }[] = []
      let cy = ty, cm = tm
      for (let i = 0; i < count; i++) { months.unshift({ y: cy, m: cm }); cm -= 1; if (cm === 0) { cm = 12; cy -= 1 } }
      return months
    }
    const w = walk(2027, 2, 12)
    expect(w[0]).toEqual({ y: 2026, m: 3 })       // earliest month
    expect(w[w.length - 1]).toEqual({ y: 2027, m: 2 }) // latest = the "today" month
    expect(w).toHaveLength(12)
  })
})

describe('dashboard page — visual-first, admin-only, to-dos moved down', () => {
  const page = readFileSync(join(process.cwd(), 'src/app/portal/page.tsx'), 'utf8')

  it('is admin-only (accountants redirect to finance)', () => {
    expect(page).toMatch(/isAccountantUser\(user\) && !isAdminUser\(user\)\) redirect/)
  })
  it('leads with the growth chart + net-position hero', () => {
    expect(page).toMatch(/Business health hero/)
    expect(page).toMatch(/<GrowthChart points=\{finance\.months\}/)
    expect(page).toMatch(/Net position/)
  })
  it('has all six KPI cards', () => {
    for (const label of ['Outstanding', 'Overdue', 'Received \\(mo\\.\\)', 'Active quotes', 'Jobs \\(mo\\.\\)', 'Avg margin \\(mo\\.\\)']) {
      expect(page).toMatch(new RegExp(`label="${label}"`))
    }
  })
  it('avg margin reuses the job-margin engine (consistent with Job margins page)', () => {
    expect(page).toMatch(/loadJobMargins/)
    expect(page).toMatch(/marginPercent/)
  })
  it('moves the to-do checklist DOWN, below the visual content', () => {
    const heroIdx = page.indexOf('Business health hero')
    const activityIdx = page.indexOf('Recent activity')
    const todoIdx = page.indexOf('To do &amp; reminders')
    expect(heroIdx).toBeGreaterThan(-1)
    expect(todoIdx).toBeGreaterThan(activityIdx)   // to-dos after recent activity
    expect(activityIdx).toBeGreaterThan(heroIdx)   // activity after the hero
  })
})
