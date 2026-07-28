/** @jest-environment node */

// Action-level tests for durable bank↔invoice reconciliation. Focus on the
// financial guards: the INV-26022 allocate-a-paid-invoice happy path, blocking
// over-allocation, blocking a duplicate (DB unique violation), and reversal
// un-clearing a partially-allocated line. Supabase is mocked per the repo pattern.

jest.mock('@/lib/supabase-server')
jest.mock('@/lib/is-admin', () => ({ isAdminUser: () => true, isFinanceUser: () => true }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { reconcileBankTransaction, reverseAllocation } from '@/app/portal/finance/reconcile/_actions'
import { createClient } from '@/lib/supabase-server'

const mockedCreate = createClient as unknown as jest.Mock

interface Tracked {
  allocationInserts: Record<string, unknown>[][]
  invoiceUpdates: Record<string, unknown>[]
  bankUpdates: Record<string, unknown>[]
  auditInserts: Record<string, unknown>[]
  allocationUpdates: Record<string, unknown>[]
}

/**
 * Build a mock Supabase client. `state` describes the current DB rows the
 * action will read; `insertError` optionally forces the allocation insert to
 * fail (e.g. the unique-violation path).
 */
function makeClient(state: {
  bankLine: { id: string; amount: number; direction: string }
  invoices: Array<{ id: string; invoice_number: string; status: string; base_price: number; discount?: number }>
  txnAllocated?: Array<{ amount_allocated: number }>
  invAllocated?: Array<{ invoice_id: string; amount_allocated: number }>
  allocationRow?: { id: string; bank_transaction_id: string; invoice_id: string; amount_allocated: number; reversed_at: string | null }
  remainingAllocsAfterReverse?: Array<{ amount_allocated: number }>
  insertError?: { code?: string; message: string } | null
}) {
  const tracked: Tracked = { allocationInserts: [], invoiceUpdates: [], bankUpdates: [], auditInserts: [], allocationUpdates: [] }

  // Chainable query builder that resolves to a preset payload.
  function query(resolve: () => { data: unknown; error: unknown }) {
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'is', 'neq', 'order']) {
      chain[m] = () => chain
    }
    chain.single = async () => resolve()
    // awaiting the builder (no .single) resolves the list form
    ;(chain as { then: unknown }).then = (onF: (v: unknown) => unknown) => Promise.resolve(resolve()).then(onF)
    return chain
  }

  const from = jest.fn((table: string) => {
    if (table === 'bank_transactions') {
      return {
        select: () => query(() => ({ data: state.bankLine, error: null })),
        update: (patch: Record<string, unknown>) => {
          tracked.bankUpdates.push(patch)
          return { eq: async () => ({ error: null }) }
        },
      }
    }
    if (table === 'invoices') {
      return {
        select: () => query(() => ({ data: state.invoices, error: null })),
        update: (patch: Record<string, unknown>) => {
          tracked.invoiceUpdates.push(patch)
          return { in: () => ({ neq: () => ({ select: async () => ({ data: state.invoices.filter((i) => i.status !== 'paid').map((i) => ({ id: i.id })), error: null }) }) }) }
        },
      }
    }
    if (table === 'invoice_payment_allocations') {
      return {
        select: (cols: string) => {
          // Which read is this? Distinguish by requested columns. Check the
          // single-row reverse-load first (it uniquely includes `reversed_at`).
          if (cols.includes('reversed_at')) {
            // reverseAllocation loads the one allocation row via .single()
            return query(() => ({ data: state.allocationRow, error: null }))
          }
          if (cols.includes('invoice_id') && cols.includes('amount_allocated')) {
            // reconcile: live allocations for the target invoices
            return query(() => ({ data: state.invAllocated ?? [], error: null }))
          }
          if (cols.includes('amount_allocated')) {
            // txn-allocated (reconcile) or remaining-after-reverse
            return query(() => ({ data: state.remainingAllocsAfterReverse ?? state.txnAllocated ?? [], error: null }))
          }
          return query(() => ({ data: [], error: null }))
        },
        insert: async (rows: Record<string, unknown>[]) => {
          tracked.allocationInserts.push(rows)
          return { error: state.insertError ?? null }
        },
        update: (patch: Record<string, unknown>) => {
          tracked.allocationUpdates.push(patch)
          return { eq: () => ({ is: async () => ({ error: null }) }) }
        },
      }
    }
    if (table === 'audit_log') {
      return { insert: async (row: Record<string, unknown>) => { tracked.auditInserts.push(row); return { error: null } } }
    }
    throw new Error(`unexpected table ${table}`)
  })

  const client = { auth: { getUser: async () => ({ data: { user: { id: 'admin1' } } }) }, from }
  return { client, tracked }
}

beforeEach(() => mockedCreate.mockReset())

describe('reconcileBankTransaction — allocate a paid invoice (INV-26022)', () => {
  it('records an allocation, leaves the paid invoice paid, clears the fully-allocated line, and audits', async () => {
    const { client, tracked } = makeClient({
      bankLine: { id: 'txn1', amount: 650, direction: 'in' },
      invoices: [{ id: 'inv26022', invoice_number: 'INV-26022', status: 'paid', base_price: 650, discount: 0 }],
      txnAllocated: [],
      invAllocated: [],
    })
    mockedCreate.mockReturnValue(client)

    const r = await reconcileBankTransaction('txn1', [{ invoiceId: 'inv26022', amount: 650 }], '2026-05-24')

    expect(r.ok).toBe(true)
    expect(r.allocated).toBe(1)
    // paid invoice stays paid → no invoice update ran
    expect(tracked.invoiceUpdates).toHaveLength(0)
    expect(r.markedPaid).toBe(0)
    // durable allocation written
    expect(tracked.allocationInserts[0][0]).toMatchObject({ bank_transaction_id: 'txn1', invoice_id: 'inv26022', amount_allocated: 650 })
    // fully allocated → line cleared
    expect(r.cleared).toBe(true)
    expect(tracked.bankUpdates[0]).toMatchObject({ cleared: true })
    // audit row
    expect(tracked.auditInserts[0]).toMatchObject({ action: 'bank.reconciled', entity_id: 'txn1' })
  })

  it('marks an UNPAID invoice paid on allocation', async () => {
    const { client, tracked } = makeClient({
      bankLine: { id: 'txn2', amount: 650, direction: 'in' },
      invoices: [{ id: 'invS', invoice_number: 'INV-0100', status: 'sent', base_price: 650, discount: 0 }],
    })
    mockedCreate.mockReturnValue(client)

    const r = await reconcileBankTransaction('txn2', [{ invoiceId: 'invS', amount: 650 }], '2026-05-24')
    expect(r.ok).toBe(true)
    expect(tracked.invoiceUpdates[0]).toMatchObject({ status: 'paid', date_paid: '2026-05-24' })
    expect(r.markedPaid).toBe(1)
  })

  it('does NOT clear the line on a partial allocation', async () => {
    const { client, tracked } = makeClient({
      bankLine: { id: 'txn3', amount: 650, direction: 'in' },
      invoices: [{ id: 'invP', invoice_number: 'INV-0200', status: 'sent', base_price: 1000, discount: 0 }],
    })
    mockedCreate.mockReturnValue(client)

    const r = await reconcileBankTransaction('txn3', [{ invoiceId: 'invP', amount: 400 }], '2026-05-24')
    expect(r.ok).toBe(true)
    expect(r.cleared).toBe(false)
    expect(tracked.bankUpdates).toHaveLength(0) // never cleared
  })

  it('blocks over-allocating the invoice', async () => {
    const { client, tracked } = makeClient({
      bankLine: { id: 'txn4', amount: 1000, direction: 'in' },
      invoices: [{ id: 'invO', invoice_number: 'INV-0300', status: 'sent', base_price: 650, discount: 0 }],
    })
    mockedCreate.mockReturnValue(client)

    const r = await reconcileBankTransaction('txn4', [{ invoiceId: 'invO', amount: 800 }], null)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/invoice total/i)
    expect(tracked.allocationInserts).toHaveLength(0) // nothing written
  })

  it('blocks a duplicate allocation (DB unique violation surfaces a clear message)', async () => {
    const { client } = makeClient({
      bankLine: { id: 'txn5', amount: 650, direction: 'in' },
      invoices: [{ id: 'invD', invoice_number: 'INV-0400', status: 'paid', base_price: 650, discount: 0 }],
      insertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })
    mockedCreate.mockReturnValue(client)

    const r = await reconcileBankTransaction('txn5', [{ invoiceId: 'invD', amount: 650 }], null)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/already allocated/i)
  })

  it('refuses to allocate a debit (money out)', async () => {
    const { client } = makeClient({
      bankLine: { id: 'txn6', amount: -650, direction: 'out' },
      invoices: [{ id: 'invX', invoice_number: 'INV-0500', status: 'paid', base_price: 650 }],
    })
    mockedCreate.mockReturnValue(client)
    const r = await reconcileBankTransaction('txn6', [{ invoiceId: 'invX', amount: 650 }], null)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/incoming payments/i)
  })
})

describe('reverseAllocation', () => {
  it('reverses an allocation and un-clears a line that is no longer fully allocated', async () => {
    const { client, tracked } = makeClient({
      bankLine: { id: 'txn7', amount: 650, direction: 'in' },
      invoices: [],
      allocationRow: { id: 'alloc1', bank_transaction_id: 'txn7', invoice_id: 'inv26022', amount_allocated: 650, reversed_at: null },
      remainingAllocsAfterReverse: [], // nothing left after reversal → un-clear
    })
    mockedCreate.mockReturnValue(client)

    const r = await reverseAllocation('alloc1', 'wrong invoice')
    expect(r.ok).toBe(true)
    // soft reversal recorded
    expect(tracked.allocationUpdates[0]).toMatchObject({ reversal_reason: 'wrong invoice' })
    expect(tracked.allocationUpdates[0].reversed_at).toBeTruthy()
    // line un-cleared
    expect(tracked.bankUpdates.some((u) => u.cleared === false)).toBe(true)
    // audit
    expect(tracked.auditInserts[0]).toMatchObject({ action: 'bank.allocation_reversed' })
  })

  it('refuses to reverse an already-reversed allocation', async () => {
    const { client } = makeClient({
      bankLine: { id: 'txn8', amount: 650, direction: 'in' },
      invoices: [],
      allocationRow: { id: 'alloc2', bank_transaction_id: 'txn8', invoice_id: 'x', amount_allocated: 650, reversed_at: '2026-06-01T00:00:00Z' },
    })
    mockedCreate.mockReturnValue(client)
    const r = await reverseAllocation('alloc2', null)
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/already been reversed/i)
  })
})
