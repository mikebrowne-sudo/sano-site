import {
  validateGstHistory, selectGstStatusForDate, gstWindowForDate,
  type GstHistoryRecord, type GstStatus,
} from '@/lib/contractor-gst-history'

const row = (p: Partial<GstHistoryRecord> & { id: string }): GstHistoryRecord => ({
  status: 'verified' as GstStatus, gstRegistered: true, gstNumber: '123-456-789', effectiveDate: '2026-01-01', endDate: null, ...p,
})

describe('validateGstHistory — never infers from turnover', () => {
  it('registered requires a GST number and an effective date', () => {
    expect(validateGstHistory({ gstRegistered: true, gstNumber: '123', effectiveDate: '2026-01-01' })).toBeNull()
    expect(validateGstHistory({ gstRegistered: true, effectiveDate: '2026-01-01' })).toMatch(/GST number is required/)
    expect(validateGstHistory({ gstRegistered: true, gstNumber: '123' })).toMatch(/effective date is required/)
  })
  it('end date cannot precede effective date', () => {
    expect(validateGstHistory({ gstRegistered: true, gstNumber: '1', effectiveDate: '2026-06-01', endDate: '2026-01-01' })).toMatch(/end date cannot be before/)
  })
  it('not registered needs nothing (no turnover reasoning)', () => {
    expect(validateGstHistory({ gstRegistered: false })).toBeNull()
  })
})

describe('selectGstStatusForDate — date-based, not newest', () => {
  const registeredFromAug = row({ id: 'reg', gstRegistered: true, gstNumber: '999', effectiveDate: '2026-08-01', endDate: null })
  const notRegisteredEarly = row({ id: 'not', gstRegistered: false, gstNumber: null, effectiveDate: '2026-01-01', endDate: null })

  it('a future registration does NOT apply before its effective date', () => {
    // On 2026-07-31 the not-registered status still applies.
    expect(selectGstStatusForDate([notRegisteredEarly, registeredFromAug], '2026-07-31')?.id).toBe('not')
  })
  it('the registration applies from its effective date', () => {
    expect(selectGstStatusForDate([notRegisteredEarly, registeredFromAug], '2026-08-01')?.id).toBe('reg')
    expect(selectGstStatusForDate([notRegisteredEarly, registeredFromAug], '2026-12-31')?.id).toBe('reg')
  })
  it('a historical date resolves the status in force then', () => {
    expect(selectGstStatusForDate([notRegisteredEarly, registeredFromAug], '2026-03-01')?.id).toBe('not')
  })
  it('respects an end date (deregistration)', () => {
    const closed = row({ id: 'closed', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-01-01', endDate: '2026-06-30' })
    expect(selectGstStatusForDate([closed], '2026-05-01')?.id).toBe('closed')
    expect(selectGstStatusForDate([closed], '2026-07-01')).toBeNull()
  })
  it('ignores submitted / rejected / superseded rows', () => {
    expect(selectGstStatusForDate([row({ id: 'p', status: 'submitted' })], '2026-06-01')).toBeNull()
    expect(selectGstStatusForDate([row({ id: 's', status: 'superseded' })], '2026-06-01')).toBeNull()
  })
})

describe('gstWindowForDate — tri-state (registered / not_registered / unresolved)', () => {
  it('NO applicable verified history → UNRESOLVED (never silently not registered)', () => {
    expect(gstWindowForDate([], '2026-06-01').resolution).toBe('unresolved')
  })
  it('a supply BEFORE the first verified row → UNRESOLVED (not silently not registered)', () => {
    const h = [row({ id: 'r', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-04-01' })]
    expect(gstWindowForDate(h, '2026-01-01').resolution).toBe('unresolved')
  })
  it('resolves the registered window for the date', () => {
    const h = [row({ id: 'r', gstRegistered: true, gstNumber: '135-712-264', effectiveDate: '2026-04-01' })]
    expect(gstWindowForDate(h, '2026-06-01')).toEqual({ resolution: 'registered', gstHistoryId: 'r', gstRegistered: true, gstNumber: '135-712-264', effectiveDate: '2026-04-01', endDate: null })
  })
  it('a verified NOT-registered row resolves to not_registered from its effective date', () => {
    const h = [row({ id: 'n', gstRegistered: false, gstNumber: null, effectiveDate: '2026-04-01' })]
    expect(gstWindowForDate(h, '2026-06-01').resolution).toBe('not_registered')
    // …but does NOT apply before its effective date → unresolved.
    expect(gstWindowForDate(h, '2026-03-01').resolution).toBe('unresolved')
  })
  it('a supply before the registration effective date → unresolved (no GST before verified effective date)', () => {
    const h = [row({ id: 'r', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-08-01' })]
    expect(gstWindowForDate(h, '2026-07-31').resolution).toBe('unresolved')
  })
  it('a supply AFTER a verified cessation (end date) resolves not registered via a later not-registered row', () => {
    // Registered Jan–Jun, then an effective-dated not-registered row from Jul.
    const h = [
      row({ id: 'reg', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-01-01', endDate: '2026-06-30' }),
      row({ id: 'dereg', gstRegistered: false, gstNumber: null, effectiveDate: '2026-07-01' }),
    ]
    expect(gstWindowForDate(h, '2026-05-01').resolution).toBe('registered')
    expect(gstWindowForDate(h, '2026-07-15').resolution).toBe('not_registered')
  })
  it('a registered window with an end_date and no successor → unresolved after the end date', () => {
    const ceased = [row({ id: 'c', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-01-01', endDate: '2026-06-30' })]
    expect(gstWindowForDate(ceased, '2026-05-01').resolution).toBe('registered')
    expect(gstWindowForDate(ceased, '2026-07-01').resolution).toBe('unresolved') // no GST, but flagged — not confirmed not-registered
  })
  it('registration-pending (a submitted row) does not apply until verified → unresolved', () => {
    const pending = [row({ id: 'p', status: 'submitted', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-01-01' })]
    expect(gstWindowForDate(pending, '2026-06-01').resolution).toBe('unresolved')
  })
  it('a verified row with NO effective date is ignored (defensive; the DB CHECK forbids it)', () => {
    const bad = [row({ id: 'x', gstRegistered: false, gstNumber: null, effectiveDate: null })]
    expect(gstWindowForDate(bad, '2026-06-01').resolution).toBe('unresolved')
  })
})

describe('overlapping verified windows resolve deterministically (latest effective wins)', () => {
  it('when two verified rows both cover the date, the later-effective one wins', () => {
    const h = [
      row({ id: 'a', gstRegistered: true, gstNumber: 'OLD', effectiveDate: '2026-01-01', endDate: '2026-12-31' }),
      row({ id: 'b', gstRegistered: false, gstNumber: null, effectiveDate: '2026-06-01' }), // later status change
    ]
    // On 2026-08-01 both technically "apply"; the latest effective (b) wins.
    const r = gstWindowForDate(h, '2026-08-01')
    expect(r.resolution).toBe('not_registered')
    // Before the overlap the earlier registered row applies.
    expect(gstWindowForDate(h, '2026-03-01').resolution).toBe('registered')
  })
  it('same effective date → deterministic (stable tie-break, never throws)', () => {
    const h = [
      row({ id: 'aaa', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-05-01' }),
      row({ id: 'bbb', gstRegistered: false, gstNumber: null, effectiveDate: '2026-05-01' }),
    ]
    // Deterministic: same call always returns the same row.
    expect(gstWindowForDate(h, '2026-06-01')).toEqual(gstWindowForDate(h, '2026-06-01'))
  })
})

// The derived cache writes exactly what selectGstStatusForDate returns for TODAY,
// so these assert the cache-transition behaviour the review requires.
describe('cache = status applicable today (date-resolved, not newest verified)', () => {
  // Existing status: not registered from Jan. Verified-today replacement: registered from next month.
  const notRegNow = row({ id: 'now', gstRegistered: false, gstNumber: null, effectiveDate: '2026-01-01', endDate: null })
  const futureReg = row({ id: 'future', gstRegistered: true, gstNumber: '135-712-264', effectiveDate: '2026-09-01', endDate: null })
  const history = [notRegNow, futureReg]

  it('a future-effective verified registration does NOT become the cache early', () => {
    // Today (before 1 Sep) the cache should reflect the PRIOR status (not registered).
    expect(gstWindowForDate(history, '2026-08-15').gstRegistered).toBe(false)
  })
  it('the prior status stays until the effective date, then the cache changes', () => {
    expect(gstWindowForDate(history, '2026-08-31').gstRegistered).toBe(false) // day before
    expect(gstWindowForDate(history, '2026-09-01')).toMatchObject({ gstRegistered: true, gstNumber: '135-712-264' }) // effective day
    expect(gstWindowForDate(history, '2026-10-15').gstRegistered).toBe(true)
  })
  it('after a verified end date the cache shows NOT registered', () => {
    const ceased = [row({ id: 'c', gstRegistered: true, gstNumber: '1', effectiveDate: '2026-01-01', endDate: '2026-06-30' })]
    expect(gstWindowForDate(ceased, '2026-06-30').gstRegistered).toBe(true)  // last day registered
    expect(gstWindowForDate(ceased, '2026-07-01').gstRegistered).toBe(false) // after cessation
  })
  it('history-based supply-date resolution is unchanged by any cache concern', () => {
    // A historical supply still resolves the row in force then, independent of "today".
    expect(gstWindowForDate(history, '2026-03-01').gstRegistered).toBe(false)
    expect(gstWindowForDate(history, '2026-12-01').gstRegistered).toBe(true)
  })
})
