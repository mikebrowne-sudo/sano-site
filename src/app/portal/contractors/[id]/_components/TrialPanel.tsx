'use client'

// Phase 5.4 — Trial card on the contractor detail page.
//
// Surfaces the current trial state and the actions appropriate to it:
//   - trial_required=false: simple "Trial skipped" pill
//   - trial_required=true:
//       trial_status='not_started' / 'scheduled' → schedule date+time
//       trial_status='scheduled' → mark passed / failed (with note)
//       trial_status='passed' / 'failed' → read-only summary + reset
// Mirrors the applicant ApplicantTrialSection but writes to
// contractor columns via the contractor server actions.

import { useState, useTransition } from 'react'
import {
  setContractorTrialRequired,
  scheduleContractorTrial,
  recordContractorTrialOutcome,
} from '../_actions-onboarding'

type TrialStatus = 'not_required' | 'not_started' | 'scheduled' | 'passed' | 'failed'

const STATUS_LABEL: Record<TrialStatus, string> = {
  not_required: 'Trial skipped',
  not_started:  'Not yet scheduled',
  scheduled:    'Scheduled',
  passed:       'Passed',
  failed:       'Failed',
}

const STATUS_BADGE: Record<TrialStatus, string> = {
  not_required: 'bg-emerald-50 text-emerald-700',
  not_started:  'bg-amber-50 text-amber-700',
  scheduled:    'bg-sky-50 text-sky-700',
  passed:       'bg-emerald-100 text-emerald-800',
  failed:       'bg-red-50 text-red-700',
}

function fmtScheduled(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function TrialPanel({
  contractorId,
  trialRequired,
  trialStatus,
  trialScheduledFor,
  trialOutcomeNote,
}: {
  contractorId: string
  trialRequired: boolean
  trialStatus: string
  trialScheduledFor: string | null
  trialOutcomeNote: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const initialDate = trialScheduledFor ? trialScheduledFor.slice(0, 10) : ''
  const initialTime = trialScheduledFor
    ? new Date(trialScheduledFor).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '09:00'
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [note, setNote] = useState('')

  const status = (trialStatus ?? 'not_started') as TrialStatus

  function doToggle() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await setContractorTrialRequired({ contractorId, trialRequired: !trialRequired })
      if ('error' in r) setErrorMessage(r.error)
    })
  }

  function doSchedule() {
    if (!date) return
    setErrorMessage('')
    startTransition(async () => {
      const r = await scheduleContractorTrial({
        contractorId,
        scheduledFor: `${date}T${time}:00`,
      })
      if ('error' in r) setErrorMessage(r.error)
    })
  }

  function doOutcome(outcome: 'passed' | 'failed') {
    setErrorMessage('')
    startTransition(async () => {
      const r = await recordContractorTrialOutcome({ contractorId, outcome, note: note || undefined })
      if ('error' in r) {
        setErrorMessage(r.error)
        return
      }
      setNote('')
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="text-lg font-semibold text-sage-800">Trial</h2>
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p className="text-sm font-medium text-sage-800">Trial shift required</p>
          <p className="text-xs text-sage-500 mt-0.5">
            Toggle off for experienced workers — they skip straight to ready-to-work after onboarding.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={trialRequired}
          onClick={doToggle}
          disabled={pending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${trialRequired ? 'bg-sage-500' : 'bg-gray-300'} disabled:opacity-50`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${trialRequired ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {trialRequired && (status === 'not_started' || status === 'scheduled') && (
        <div className="border-t border-sage-100 pt-4">
          <p className="text-sm font-medium text-sage-800 mb-2">Schedule</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={pending}
              className="border border-sage-100 rounded-lg px-3 py-2 text-sm bg-white text-sage-800"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={pending}
              className="border border-sage-100 rounded-lg px-3 py-2 text-sm bg-white text-sage-800"
            />
            <button
              type="button"
              onClick={doSchedule}
              disabled={pending || !date}
              className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
            >
              {trialScheduledFor ? 'Reschedule' : 'Schedule'}
            </button>
          </div>
          {trialScheduledFor && (
            <p className="text-xs text-sage-500 mt-2">Currently scheduled: {fmtScheduled(trialScheduledFor)}</p>
          )}
        </div>
      )}

      {trialRequired && status === 'scheduled' && (
        <div className="border-t border-sage-100 pt-4 mt-4">
          <p className="text-sm font-medium text-sage-800 mb-2">Outcome</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Optional note (logged in audit trail)…"
            className="w-full border border-sage-100 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 mb-2 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => doOutcome('passed')}
              disabled={pending}
              className="inline-flex items-center gap-2 bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              Mark passed
            </button>
            <button
              type="button"
              onClick={() => doOutcome('failed')}
              disabled={pending}
              className="inline-flex items-center gap-2 bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Mark failed
            </button>
          </div>
        </div>
      )}

      {(status === 'passed' || status === 'failed') && trialOutcomeNote && (
        <div className="border-t border-sage-100 pt-4 mt-4">
          <p className="text-xs uppercase tracking-wide text-sage-500 mb-1">Outcome note</p>
          <p className="text-sm text-sage-800 whitespace-pre-line">{trialOutcomeNote}</p>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 mt-3">{errorMessage}</p>
      )}
    </div>
  )
}
