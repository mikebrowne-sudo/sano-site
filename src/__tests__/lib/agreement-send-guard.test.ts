import { evaluateSendGuard } from '@/lib/agreement-send-guard'

describe('evaluateSendGuard — the required cases', () => {
  it('eligible schedules exist + none selected → send BLOCKED', () => {
    const r = evaluateSendGuard({ eligibleCount: 2, selectedCount: 0, noScheduleException: false })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/Select at least one service schedule/)
    expect(r.noSchedules).toBe(false)
  })

  it('eligible schedules exist + one selected → send ALLOWED (schedules attached)', () => {
    const r = evaluateSendGuard({ eligibleCount: 2, selectedCount: 1, noScheduleException: false })
    expect(r.ok).toBe(true)
    expect(r.noSchedules).toBe(false)
  })

  it('no eligible schedules on a genuine legacy agreement → legacy fallback ALLOWED', () => {
    const r = evaluateSendGuard({ eligibleCount: 0, selectedCount: 0, noScheduleException: false })
    expect(r.ok).toBe(true)
    expect(r.noSchedules).toBe(true)
  })

  it('explicit no-schedule exception WITH reason → ALLOWED and marked no-schedules (caller audits)', () => {
    const r = evaluateSendGuard({ eligibleCount: 2, selectedCount: 0, noScheduleException: true, noScheduleReason: 'master agreement; schedule to follow' })
    expect(r.ok).toBe(true)
    expect(r.noSchedules).toBe(true)
  })

  it('explicit exception WITHOUT a reason → BLOCKED', () => {
    const r = evaluateSendGuard({ eligibleCount: 2, selectedCount: 0, noScheduleException: true, noScheduleReason: '  ' })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/reason is required/)
  })

  it('a selection always wins even if the exception flag is also set', () => {
    const r = evaluateSendGuard({ eligibleCount: 3, selectedCount: 2, noScheduleException: true, noScheduleReason: 'x' })
    expect(r.ok).toBe(true)
    expect(r.noSchedules).toBe(false)
  })
})
