/** @jest-environment node */

import {
  isCampaignDueNow,
  sendTimeMinutes,
  estimateCompletion,
  nzWeekday,
  isCampaignSendDay,
} from '@/lib/campaigns/send-batch'

// Helper: a UTC instant that maps to a given NZ local time. NZST is UTC+12
// (Aug = winter, no DST), so NZ 08:30 on 2026-08-03 = 2026-08-02T20:30Z.
const nzInstant = (utcIso: string) => new Date(utcIso)

describe('sendTimeMinutes', () => {
  it('parses HH:MM', () => {
    expect(sendTimeMinutes('08:30')).toBe(510)
    expect(sendTimeMinutes('00:00')).toBe(0)
    expect(sendTimeMinutes('23:59')).toBe(1439)
  })
  it('defaults to 08:30 on bad input', () => {
    expect(sendTimeMinutes('')).toBe(510)
    expect(sendTimeMinutes(null)).toBe(510)
    expect(sendTimeMinutes('nonsense')).toBe(510)
  })
})

describe('sending days default Mon–Thu', () => {
  it('Mon–Thu are send days, Fri–Sun are not (default)', () => {
    // 2026-08-03 Mon .. 2026-08-09 Sun (NZ), use 00:30Z ~ midday NZ prior day is fine
    expect(isCampaignSendDay(nzInstant('2026-08-03T00:30:00Z'))).toBe(true)  // Mon
    expect(isCampaignSendDay(nzInstant('2026-08-06T00:30:00Z'))).toBe(true)  // Thu
    expect(isCampaignSendDay(nzInstant('2026-08-07T00:30:00Z'))).toBe(false) // Fri
    expect(isCampaignSendDay(nzInstant('2026-08-09T00:30:00Z'))).toBe(false) // Sun
  })
  it('respects a custom sending-days set', () => {
    // include Friday (5)
    expect(isCampaignSendDay(nzInstant('2026-08-07T00:30:00Z'), [1, 2, 3, 4, 5])).toBe(true)
  })
})

describe('isCampaignDueNow', () => {
  const base = { status: 'scheduled', sendTimeNz: '08:30', sendingDays: [1, 2, 3, 4], startDate: null, pausedAt: null }

  it('due on a sending day after send time', () => {
    // NZ 2026-08-03 (Mon) 09:00 = 2026-08-02T21:00Z
    expect(isCampaignDueNow(base, nzInstant('2026-08-02T21:00:00Z'))).toBe(true)
  })
  it('NOT due before the send time on a sending day', () => {
    // NZ Mon 08:00 = 2026-08-02T20:00Z (before 08:30)
    expect(isCampaignDueNow(base, nzInstant('2026-08-02T20:00:00Z'))).toBe(false)
  })
  it('NOT due on a non-sending day (Fri)', () => {
    // NZ 2026-08-07 (Fri) 09:00 = 2026-08-06T21:00Z
    expect(isCampaignDueNow(base, nzInstant('2026-08-06T21:00:00Z'))).toBe(false)
  })
  it('NOT due before the start date', () => {
    const s = { ...base, startDate: '2026-08-10' }
    // NZ Mon 2026-08-03 09:00 — before start
    expect(isCampaignDueNow(s, nzInstant('2026-08-02T21:00:00Z'))).toBe(false)
  })
  it('due once the start date is reached (that day, after send time)', () => {
    const s = { ...base, startDate: '2026-08-03' }
    expect(isCampaignDueNow(s, nzInstant('2026-08-02T21:00:00Z'))).toBe(true)
  })
  it('paused is never due', () => {
    expect(isCampaignDueNow({ ...base, pausedAt: '2026-08-03T00:00:00Z' }, nzInstant('2026-08-02T21:00:00Z'))).toBe(false)
  })
  it('only armed statuses are due', () => {
    expect(isCampaignDueNow({ ...base, status: 'draft' }, nzInstant('2026-08-02T21:00:00Z'))).toBe(false)
    expect(isCampaignDueNow({ ...base, status: 'paused' }, nzInstant('2026-08-02T21:00:00Z'))).toBe(false)
    expect(isCampaignDueNow({ ...base, status: 'sending' }, nzInstant('2026-08-02T21:00:00Z'))).toBe(true)
  })
  it('start date today but window passed → not due until send time (handled by minute check)', () => {
    const s = { ...base, startDate: '2026-08-03' }
    // NZ Mon 08:00 (before 08:30) → not due yet even though start date is today
    expect(isCampaignDueNow(s, nzInstant('2026-08-02T20:00:00Z'))).toBe(false)
    // …becomes due at 08:30+
    expect(isCampaignDueNow(s, nzInstant('2026-08-02T20:35:00Z'))).toBe(true)
  })
})

describe('estimateCompletion', () => {
  it('40 recipients @ 15/day, Mon–Thu → 3 batches', () => {
    // start Mon 2026-08-03
    const r = estimateCompletion({ recipients: 40, dailyCap: 15, sendingDays: [1, 2, 3, 4], startDate: '2026-08-03', now: nzInstant('2026-08-02T21:00:00Z') })
    expect(r.sendingDaysNeeded).toBe(3) // ceil(40/15) = 3
    // Mon, Tue, Wed → completes Wed 2026-08-05
    expect(r.completionYmd).toBe('2026-08-05')
  })
  it('crosses a weekend: 5 batches from Wed skips Fri–Sun', () => {
    // Wed 2026-08-05 start, 5 batches, Mon–Thu: Wed, Thu, (skip Fri/Sat/Sun), Mon, Tue, Wed → 5th = Wed 2026-08-12
    const r = estimateCompletion({ recipients: 75, dailyCap: 15, sendingDays: [1, 2, 3, 4], startDate: '2026-08-05', now: nzInstant('2026-08-04T21:00:00Z') })
    expect(r.sendingDaysNeeded).toBe(5)
    expect(r.completionYmd).toBe('2026-08-12')
  })
  it('zero recipients or zero cap → nothing', () => {
    expect(estimateCompletion({ recipients: 0, dailyCap: 15, sendingDays: [1, 2, 3, 4], startDate: null, now: nzInstant('2026-08-02T21:00:00Z') })).toEqual({ sendingDaysNeeded: 0, completionYmd: null })
    expect(estimateCompletion({ recipients: 10, dailyCap: 0, sendingDays: [1, 2, 3, 4], startDate: null, now: nzInstant('2026-08-02T21:00:00Z') })).toEqual({ sendingDaysNeeded: 0, completionYmd: null })
  })
})

describe('nzWeekday sanity', () => {
  it('Mon=1 .. Sun=7', () => {
    expect(nzWeekday(nzInstant('2026-08-03T00:30:00Z'))).toBe(1)
    expect(nzWeekday(nzInstant('2026-08-09T00:30:00Z'))).toBe(7)
  })
})
