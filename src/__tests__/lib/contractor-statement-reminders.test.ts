import { calendarDaysBetween, dueReminderNo } from '@/lib/contractor-statement-reminders'

describe('calendarDaysBetween', () => {
  it('counts whole NZ calendar days, including month/year boundaries', () => {
    expect(calendarDaysBetween('2026-07-20', '2026-07-22')).toBe(2)
    expect(calendarDaysBetween('2026-07-20', '2026-07-24')).toBe(4)
    expect(calendarDaysBetween('2026-12-31', '2027-01-02')).toBe(2)
    expect(calendarDaysBetween('2026-07-22', '2026-07-22')).toBe(0)
  })
})

describe('dueReminderNo — anchored to issued_at, max two', () => {
  const none = { r1_sent: false, r2_sent: false }
  it('nothing before day 2', () => {
    expect(dueReminderNo(0, none)).toBeNull()
    expect(dueReminderNo(1, none)).toBeNull()
  })
  it('reminder 1 from day 2', () => {
    expect(dueReminderNo(2, none)).toBe(1)
    expect(dueReminderNo(3, none)).toBe(1)
  })
  it('reminder 1 still takes priority at day 4 if not yet sent (no skipping)', () => {
    expect(dueReminderNo(4, none)).toBe(1)
  })
  it('reminder 2 from day 4 once reminder 1 is sent', () => {
    expect(dueReminderNo(4, { r1_sent: true, r2_sent: false })).toBe(2)
  })
  it('nothing once both are sent', () => {
    expect(dueReminderNo(10, { r1_sent: true, r2_sent: true })).toBeNull()
  })
  it('does not resend reminder 1 once sent, before day 4', () => {
    expect(dueReminderNo(3, { r1_sent: true, r2_sent: false })).toBeNull()
  })
})
