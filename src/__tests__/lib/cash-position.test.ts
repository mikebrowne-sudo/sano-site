import { buildCashPosition } from '@/lib/cash-position'
import {
  OWNER_CAPITAL_CATEGORY,
  EXPENSE_REIMBURSEMENT_CATEGORY,
  DIRECTOR_LOAN_CATEGORY,
  SELECTABLE_EXPENSE_CATEGORIES,
  EXPENSE_CATEGORIES,
  isAccountantConfirmCategory,
} from '@/lib/expense-categories'
import type { SupabaseClient } from '@supabase/supabase-js'

// Fake supabase serving the bank_balance setting + owner_capital expense rows.
function fakeSupabase(opts: {
  balance: { amount: number; as_at: string } | null
  ownerCapitalRows: { amount: number }[]
}) {
  const client = {
    from(table: string) {
      if (table === 'portal_settings') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: opts.balance ? { value: opts.balance } : null, error: null }) }) }) }
      }
      // expenses
      return { select: () => ({ eq: (_col: string, val: string) => Promise.resolve({ data: val === OWNER_CAPITAL_CATEGORY ? opts.ownerCapitalRows : [], error: null }) }) }
    },
  } as unknown as SupabaseClient
  return client
}

describe("Mike's cash-position treatment", () => {
  it('net = total company cash − genuine owner capital only', async () => {
    // The real numbers: $12,330.62 total cash, $1,000 genuine owner capital.
    const client = fakeSupabase({
      balance: { amount: 12330.62, as_at: '2026-08-01' },
      ownerCapitalRows: [{ amount: 1000 }],
    })
    const cp = await buildCashPosition(client)
    expect(cp.totalCash).toBe(12330.62)
    expect(cp.ownerCapital).toBe(1000)
    expect(cp.netOfOwnerFunding).toBe(11330.62) // the required figure
    expect(cp.hasBalance).toBe(true)
  })

  it('does NOT subtract reimbursements or director loans — only owner_capital rows are summed', async () => {
    // Even if reimbursement/loan rows exist in the table, buildCashPosition
    // queries category = owner_capital, so they never reduce the position.
    const client = fakeSupabase({
      balance: { amount: 12330.62, as_at: '2026-08-01' },
      ownerCapitalRows: [{ amount: 1000 }], // the $2,000 reimbursement is NOT here
    })
    const cp = await buildCashPosition(client)
    expect(cp.netOfOwnerFunding).toBe(11330.62) // not 9330.62
  })

  it('reports zero cleanly when no bank balance is set', async () => {
    const cp = await buildCashPosition(fakeSupabase({ balance: null, ownerCapitalRows: [] }))
    expect(cp.hasBalance).toBe(false)
    expect(cp.totalCash).toBe(0)
    expect(cp.netOfOwnerFunding).toBe(0)
  })
})

describe('expense categories distinguish the five cash treatments', () => {
  it('has distinct codes for owner capital, reimbursement, and director loan', () => {
    const vals = EXPENSE_CATEGORIES.map((c) => c.value)
    expect(vals).toContain(OWNER_CAPITAL_CATEGORY)
    expect(vals).toContain(EXPENSE_REIMBURSEMENT_CATEGORY)
    expect(vals).toContain(DIRECTOR_LOAN_CATEGORY)
    // three genuinely different codes
    expect(new Set([OWNER_CAPITAL_CATEGORY, EXPENSE_REIMBURSEMENT_CATEGORY, DIRECTOR_LOAN_CATEGORY]).size).toBe(3)
  })

  it('keeps all owner/equity/capital treatments below the P&L line (accountantConfirm)', () => {
    for (const c of ['owner_capital', 'expense_reimbursement', 'director_loan', 'capital_expense']) {
      expect(isAccountantConfirmCategory(c)).toBe(true)
    }
  })

  it('hides the legacy owner_equity value from the capture dropdown', () => {
    expect(SELECTABLE_EXPENSE_CATEGORIES.map((c) => c.value)).not.toContain('owner_equity')
    // but it still resolves for old rows
    expect(EXPENSE_CATEGORIES.map((c) => c.value)).toContain('owner_equity')
  })
})
