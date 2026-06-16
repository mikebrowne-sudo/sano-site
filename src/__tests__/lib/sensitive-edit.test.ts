import {
  entityTable,
  milestoneLabels,
  requiresReason,
  highestMilestone,
  summariseChanges,
} from '@/lib/sensitive-edit'

describe('entityTable', () => {
  it('maps each entity to its table', () => {
    expect(entityTable('quote')).toBe('quotes')
    expect(entityTable('job')).toBe('jobs')
    expect(entityTable('invoice')).toBe('invoices')
    expect(entityTable('contractor_invoice')).toBe('contractor_invoices')
  })
})

describe('requiresReason / milestoneLabels / highestMilestone', () => {
  it('no reason when no milestone reached', () => {
    expect(requiresReason({})).toBe(false)
    expect(milestoneLabels({})).toEqual([])
    expect(highestMilestone({})).toBeNull()
  })
  it('reason required once any milestone is reached', () => {
    expect(requiresReason({ sent: true })).toBe(true)
    expect(requiresReason({ paid: true })).toBe(true)
    expect(requiresReason({ remitted: true })).toBe(true)
  })
  it('labels + highest milestone in order', () => {
    expect(milestoneLabels({ sent: true, paid: true })).toEqual(['sent', 'paid'])
    expect(highestMilestone({ sent: true, paid: true })).toBe('paid')
    expect(highestMilestone({ sent: true, invoiced: true })).toBe('invoiced')
  })
})

describe('summariseChanges', () => {
  it('returns only changed fields, null-normalised', () => {
    const before = { notes: 'a', amount: 100, ref: null }
    const after = { notes: 'b', amount: 100, ref: 'PO-1' }
    expect(summariseChanges(before, after, ['notes', 'amount', 'ref'])).toEqual([
      { field: 'notes', before: 'a', after: 'b' },
      { field: 'ref', before: null, after: 'PO-1' },
    ])
  })
  it('treats undefined and null as equal', () => {
    expect(summariseChanges({ x: undefined }, { x: null }, ['x'])).toEqual([])
  })
})
