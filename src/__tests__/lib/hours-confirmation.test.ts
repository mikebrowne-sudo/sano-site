/**
 * Contractor confirmation that a completed job went to plan.
 *
 * Context: under the allowed-hours model the pay basis is hours_allocated ×
 * rate, agreed at job creation. The contractor had NO way to say whether the
 * job actually took that long — actual_hours/approved_hours were null on all
 * 122 jobs since August — so Carol approved pay with no signal from the person
 * who did the work, and $4,068 across 21 jobs sat unapproved, some since May.
 *
 * The question is narrow on purpose: "did it go to plan?", not "enter your
 * hours". Re-entering hours would reintroduce the timesheet friction the
 * allowed-hours model removed.
 */

import {
  isConfirmable,
  needsConfirmation,
  CONFIRMATION_START_DATE,
  shouldRemind,
  queueSignal,
  queueSignalLabel,
  hoursToConfirm,
  formatHours,
  summariseConfirmations,
  isHoursConfirmedStatus,
  type ConfirmableJob,
  type ConfirmableWorker,
  type HoursConfirmedStatus,
  resolveSmsConfirmation,
  ambiguousSmsSuffix,
  type PendingConfirmation,
} from '@/lib/hours-confirmation'

const job = (over: Partial<ConfirmableJob> = {}): ConfirmableJob => ({
  id: 'j1', status: 'completed',
  scheduledDate: '2026-10-02', completedAt: '2026-10-02T06:00:00Z',
  ...over,
})

const worker = (over: Partial<ConfirmableWorker> = {}): ConfirmableWorker => ({
  jobId: 'j1', contractorId: 'c1',
  hoursAllocated: 4,
  hoursConfirmedStatus: 'unconfirmed',
  ...over,
})

describe('isHoursConfirmedStatus', () => {
  it.each(['unconfirmed', 'as_planned', 'took_longer'])('accepts %s', (v) => {
    expect(isHoursConfirmedStatus(v)).toBe(true)
  })
  it.each([null, undefined, '', 'approved', 42])('rejects %s', (v) => {
    expect(isHoursConfirmedStatus(v)).toBe(false)
  })
})

describe('isConfirmable — only a finished job', () => {
  it.each(['completed', 'invoiced'])('asks on %s', (status) => {
    expect(isConfirmable(job({ status }))).toBe(true)
  })

  // Asking before the work is done is noise.
  it.each(['draft', 'assigned', 'cancelled'])('does not ask on %s', (status) => {
    expect(isConfirmable(job({ status }))).toBe(false)
  })

  // `invoiced` matters: the job is finished and still unanswered — exactly the
  // case that was being missed for months.
  it('still asks once the job has been invoiced', () => {
    expect(needsConfirmation(job({ status: 'invoiced' }), worker())).toBe(true)
  })
})

/**
 * Go-live cutoff. 21 completed jobs going back to May had never been approved
 * for pay when this shipped; those were settled outside the portal, so chasing
 * contractors about them would be noise about money already dealt with.
 */
describe('CONFIRMATION_START_DATE — only from go-live forward', () => {
  it('asks about a job scheduled on the go-live date', () => {
    expect(isConfirmable(job({ scheduledDate: CONFIRMATION_START_DATE }))).toBe(true)
  })

  it('asks about a job scheduled after go-live', () => {
    expect(isConfirmable(job({ scheduledDate: '2026-10-15' }))).toBe(true)
  })

  it.each(['2026-09-29', '2026-08-24', '2026-05-27'])(
    'never asks about a pre-go-live job (%s)', (scheduledDate) => {
      expect(isConfirmable(job({ scheduledDate }))).toBe(false)
      expect(needsConfirmation(job({ scheduledDate }), worker())).toBe(false)
      expect(shouldRemind(job({ scheduledDate }), worker(), '2026-10-02')).toBe(false)
    },
  )

  it('never asks when there is no scheduled date to test against', () => {
    expect(isConfirmable(job({ scheduledDate: null }))).toBe(false)
  })
})

describe('needsConfirmation', () => {
  it('is true while unconfirmed', () => {
    expect(needsConfirmation(job(), worker())).toBe(true)
  })

  it.each(['as_planned', 'took_longer'] as HoursConfirmedStatus[])(
    'is false once answered %s', (hoursConfirmedStatus) => {
      expect(needsConfirmation(job(), worker({ hoursConfirmedStatus }))).toBe(false)
    },
  )

  it('is false on a job that is not finished', () => {
    expect(needsConfirmation(job({ status: 'assigned' }), worker())).toBe(false)
  })
})

describe('shouldRemind — the evening of the clean, then onward', () => {
  it('reminds on the scheduled day', () => {
    expect(shouldRemind(job({ scheduledDate: '2026-10-02' }), worker(), '2026-10-02')).toBe(true)
  })

  // No upper age limit: the failure mode was work going unanswered for months.
  it('keeps reminding on later days while still unanswered', () => {
    expect(shouldRemind(job({ scheduledDate: '2026-10-01' }), worker(), '2026-10-05')).toBe(true)
  })

  it('does not remind before the job was even scheduled', () => {
    expect(shouldRemind(job({ scheduledDate: '2026-10-05' }), worker(), '2026-10-02')).toBe(false)
  })

  it('stops once answered', () => {
    expect(shouldRemind(job(), worker({ hoursConfirmedStatus: 'as_planned' }), '2026-10-02')).toBe(false)
    expect(shouldRemind(job(), worker({ hoursConfirmedStatus: 'took_longer' }), '2026-10-02')).toBe(false)
  })

  it('does not remind on an unfinished job', () => {
    expect(shouldRemind(job({ status: 'assigned' }), worker(), '2026-10-02')).toBe(false)
  })

  it('does not remind with no scheduled date to anchor to', () => {
    expect(shouldRemind(job({ scheduledDate: null }), worker(), '2026-10-02')).toBe(false)
  })
})

describe('queueSignal — what Carol sees', () => {
  it('confirmed rows are safe to bulk-approve', () => {
    expect(queueSignal(worker({ hoursConfirmedStatus: 'as_planned' }))).toBe('confirmed')
  })

  it('an overrun is flagged for a look before approving', () => {
    expect(queueSignal(worker({ hoursConfirmedStatus: 'took_longer' }))).toBe('flagged')
  })

  it('no answer yet reads as awaiting', () => {
    expect(queueSignal(worker())).toBe('awaiting')
  })

  it('labels every signal', () => {
    expect(queueSignalLabel('confirmed')).toMatch(/as planned/i)
    expect(queueSignalLabel('flagged')).toMatch(/overrun/i)
    expect(queueSignalLabel('awaiting')).toMatch(/awaiting/i)
  })
})

describe('hoursToConfirm — their share, not the job total', () => {
  // A two-cleaner 8h job is 4h each; each is asked about their own share.
  it('uses the allocated hours', () => {
    expect(hoursToConfirm(worker({ hoursAllocated: 4 }))).toBe(4)
  })

  it('includes an admin-APPROVED adjustment, so the figure is what will be paid', () => {
    expect(hoursToConfirm(worker({
      hoursAllocated: 4, extraHours: 1.5, extraHoursStatus: 'approved',
    }))).toBe(5.5)
  })

  it.each(['pending', 'rejected', 'none'])('ignores a %s adjustment', (extraHoursStatus) => {
    expect(hoursToConfirm(worker({
      hoursAllocated: 4, extraHours: 1.5, extraHoursStatus,
    }))).toBe(4)
  })

  it('handles a negative approved adjustment (finished early)', () => {
    expect(hoursToConfirm(worker({
      hoursAllocated: 4, extraHours: -1, extraHoursStatus: 'approved',
    }))).toBe(3)
  })

  it('returns null when no hours are set rather than inventing 0', () => {
    expect(hoursToConfirm(worker({ hoursAllocated: null }))).toBeNull()
  })
})

describe('formatHours', () => {
  it.each([
    [4, '4 hours'],
    [1, '1 hour'],
    [3.5, '3.5 hours'],
    [2.25, '2.25 hours'],
  ])('formats %s as "%s"', (input, expected) => {
    expect(formatHours(input)).toBe(expected)
  })

  it('degrades gracefully with no hours', () => {
    expect(formatHours(null)).toBe('the agreed hours')
  })
})

describe('summariseConfirmations', () => {
  it('counts each signal', () => {
    expect(summariseConfirmations([
      worker({ hoursConfirmedStatus: 'as_planned' }),
      worker({ hoursConfirmedStatus: 'as_planned' }),
      worker({ hoursConfirmedStatus: 'took_longer' }),
      worker(),
    ])).toEqual({ confirmed: 2, flagged: 1, awaiting: 1, total: 4 })
  })

  it('handles an empty set', () => {
    expect(summariseConfirmations([])).toEqual({ confirmed: 0, flagged: 0, awaiting: 0, total: 0 })
  })
})

/**
 * Confirming by SMS reply.
 *
 * A bare "YES" carries no job reference, so the job has to be inferred. Getting
 * this wrong writes a confirmation onto the wrong pay record, so the rule is
 * narrow: the job whose reminder was sent most recently — what is on the
 * contractor's screen — and never more than one job per reply.
 */
describe('resolveSmsConfirmation', () => {
  const p = (over: Partial<PendingConfirmation> = {}): PendingConfirmation => ({
    jobId: 'j1', contractorId: 'c1', jobNumber: 'JOB-0001',
    scheduledDate: '2026-10-02', lastRemindedAt: '2026-10-02T07:00:00Z',
    hoursAllocated: 4,
    ...over,
  })

  it('reports none when nothing is outstanding', () => {
    expect(resolveSmsConfirmation([])).toEqual({ kind: 'none' })
  })

  it('resolves a single outstanding job', () => {
    const only = p()
    expect(resolveSmsConfirmation([only])).toEqual({ kind: 'one', pending: only })
  })

  it('picks the most recently reminded job', () => {
    const older = p({ jobId: 'old', lastRemindedAt: '2026-10-01T07:00:00Z' })
    const newer = p({ jobId: 'new', lastRemindedAt: '2026-10-03T07:00:00Z' })
    const r = resolveSmsConfirmation([older, newer])
    expect(r.kind).toBe('ambiguous')
    if (r.kind === 'ambiguous') {
      expect(r.pending.jobId).toBe('new')
      expect(r.count).toBe(2)
    }
  })

  // The safety property: several outstanding jobs never all get confirmed.
  it('flags ambiguity rather than confirming everything', () => {
    const r = resolveSmsConfirmation([p({ jobId: 'a' }), p({ jobId: 'b' }), p({ jobId: 'c' })])
    expect(r.kind).toBe('ambiguous')
    if (r.kind === 'ambiguous') expect(r.count).toBe(3)
  })

  it('sorts a never-reminded job last', () => {
    const reminded = p({ jobId: 'reminded', lastRemindedAt: '2026-10-01T07:00:00Z' })
    const never = p({ jobId: 'never', lastRemindedAt: null })
    const r = resolveSmsConfirmation([never, reminded])
    if (r.kind === 'ambiguous') expect(r.pending.jobId).toBe('reminded')
  })

  it('falls back to the later scheduled date when reminders tie', () => {
    const a = p({ jobId: 'a', scheduledDate: '2026-10-01', lastRemindedAt: '2026-10-05T07:00:00Z' })
    const b = p({ jobId: 'b', scheduledDate: '2026-10-04', lastRemindedAt: '2026-10-05T07:00:00Z' })
    const r = resolveSmsConfirmation([a, b])
    if (r.kind === 'ambiguous') expect(r.pending.jobId).toBe('b')
  })

  it('does not mutate the caller’s array', () => {
    const rows = [p({ jobId: 'a', lastRemindedAt: '2026-10-01T07:00:00Z' }), p({ jobId: 'b', lastRemindedAt: '2026-10-03T07:00:00Z' })]
    resolveSmsConfirmation(rows)
    expect(rows[0].jobId).toBe('a')
  })
})

describe('ambiguousSmsSuffix', () => {
  it('tells them how many others need the portal', () => {
    expect(ambiguousSmsSuffix(2)).toMatch(/2 other jobs/)
    expect(ambiguousSmsSuffix(2)).toMatch(/portal/)
  })

  it('uses the singular for one', () => {
    expect(ambiguousSmsSuffix(1)).toMatch(/1 other job\b/)
  })

  it('says nothing when there are no others', () => {
    expect(ambiguousSmsSuffix(0)).toBe('')
    expect(ambiguousSmsSuffix(-1)).toBe('')
  })
})
