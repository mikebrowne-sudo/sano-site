import { readFileSync } from 'fs'
import { join } from 'path'

// Regression: the Pay run listed EVERY contractor as a selectable "$0 payee"
// (including inactive ones like Dipesh / Nicole, and active-but-nothing-owed
// like Radhika) because loadPlan built a GroupPlan per contractor and never
// dropped the empty ones. The fix filters the plan to groups that actually
// have something in the run — eligible jobs OR an undated amount worth flagging.
//
// The filter is deliberately eligibility-based, NOT status-based: an *inactive*
// contractor who still has unpaid work (real case: Anishal Kumar, $105) must
// still surface. Hiding by status alone would bury a genuine debt.

describe('the by-contractor planner drops contractors with nothing to pay (source-level)', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/app/portal/contractor-invoices/remittances/_actions-by-contractor.ts'),
    'utf8',
  )

  it('filters the plan to payees with eligible jobs or an undated amount', () => {
    expect(src).toMatch(/\.filter\(\(g\) => g\.ciCount > 0 \|\| g\.undatedCount > 0\)/)
  })

  it('filters by eligibility, not contractor status (so unpaid inactive work still shows)', () => {
    // No status-based gate crept in — an inactive contractor with pending pay
    // must remain visible; only zero-pending contractors are dropped.
    expect(src).not.toMatch(/status\s*[!=]==?\s*['"]inactive['"]/)
  })
})
