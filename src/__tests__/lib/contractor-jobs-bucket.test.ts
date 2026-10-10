import { bucketFor } from '@/app/contractor/_views/ContractorJobsView'

const TODAY = '2026-10-11'

describe('contractor To do buckets', () => {
  it('today, overdue, next two weeks, later', () => {
    expect(bucketFor('2026-10-11', 'assigned', TODAY)).toBe('today')
    expect(bucketFor('2026-10-03', 'assigned', TODAY)).toBe('outstanding')
    expect(bucketFor('2026-10-25', 'assigned', TODAY)).toBe('upcoming')
    expect(bucketFor('2026-10-26', 'assigned', TODAY)).toBe('later')
  })

  it('a finished job waiting on the hours answer shows for 14 days', () => {
    expect(bucketFor('2026-10-09', 'completed', TODAY, true)).toBe('confirm')
    expect(bucketFor('2026-09-27', 'invoiced', TODAY, true)).toBe('confirm')
    expect(bucketFor('2026-09-26', 'completed', TODAY, true)).toBe('hidden')
  })

  it('a finished job already answered stays in history only', () => {
    expect(bucketFor('2026-10-09', 'completed', TODAY, false)).toBe('hidden')
  })

  it('drafts and undated jobs stay hidden', () => {
    expect(bucketFor('2026-10-11', 'draft', TODAY)).toBe('hidden')
    expect(bucketFor(null, 'assigned', TODAY)).toBe('hidden')
  })
})
