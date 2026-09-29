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
} from '@/lib/hours-confirmation'

const job = (over: Partial<ConfirmableJob> = {}): ConfirmableJob => ({
  id: 'j1', status: 'completed',
  scheduledDate: '2026-09-28', completedAt: '2026-09-28T06:00:00Z',
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
    expect(shouldRemind(job({ scheduledDate: '2026-09-28' }), worker(), '2026-09-28')).toBe(true)
  })

  // No upper age limit: the failure mode was work going unanswered for months.
  it('keeps reminding on later days while still unanswered', () => {
    expect(shouldRemind(job({ scheduledDate: '2026-09-20' }), worker(), '2026-09-28')).toBe(true)
  })

  it('does not remind before the job was even scheduled', () => {
    expect(shouldRemind(job({ scheduledDate: '2026-09-30' }), worker(), '2026-09-28')).toBe(false)
  })

  it('stops once answered', () => {
    expect(shouldRemind(job(), worker({ hoursConfirmedStatus: 'as_planned' }), '2026-09-28')).toBe(false)
    expect(shouldRemind(job(), worker({ hoursConfirmedStatus: 'took_longer' }), '2026-09-28')).toBe(false)
  })

  it('does not remind on an unfinished job', () => {
    expect(shouldRemind(job({ status: 'assigned' }), worker(), '2026-09-28')).toBe(false)
  })

  it('does not remind with no scheduled date to anchor to', () => {
    expect(shouldRemind(job({ scheduledDate: null }), worker(), '2026-09-28')).toBe(false)
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
