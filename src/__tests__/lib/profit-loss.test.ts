import { buildProfitLoss, CONTRACTOR_COST_CATEGORY } from '@/app/portal/finance/_lib/profit-loss'

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
      expenses: [],
      ...RANGE,
    })
    expect(pl.income).toBe(1500)
    expect(pl.incomeCount).toBe(2)
  })

  it('reads contractor cost of sales from wages_payroll expenses (bank-matched)', () => {
    const pl = buildProfitLoss({
      income: [{ total: 1000, datePaid: '2026-05-10' }],
      expenses: [
        { amount: 400, category: CONTRACTOR_COST_CATEGORY, expenseDate: '2026-05-12' },
        { amount: 300, category: CONTRACTOR_COST_CATEGORY, expenseDate: '2026-05-20' },
        { amount: 50, category: 'insurance', expenseDate: '2026-05-15' },
      ],
      ...RANGE,
    })
    expect(pl.costOfSales).toBe(700)
    expect(pl.costOfSalesCount).toBe(2)
    expect(pl.grossProfit).toBe(300)
    // operating excludes the contractor (wages) lines
    expect(pl.operatingExpensesTotal).toBe(50)
    expect(pl.operatingExpenses.map((l) => l.category)).toEqual(['insurance'])
    expect(pl.netProfit).toBe(250)
  })

  it('only counts expenses within the expense_date range', () => {
    const pl = buildProfitLoss({
      income: [{ total: 1000, datePaid: '2026-05-10' }],
      expenses: [
        { amount: 400, category: CONTRACTOR_COST_CATEGORY, expenseDate: '2026-05-12' },
        { amount: 999, category: CONTRACTOR_COST_CATEGORY, expenseDate: '2026-07-01' }, // out of range
      ],
      ...RANGE,
    })
    expect(pl.costOfSales).toBe(400)
  })

  it('exposes a money in / out / net cash tally that mirrors the statement', () => {
    const pl = buildProfitLoss({
      income: [{ total: 1000, datePaid: '2026-05-10' }],
      expenses: [
        { amount: 400, category: CONTRACTOR_COST_CATEGORY, expenseDate: '2026-05-12' },
        { amount: 50, category: 'insurance', expenseDate: '2026-05-15' },
      ],
      ...RANGE,
    })
    expect(pl.moneyIn).toBe(1000)
    expect(pl.moneyOut).toBe(450) // contractor 400 + operating 50
    expect(pl.netCash).toBe(550)
    expect(pl.netCash).toBe(pl.netProfit) // tally reconciles to net profit
  })

  it('puts capex / owner equity below the line, never in net profit or money out', () => {
    const pl = buildProfitLoss({
      income: [{ total: 1000, datePaid: '2026-05-10' }],
      expenses: [
        { amount: 100, category: 'marketing', expenseDate: '2026-05-15' },
        { amount: 3000, category: 'owner_equity', expenseDate: '2026-05-20' },
        { amount: 2000, category: 'capital_expense', expenseDate: '2026-05-22' },
      ],
      ...RANGE,
    })
    expect(pl.operatingExpensesTotal).toBe(100)
    expect(pl.netProfit).toBe(900) // 1000 - 100, capex/equity excluded
    expect(pl.moneyOut).toBe(100) // below-line not in money out
    expect(pl.belowLineTotal).toBe(5000)
    expect(pl.belowLine.map((l) => l.category).sort()).toEqual(['capital_expense', 'owner_equity'])
  })

  it('matches the live figures (bank-matched contractor cost)', () => {
    const pl = buildProfitLoss({
      income: [{ total: 13400, datePaid: '2026-05-10' }],
      expenses: [
        { amount: 7450.01, category: CONTRACTOR_COST_CATEGORY, expenseDate: '2026-05-12' },
        { amount: 301.32, category: 'insurance', expenseDate: '2026-05-15' },
        { amount: 179, category: 'software_subscriptions', expenseDate: '2026-05-16' },
        { amount: 67.73, category: 'marketing', expenseDate: '2026-05-17' },
        { amount: 2698, category: 'cpax', expenseDate: '2026-05-18' },
        { amount: 3000, category: 'owner_equity', expenseDate: '2026-05-20' },
      ],
      ...RANGE,
    })
    expect(pl.income).toBe(13400)
    expect(pl.costOfSales).toBe(7450.01)
    expect(pl.grossProfit).toBe(5949.99)
    expect(pl.operatingExpensesTotal).toBe(3246.05)
    expect(pl.netProfit).toBe(2703.94)
    expect(pl.moneyOut).toBe(10696.06)
    expect(pl.belowLineTotal).toBe(3000)
  })
})
