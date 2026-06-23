import { buildProfitLoss, DOUBLE_COUNT_EXPENSE_CATEGORIES } from '@/app/portal/finance/_lib/profit-loss'

const RANGE = { from: '2026-04-01', to: '2026-06-30' }

describe('buildProfitLoss (cash basis)', () => {
  it('counts only paid income within the date_paid range', () => {
    const pl = buildProfitLoss({
      income: [
        { total: 1000, datePaid: '2026-05-10' },
        { total: 500, datePaid: '2026-06-29' },
        { total: 999, datePaid: null }, // unpaid — excluded
        { total: 777, datePaid: '2026-07-05' }, // out of range — excluded
      ],
      contractors: [],
      expenses: [],
      ...RANGE,
    })
    expect(pl.income).toBe(1500)
    expect(pl.incomeCount).toBe(2)
  })

  it('counts only paid contractor payments as cost of sales', () => {
    const pl = buildProfitLoss({
      income: [{ total: 1000, datePaid: '2026-05-10' }],
      contractors: [
        { amount: 400, datePaid: '2026-05-12' },
        { amount: 100, datePaid: null }, // approved-unpaid — excluded
      ],
      expenses: [],
      ...RANGE,
    })
    expect(pl.costOfSales).toBe(400)
    expect(pl.costOfSalesCount).toBe(1)
    expect(pl.grossProfit).toBe(600)
    expect(pl.grossMarginPct).toBe(60)
  })

  it('excludes wages_payroll (double-count) from operating expenses', () => {
    const pl = buildProfitLoss({
      income: [{ total: 1000, datePaid: '2026-05-10' }],
      contractors: [{ amount: 400, datePaid: '2026-05-12' }],
      expenses: [
        { amount: 400, category: 'wages_payroll', expenseDate: '2026-05-12' },
        { amount: 50, category: 'insurance', expenseDate: '2026-05-15' },
      ],
      ...RANGE,
    })
    // operating excludes wages_payroll
    expect(pl.operatingExpensesTotal).toBe(50)
    expect(pl.operatingExpenses.map((l) => l.category)).toEqual(['insurance'])
    // wages surfaced separately, not in net profit
    expect(pl.excludedDoubleCountTotal).toBe(400)
    expect(pl.excludedDoubleCount[0].category).toBe('wages_payroll')
    // net = gross 600 - operating 50 = 550 (wages NOT subtracted again)
    expect(pl.netProfit).toBe(550)
  })

  it('puts capex / owner equity below the line, never in net profit', () => {
    const pl = buildProfitLoss({
      income: [{ total: 1000, datePaid: '2026-05-10' }],
      contractors: [],
      expenses: [
        { amount: 100, category: 'marketing', expenseDate: '2026-05-15' },
        { amount: 3000, category: 'owner_equity', expenseDate: '2026-05-20' },
        { amount: 2000, category: 'capital_expense', expenseDate: '2026-05-22' },
      ],
      ...RANGE,
    })
    expect(pl.operatingExpensesTotal).toBe(100)
    expect(pl.netProfit).toBe(900) // 1000 - 100, capex/equity excluded
    expect(pl.belowLineTotal).toBe(5000)
    expect(pl.belowLine.map((l) => l.category).sort()).toEqual(['capital_expense', 'owner_equity'])
  })

  it('handles float amounts without rounding noise', () => {
    const pl = buildProfitLoss({
      income: [{ total: 13400, datePaid: '2026-05-10' }],
      contractors: [{ amount: 7095, datePaid: '2026-05-12' }],
      expenses: [
        { amount: 301.32, category: 'insurance', expenseDate: '2026-05-15' },
        { amount: 179, category: 'software_subscriptions', expenseDate: '2026-05-16' },
        { amount: 67.73, category: 'marketing', expenseDate: '2026-05-17' },
        { amount: 2698, category: 'cpax', expenseDate: '2026-05-18' },
        { amount: 7450.01, category: 'wages_payroll', expenseDate: '2026-05-19' },
        { amount: 3000, category: 'owner_equity', expenseDate: '2026-05-20' },
      ],
      ...RANGE,
    })
    expect(pl.income).toBe(13400)
    expect(pl.costOfSales).toBe(7095)
    expect(pl.grossProfit).toBe(6305)
    expect(pl.operatingExpensesTotal).toBe(3246.05)
    expect(pl.netProfit).toBe(3058.95)
    expect(pl.belowLineTotal).toBe(3000)
  })

  it('exposes the double-count category list for the UI note', () => {
    expect(DOUBLE_COUNT_EXPENSE_CATEGORIES).toContain('wages_payroll')
  })
})
