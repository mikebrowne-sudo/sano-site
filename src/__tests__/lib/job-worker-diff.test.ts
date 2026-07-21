import { planWorkerDiff, localRemovalBlock, reconcilePrimaryContractor, type WorkerRow } from '@/lib/job-worker-diff'

const w = (contractor_id: string, extra?: Partial<WorkerRow>): WorkerRow => ({ contractor_id, ...extra })

describe('planWorkerDiff', () => {
  it('retain one, add another (existing [A] → desired [A,B])', () => {
    const d = planWorkerDiff([w('A')], ['A', 'B'])
    expect(d.toAdd).toEqual(['B'])
    expect(d.toKeep.map((x) => x.contractor_id)).toEqual(['A'])
    expect(d.toRemove).toEqual([])
  })

  it('retain one, remove another (existing [A,B] → desired [A])', () => {
    const d = planWorkerDiff([w('A'), w('B')], ['A'])
    expect(d.toAdd).toEqual([])
    expect(d.toKeep.map((x) => x.contractor_id)).toEqual(['A'])
    expect(d.toRemove.map((x) => x.contractor_id)).toEqual(['B'])
  })

  it('multi-contractor add + remove together (existing [A,B] → desired [A,C])', () => {
    const d = planWorkerDiff([w('A'), w('B')], ['A', 'C'])
    expect(d.toAdd).toEqual(['C'])
    expect(d.toKeep.map((x) => x.contractor_id)).toEqual(['A'])
    expect(d.toRemove.map((x) => x.contractor_id)).toEqual(['B'])
  })

  it('idempotent — identical desired set changes nothing', () => {
    const d = planWorkerDiff([w('A'), w('B')], ['B', 'A'])
    expect(d.toAdd).toEqual([])
    expect(d.toRemove).toEqual([])
    expect(d.toKeep.map((x) => x.contractor_id).sort()).toEqual(['A', 'B'])
  })

  it('ignores empties / dedupes desired', () => {
    const d = planWorkerDiff([w('A')], ['A', '', 'A', 'B'])
    expect(d.toAdd).toEqual(['B'])
  })
})

describe('localRemovalBlock', () => {
  it('blocks a worker in a pay run / paid', () => {
    expect(localRemovalBlock(w('A', { pay_status: 'included_in_pay_run' }))).toContain('pay run')
    expect(localRemovalBlock(w('A', { pay_status: 'paid' }))).toContain('paid')
  })
  it('blocks a worker with approved non-zero extra hours', () => {
    expect(localRemovalBlock(w('A', { extra_hours_status: 'approved', extra_hours: 1.5 }))).toContain('extra hours')
  })
  it('allows removal of an unpaid worker with no approved extra hours', () => {
    expect(localRemovalBlock(w('A', { pay_status: 'pending' }))).toBeNull()
    expect(localRemovalBlock(w('A', { extra_hours_status: 'pending', extra_hours: 2 }))).toBeNull()
    expect(localRemovalBlock(w('A', { extra_hours_status: 'approved', extra_hours: 0 }))).toBeNull()
  })
})

describe('reconcilePrimaryContractor', () => {
  it('keeps the requested primary when it is in the worker set', () => {
    expect(reconcilePrimaryContractor('B', ['A', 'B'])).toBe('B')
  })
  it('falls back to the first worker when the requested primary is absent', () => {
    expect(reconcilePrimaryContractor('Z', ['A', 'B'])).toBe('A')
    expect(reconcilePrimaryContractor(null, ['A', 'B'])).toBe('A')
  })
  it('returns null when there are no workers', () => {
    expect(reconcilePrimaryContractor('A', [])).toBeNull()
    expect(reconcilePrimaryContractor(null, [])).toBeNull()
  })
})
