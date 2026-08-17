import { getBankBalance, saveBankBalanceFromImport, BANK_BALANCE_KEY } from '@/lib/bank-balance'
import type { SupabaseClient } from '@supabase/supabase-js'

// A tiny fake supabase that serves one portal_settings row and records upserts.
function fakeSupabase(initial: { amount: number; as_at: string } | null) {
  const state = { row: initial ? { value: initial } : null as { value: unknown } | null }
  const upserts: Array<Record<string, unknown>> = []
  const client = {
    from() {
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: async () => ({ data: state.row, error: null }) }
            },
          }
        },
        upsert(payload: Record<string, unknown>) {
          upserts.push(payload)
          state.row = { value: payload.value }
          return Promise.resolve({ error: null })
        },
      }
    },
  } as unknown as SupabaseClient
  return { client, upserts, state }
}

describe('getBankBalance', () => {
  it('returns null when no valid row exists', async () => {
    const { client } = fakeSupabase(null)
    expect(await getBankBalance(client)).toBeNull()
  })
  it('returns the stored amount + asAt', async () => {
    const { client } = fakeSupabase({ amount: 6790.45, as_at: '2026-06-23' })
    expect(await getBankBalance(client)).toEqual({ amount: 6790.45, asAt: '2026-06-23' })
  })
  it('rejects a malformed row (missing/typed-wrong fields)', async () => {
    const { client } = fakeSupabase({ amount: 100 } as unknown as { amount: number; as_at: string })
    expect(await getBankBalance(client)).toBeNull()
  })
})

describe('saveBankBalanceFromImport — monotonic (never regress to an older statement)', () => {
  it('writes when nothing is stored yet', async () => {
    const { client, upserts } = fakeSupabase(null)
    const res = await saveBankBalanceFromImport(client, { amount: 500, asAt: '2026-07-31' }, 'u1')
    expect(res.updated).toBe(true)
    expect(res.effective).toEqual({ amount: 500, asAt: '2026-07-31' })
    expect(upserts[0].key).toBe(BANK_BALANCE_KEY)
    expect(upserts[0].value).toEqual({ amount: 500, as_at: '2026-07-31' })
  })

  it('writes a NEWER statement over an older stored balance', async () => {
    const { client, upserts } = fakeSupabase({ amount: 100, as_at: '2026-06-30' })
    const res = await saveBankBalanceFromImport(client, { amount: 750, asAt: '2026-07-31' }, 'u1')
    expect(res.updated).toBe(true)
    expect(res.effective.amount).toBe(750)
    expect(upserts).toHaveLength(1)
  })

  it('does NOT overwrite when importing an OLDER statement', async () => {
    const { client, upserts } = fakeSupabase({ amount: 750, as_at: '2026-07-31' })
    const res = await saveBankBalanceFromImport(client, { amount: 100, asAt: '2026-06-30' }, 'u1')
    expect(res.updated).toBe(false)
    expect(res.effective).toEqual({ amount: 750, asAt: '2026-07-31' }) // keeps the newer one
    expect(upserts).toHaveLength(0)
  })

  // A SAME-DAY statement must win. This previously asserted a no-op in the name
  // of idempotency, but that silently discarded the correct figure: exporting
  // again later the same day (after more transactions clear) kept the stale
  // morning balance while reporting success. Real case — ASB stated 8734.75 as
  // of 2026-08-17 while the dashboard held 13430.05, also dated 2026-08-17.
  it('a same-date statement UPDATES the balance (later export is more complete)', async () => {
    const { client, upserts } = fakeSupabase({ amount: 13430.05, as_at: '2026-08-17' })
    const res = await saveBankBalanceFromImport(client, { amount: 8734.75, asAt: '2026-08-17' }, 'u1')
    expect(res.updated).toBe(true)
    expect(res.effective).toEqual({ amount: 8734.75, asAt: '2026-08-17' })
    expect(upserts).toHaveLength(1)
  })

  it('re-importing the identical statement is harmless (same value written back)', async () => {
    const { client, upserts } = fakeSupabase({ amount: 750, as_at: '2026-07-31' })
    const res = await saveBankBalanceFromImport(client, { amount: 750, asAt: '2026-07-31' }, 'u1')
    expect(res.effective).toEqual({ amount: 750, asAt: '2026-07-31' })
    expect(upserts).toHaveLength(1)
  })
})
