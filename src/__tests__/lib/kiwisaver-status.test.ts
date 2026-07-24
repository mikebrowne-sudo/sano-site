import {
  KIWISAVER_STATUSES,
  kiwiSaverStatusEnrolled,
  kiwiSaverStatusCanOptOut,
  isKiwiSaverStatus,
  newHireKiwiSaverStatus,
} from '@/lib/payroll/kiwisaver'

describe('KiwiSaver membership status model (Phase 4)', () => {
  it('defines the seven statuses', () => {
    expect(KIWISAVER_STATUSES.map((s) => s.value).sort()).toEqual(
      ['auto_enrolled', 'existing_member', 'not_eligible', 'opted_in', 'opted_out', 'review_required', 'savings_suspension'].sort(),
    )
  })

  it('payroll enrols only for member/auto-enrolled/opted-in', () => {
    for (const s of ['existing_member', 'auto_enrolled', 'opted_in']) expect(kiwiSaverStatusEnrolled(s)).toBe(true)
    for (const s of ['not_eligible', 'savings_suspension', 'opted_out', 'review_required']) expect(kiwiSaverStatusEnrolled(s)).toBe(false)
    expect(kiwiSaverStatusEnrolled(null)).toBe(false)
  })

  it('only an auto-enrolled employee can opt out (KS10)', () => {
    expect(kiwiSaverStatusCanOptOut('auto_enrolled')).toBe(true)
    for (const s of ['existing_member', 'opted_in', 'not_eligible', 'savings_suspension', 'opted_out', 'review_required']) {
      expect(kiwiSaverStatusCanOptOut(s)).toBe(false)
    }
  })

  it('maps a new hire situation to a status (never a pre-emptive opt-out)', () => {
    expect(newHireKiwiSaverStatus('existing_member')).toBe('existing_member')
    expect(newHireKiwiSaverStatus('joining')).toBe('auto_enrolled')
  })

  it('validates a known status', () => {
    expect(isKiwiSaverStatus('auto_enrolled')).toBe(true)
    expect(isKiwiSaverStatus('nonsense')).toBe(false)
    expect(isKiwiSaverStatus(null)).toBe(false)
  })
})
