/**
 * Mileage that no pay run has picked up.
 *
 * Mileage is captured when a run is CREATED, not when it's approved. Approve a
 * log after its run exists and the run's frozen figures show $0.00 — the log
 * sits unattached and the employee is underpaid with nothing on screen saying
 * so. That happened twice to the same employee before this warning existed.
 */

import {
  loadUnattachedMileage,
  hasUnattachedMileage,
  describeUnattachedMileage,
} from '@/lib/payroll/unattached-mileage'

type Row = {
  id: string
  contractor_id: string
  log_date: string
  distance_km: number | null
  reimbursement_amount: number
  status: string
  contractors: { full_name: string | null; preferred_name: string | null } | null
}

// The builder is awaited at the END of the chain, and .order() may be followed
// by further .in()/.lte() calls — so every method returns the same thenable.
function supabaseWith(rows: Row[], error: unknown = null) {
  const calls: Record<string, unknown> = {}
  const q: Record<string, unknown> = {}
  const chain = (k: string) => (...args: unknown[]) => { calls[k] = args; return q }
  Object.assign(q, {
    select: chain('select'),
    is: chain('is'),
    in: chain('in'),
    lte: chain('lte'),
    order: chain('order'),
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: error ? null : rows, error }).then(res),
  })
  return {
    client: { from: () => q } as never,
    calls,
  }
}

const row = (over: Partial<Row> = {}): Row => ({
  id: 'm1', contractor_id: 'c1', log_date: '2026-09-01',
  distance_km: 40, reimbursement_amount: 48, status: 'approved',
  contractors: { full_name: 'Carol Browne', preferred_name: null },
  ...over,
})

describe('loadUnattachedMileage', () => {
  it('totals approved and draft separately', async () => {
    const { client } = supabaseWith([
      row({ id: 'a', reimbursement_amount: 47.64, status: 'approved' }),
      row({ id: 'b', reimbursement_amount: 89.28, status: 'draft' }),
      row({ id: 'c', reimbursement_amount: 42.48, status: 'draft' }),
    ])
    const s = await loadUnattachedMileage(client)

    expect(s.approvedTotal).toBe(47.64)
    expect(s.draftTotal).toBe(131.76)
    expect(s.approvedCount).toBe(1)
    expect(s.draftCount).toBe(2)
    expect(s.entries).toHaveLength(3)
  })

  // The filter that matters: a log already consumed by a run is not owed.
  it('only asks for logs with no pay_run_id', async () => {
    const { client, calls } = supabaseWith([])
    await loadUnattachedMileage(client)
    expect(calls.is).toEqual(['pay_run_id', null])
  })

  it('includes draft as well as approved — draft is the dangerous state', async () => {
    const { client, calls } = supabaseWith([])
    await loadUnattachedMileage(client)
    expect(calls.in).toEqual(['status', ['approved', 'draft']])
  })

  it('narrows to the run’s contractors when asked', async () => {
    const { client, calls } = supabaseWith([])
    await loadUnattachedMileage(client, { contractorIds: ['c1', 'c2'] })
    expect(calls.in).toEqual(['contractor_id', ['c1', 'c2']])
  })

  it('caps by date so unrelated future mileage is not flagged', async () => {
    const { client, calls } = supabaseWith([])
    await loadUnattachedMileage(client, { upToDate: '2026-09-06' })
    expect(calls.lte).toEqual(['log_date', '2026-09-06'])
  })

  it('rolls approved totals up per contractor', async () => {
    const { client } = supabaseWith([
      row({ id: 'a', contractor_id: 'c1', reimbursement_amount: 47.64 }),
      row({ id: 'b', contractor_id: 'c1', reimbursement_amount: 47.28 }),
      row({ id: 'c', contractor_id: 'c2', reimbursement_amount: 26.16 }),
    ])
    const s = await loadUnattachedMileage(client)
    expect(s.approvedByContractor).toEqual({ c1: 94.92, c2: 26.16 })
  })

  it('prefers the preferred name', async () => {
    const { client } = supabaseWith([
      row({ contractors: { full_name: 'Carol Browne', preferred_name: 'Caz' } }),
    ])
    const s = await loadUnattachedMileage(client)
    expect(s.entries[0].contractorName).toBe('Caz')
  })

  it('returns an empty summary on a query error rather than throwing', async () => {
    const { client } = supabaseWith([], { message: 'boom' })
    const s = await loadUnattachedMileage(client)
    expect(s.approvedTotal).toBe(0)
    expect(s.entries).toEqual([])
  })

  it('rounds money to the cent', async () => {
    const { client } = supabaseWith([
      row({ id: 'a', reimbursement_amount: 0.1 }),
      row({ id: 'b', reimbursement_amount: 0.2 }),
    ])
    const s = await loadUnattachedMileage(client)
    expect(s.approvedTotal).toBe(0.3)
  })
})

describe('hasUnattachedMileage / describeUnattachedMileage', () => {
  const empty = {
    entries: [], approvedTotal: 0, draftTotal: 0,
    approvedCount: 0, draftCount: 0, approvedByContractor: {},
  }

  it('says nothing when everything is attached', () => {
    expect(hasUnattachedMileage(empty)).toBe(false)
    expect(describeUnattachedMileage(empty)).toBeNull()
  })

  it('states the consequence, not just a total', () => {
    const msg = describeUnattachedMileage({
      ...empty, approvedTotal: 121.08, approvedCount: 3,
    })
    expect(msg).toContain('$121.08')
    expect(msg).toContain('3 trips')
    expect(msg).toContain("won't be included")
  })

  it('calls out unapproved mileage separately', () => {
    const msg = describeUnattachedMileage({
      ...empty, approvedTotal: 121.08, approvedCount: 3,
      draftTotal: 490.2, draftCount: 8,
    })
    expect(msg).toContain('$121.08 approved')
    expect(msg).toContain('$490.20 still unapproved')
  })

  it('uses the singular for one trip', () => {
    const msg = describeUnattachedMileage({ ...empty, approvedTotal: 47.64, approvedCount: 1 })
    expect(msg).toContain('1 trip')
    expect(msg).not.toContain('1 trips')
  })
})
