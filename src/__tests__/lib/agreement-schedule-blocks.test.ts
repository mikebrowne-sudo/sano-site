import { scheduleLabel, buildScheduleBlocks, schedulePayLine, type ScheduleForBlock } from '@/lib/agreement-schedule-blocks'

describe('scheduleLabel', () => {
  it('labels A, B, C … Z then AA', () => {
    expect(scheduleLabel(0)).toBe('Schedule A')
    expect(scheduleLabel(1)).toBe('Schedule B')
    expect(scheduleLabel(25)).toBe('Schedule Z')
    expect(scheduleLabel(26)).toBe('Schedule AA')
  })
})

describe('buildScheduleBlocks', () => {
  const base: ScheduleForBlock = { id: 's', name: 'X', status: 'active' }

  it('labels blocks in order', () => {
    const blocks = buildScheduleBlocks([
      { ...base, id: 'a', name: 'Pukekohe' },
      { ...base, id: 'b', name: 'Residential' },
    ])
    expect(blocks.map((b) => [b.label, b.name])).toEqual([['Schedule A', 'Pukekohe'], ['Schedule B', 'Residential']])
  })

  it('excludes superseded and ended schedules (a stale version never shows)', () => {
    const blocks = buildScheduleBlocks([
      { ...base, id: 'a', name: 'Current', status: 'active' },
      { ...base, id: 'old', name: 'Old', status: 'superseded' },
      { ...base, id: 'done', name: 'Done', status: 'ended' },
    ])
    expect(blocks.map((b) => b.name)).toEqual(['Current'])
    expect(blocks[0].label).toBe('Schedule A')
  })

  it('carries display terms only (no computed tax fields exist on the block)', () => {
    const [b] = buildScheduleBlocks([{ ...base, agreedAmount: 1500, paymentBasis: 'guaranteed_net' }])
    expect(b).not.toHaveProperty('whtAmount')
    expect(b).not.toHaveProperty('grossExGst')
    expect(b.agreedAmount).toBe(1500)
  })
})

describe('schedulePayLine (Myrtle A/B examples)', () => {
  it('Schedule A: guaranteed net monthly, GST exclusive', () => {
    const [b] = buildScheduleBlocks([{
      id: 'a', name: 'Pukekohe Golf Club commercial cleaning', status: 'active',
      paymentMethod: 'fixed_monthly', paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive', agreedAmount: 1500,
    }])
    expect(schedulePayLine(b)).toBe('Guaranteed net payment of $1,500.00 per month (GST exclusive)')
  })

  it('Schedule B: hourly residential, GST exclusive', () => {
    const [b] = buildScheduleBlocks([{
      id: 'b', name: 'Residential cleaning', status: 'active',
      paymentMethod: 'hourly', paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive', agreedAmount: 35,
    }])
    expect(schedulePayLine(b)).toBe('$35.00 per hour (GST exclusive)')
  })

  it('gross_fee fixed monthly reads as a plain amount, not "guaranteed net"', () => {
    const [b] = buildScheduleBlocks([{
      id: 'c', name: 'Commercial', status: 'active',
      paymentMethod: 'fixed_monthly', paymentBasis: 'gross_fee', rateBasis: 'gst_inclusive', agreedAmount: 2000,
    }])
    expect(schedulePayLine(b)).toBe('$2,000.00 per month (GST inclusive)')
  })

  it('falls back to a method label when the amount is not set', () => {
    const [b] = buildScheduleBlocks([{ id: 'd', name: 'TBC', status: 'active', paymentMethod: 'project' }])
    expect(schedulePayLine(b)).toBe('Project amount')
  })
})
