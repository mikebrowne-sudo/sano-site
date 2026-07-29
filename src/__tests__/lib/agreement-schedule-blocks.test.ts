import { scheduleLabel, buildScheduleBlocks, schedulePayLine, type ScheduleForBlock } from '@/lib/agreement-schedule-blocks'

describe('scheduleLabel', () => {
  it('labels A, B, C … Z then AA', () => {
    expect(scheduleLabel(0)).toBe('Schedule A')
    expect(scheduleLabel(1)).toBe('Schedule B')
    expect(scheduleLabel(25)).toBe('Schedule Z')
    expect(scheduleLabel(26)).toBe('Schedule AA')
  })
})

const base: ScheduleForBlock = { id: 's', name: 'X', status: 'active' }

describe('buildScheduleBlocks — selection gating (guardrails)', () => {
  it('with a selection, includes ONLY selected schedules — active ones NOT selected are excluded', () => {
    const blocks = buildScheduleBlocks([
      { ...base, id: 'a', name: 'Chosen', status: 'active' },
      { ...base, id: 'b', name: 'Active but unselected', status: 'active' },
    ], ['a'])
    expect(blocks.map((b) => b.name)).toEqual(['Chosen'])
  })

  it('follows the selection order (labels A/B track selection, not input order)', () => {
    const blocks = buildScheduleBlocks([
      { ...base, id: 'a', name: 'First-in-input' },
      { ...base, id: 'b', name: 'Second-in-input' },
    ], ['b', 'a'])
    expect(blocks.map((b) => [b.label, b.name])).toEqual([['Schedule A', 'Second-in-input'], ['Schedule B', 'First-in-input']])
  })

  it('a selected id that is paused / ended / superseded is NOT included', () => {
    for (const bad of ['paused', 'ended', 'superseded']) {
      const blocks = buildScheduleBlocks([{ ...base, id: 'x', name: 'Bad', status: bad }], ['x'])
      expect(blocks).toHaveLength(0)
    }
  })

  it('a selected id absent from the schedule set is silently dropped (cross-contractor / stale)', () => {
    const blocks = buildScheduleBlocks([{ ...base, id: 'a', name: 'Mine' }], ['a', 'not-mine'])
    expect(blocks.map((b) => b.name)).toEqual(['Mine'])
  })

  it('empty selection yields no blocks (nothing auto-included)', () => {
    expect(buildScheduleBlocks([{ ...base, id: 'a', status: 'active' }], [])).toHaveLength(0)
  })

  it('records id + version marker + effective date on each block', () => {
    const [b] = buildScheduleBlocks([
      { ...base, id: 'a', versionKey: '2026-07-01|2026-07-05T00:00:00Z', effectiveFrom: '2026-07-01' },
    ], ['a'])
    expect(b.id).toBe('a')
    expect(b.versionKey).toBe('2026-07-01|2026-07-05T00:00:00Z')
    expect(b.effectiveFrom).toBe('2026-07-01')
  })

  it('carries display terms only (no computed tax fields on the block)', () => {
    const [b] = buildScheduleBlocks([{ ...base, id: 'a', agreedAmount: 1500, paymentBasis: 'guaranteed_net' }], ['a'])
    expect(b).not.toHaveProperty('whtAmount')
    expect(b).not.toHaveProperty('grossExGst')
    expect(b.agreedAmount).toBe(1500)
  })
})

describe('schedulePayLine (Myrtle A/B examples)', () => {
  it('Schedule A: guaranteed net monthly, GST exclusive', () => {
    const [b] = buildScheduleBlocks([{
      ...base, id: 'a', name: 'Pukekohe Golf Club commercial cleaning', status: 'active',
      paymentMethod: 'fixed_monthly', paymentBasis: 'guaranteed_net', rateBasis: 'gst_exclusive', agreedAmount: 1500,
    }], ['a'])
    expect(schedulePayLine(b)).toBe('Guaranteed net payment of $1,500.00 per month (GST exclusive)')
  })

  it('Schedule B: hourly residential, GST exclusive', () => {
    const [b] = buildScheduleBlocks([{
      ...base, id: 'b', name: 'Residential cleaning', status: 'active',
      paymentMethod: 'hourly', paymentBasis: 'gross_fee', rateBasis: 'gst_exclusive', agreedAmount: 35,
    }], ['b'])
    expect(schedulePayLine(b)).toBe('$35.00 per hour (GST exclusive)')
  })

  it('gross_fee fixed monthly reads as a plain amount, not "guaranteed net"', () => {
    const [b] = buildScheduleBlocks([{
      ...base, id: 'c', name: 'Commercial', status: 'active',
      paymentMethod: 'fixed_monthly', paymentBasis: 'gross_fee', rateBasis: 'gst_inclusive', agreedAmount: 2000,
    }], ['c'])
    expect(schedulePayLine(b)).toBe('$2,000.00 per month (GST inclusive)')
  })

  it('falls back to a method label when the amount is not set', () => {
    const [b] = buildScheduleBlocks([{ ...base, id: 'd', name: 'TBC', status: 'active', paymentMethod: 'project' }], ['d'])
    expect(schedulePayLine(b)).toBe('Project amount')
  })
})
