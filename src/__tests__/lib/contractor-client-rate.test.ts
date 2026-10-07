import {
  pickClientRate,
  resolveWorkerRate,
  rateSourceLabel,
  type ClientRateRecord,
} from '@/lib/contractor-client-rate'

// Upasni's real arrangement, the case this module exists for.
const OT_RATE = 32.2
const NZCL_RATE = 30
const PROFILE_RATE = 35

describe('pickClientRate', () => {
  const openEnded: ClientRateRecord[] = [
    { hourlyRate: OT_RATE, effectiveFrom: '2026-08-01', effectiveTo: null },
  ]

  it('applies an open-ended rate on a later date', () => {
    expect(pickClientRate(openEnded, '2026-09-15')).toBe(OT_RATE)
  })

  it('applies on the effective_from boundary (inclusive)', () => {
    expect(pickClientRate(openEnded, '2026-08-01')).toBe(OT_RATE)
  })

  it('does not apply before effective_from', () => {
    expect(pickClientRate(openEnded, '2026-07-31')).toBeNull()
  })

  it('does not apply after effective_to', () => {
    const closed: ClientRateRecord[] = [
      { hourlyRate: OT_RATE, effectiveFrom: '2026-08-01', effectiveTo: '2026-08-31' },
    ]
    expect(pickClientRate(closed, '2026-09-01')).toBeNull()
  })

  it('applies on the effective_to boundary (inclusive)', () => {
    const closed: ClientRateRecord[] = [
      { hourlyRate: OT_RATE, effectiveFrom: '2026-08-01', effectiveTo: '2026-08-31' },
    ]
    expect(pickClientRate(closed, '2026-08-31')).toBe(OT_RATE)
  })

  it('picks the latest effective_from when history overlaps', () => {
    const history: ClientRateRecord[] = [
      { hourlyRate: 30, effectiveFrom: '2026-08-01', effectiveTo: null },
      { hourlyRate: 32.2, effectiveFrom: '2026-09-01', effectiveTo: null },
    ]
    expect(pickClientRate(history, '2026-09-15')).toBe(32.2)
    // ...and the older rate still governs an earlier job.
    expect(pickClientRate(history, '2026-08-15')).toBe(30)
  })

  it('ignores superseded rows', () => {
    const rates: ClientRateRecord[] = [
      { hourlyRate: 99, effectiveFrom: '2026-09-01', status: 'superseded' },
      { hourlyRate: OT_RATE, effectiveFrom: '2026-08-01', status: 'active' },
    ]
    expect(pickClientRate(rates, '2026-09-15')).toBe(OT_RATE)
  })

  it('ignores non-positive and unparseable rates', () => {
    const bad: ClientRateRecord[] = [
      { hourlyRate: 0, effectiveFrom: '2026-08-01' },
      { hourlyRate: -5, effectiveFrom: '2026-08-01' },
      { hourlyRate: 'abc', effectiveFrom: '2026-08-01' },
      { hourlyRate: null, effectiveFrom: '2026-08-01' },
    ]
    expect(pickClientRate(bad, '2026-09-15')).toBeNull()
  })

  it('accepts numeric strings (Postgres numeric comes back as a string)', () => {
    const rates: ClientRateRecord[] = [{ hourlyRate: '32.20', effectiveFrom: '2026-08-01' }]
    expect(pickClientRate(rates, '2026-09-15')).toBe(OT_RATE)
  })

  it('returns null for an empty history or a missing service date', () => {
    expect(pickClientRate([], '2026-09-15')).toBeNull()
    expect(pickClientRate(openEnded, '')).toBeNull()
  })
})

describe('resolveWorkerRate', () => {
  it('preserves an existing snapshot over both client and profile rates', () => {
    // The guarantee that a rate change never silently repays an assigned job.
    expect(resolveWorkerRate(PROFILE_RATE, OT_RATE, PROFILE_RATE)).toEqual({
      rate: PROFILE_RATE,
      source: 'existing',
    })
  })

  it('prefers the client rate over the profile rate', () => {
    expect(resolveWorkerRate(null, OT_RATE, PROFILE_RATE)).toEqual({
      rate: OT_RATE,
      source: 'client',
    })
  })

  it('falls back to the profile rate when no client rate applies', () => {
    expect(resolveWorkerRate(null, null, PROFILE_RATE)).toEqual({
      rate: PROFILE_RATE,
      source: 'contractor',
    })
  })

  it('returns none when nothing is usable', () => {
    expect(resolveWorkerRate(null, null, null)).toEqual({ rate: null, source: 'none' })
  })

  it('treats a zero or negative existing snapshot as absent', () => {
    expect(resolveWorkerRate(0, OT_RATE, PROFILE_RATE).source).toBe('client')
    expect(resolveWorkerRate(-1, null, PROFILE_RATE).source).toBe('contractor')
  })

  it('resolves the real Upasni cases', () => {
    expect(resolveWorkerRate(null, OT_RATE, PROFILE_RATE).rate).toBe(32.2)
    expect(resolveWorkerRate(null, NZCL_RATE, PROFILE_RATE).rate).toBe(30)
    // A residential client with no agreed rate keeps the profile default.
    expect(resolveWorkerRate(null, null, PROFILE_RATE).rate).toBe(35)
  })
})

describe('rateSourceLabel', () => {
  it('names the client when there is one', () => {
    expect(rateSourceLabel('client', 'Oranga Tamariki')).toBe('Oranga Tamariki rate')
  })

  it('labels the fallback and the explicit cases', () => {
    expect(rateSourceLabel('client', null)).toBe('client rate')
    expect(rateSourceLabel('contractor')).toBe('profile default')
    expect(rateSourceLabel('existing')).toBe('set on this job')
    expect(rateSourceLabel('none')).toBe('no rate set')
  })
})
