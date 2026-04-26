'use client'

// Phase 5.1 — Trial scheduling + outcome panel.
//
// Surfaces only when relevant to the current stage:
//   - approved / onboarding → trial_required toggle
//   - approved / onboarding (with trial_required=true) → schedule date+time picker
//   - trial → outcome buttons (passed → ready_to_work, failed → rejected)
//   - ready_to_work → read-only "last outcome" line if previously recorded
//
// Honest gating happens in Phase 5.4 (assignJob hard-block + onboarding-
// complete check). For 5.1 this section just records the trial state
// and triggers the relevant status transitions via server actions.

import { useState, useTransition } from 'react'
import {
  updateTrialRequired,
  scheduleTrial,
  recordTrialOutcome,
} from '../_actions'

type Props = {
  applicantId: string
  status: string
  trialRequired: boolean
  trialScheduledFor: string | null
  trialOutcome: string | null
}

function fmtScheduled(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ApplicantTrialSection({
  applicantId,
  status,
  trialRequired,
  trialScheduledFor,
  trialOutcome,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  const initialDate = trialScheduledFor ? trialScheduledFor.slice(0, 10) : ''
  const initialTime = trialScheduledFor
    ? new Date(trialScheduledFor).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '09:00'

  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [outcomeNote, setOutcomeNote] = useState('')

  // Hide entirely when not relevant to the stage.
  const showSection =
    status === 'approved' ||
    status === 'onboarding' ||
    status === 'trial' ||
    status === 'ready_to_work'
  if (!showSection) return null

  function doToggle() {
    setErrorMessage('')
    startTransition(async () => {
      const result = await updateTrialRequired({
        applicantId, trialRequired: !trialRequired,
      })
      if ('error' in result) setErrorMessage(result.error)
    })
  }

  function doSchedule() {
    if (!date) return
    setErrorMessage('')
    const dateTime = `${date}T${time}:00`
    startTransition(async () => {
      const result = await scheduleTrial({ applicantId, scheduledFor: dateTime })
      if ('error' in result) setErrorMessage(result.error)
    })
  }

  function doOutcome(outcome: 'passed' | 'failed') {
    setErrorMessage('')
    startTransition(async () => {
      const result = await recordTrialOutcome({
        applicantId, outcome, note: outcomeNote || undefined,
      })
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setOutcomeNote('')
    })
  }

  const showToggle = status === 'approved' || status === 'onboarding'
  const showScheduler = trialRequired && (status === 'approved' || status === 'onboarding' || status === 'trial')
  const showOutcomeButtons = status === 'trial'

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
      <h2 className="text-base font-semibold text-sage-800 mb-3">Trial</h2>

      {showToggle && (
        <div className="flex items-center justify-between mb-4">
          <div className="pr-4">
            <p className="text-sm font-medium text-sage-800">Trial shift required</p>
            <p className="text-xs text-sage-500 mt-0.5">
              Toggle off to skip the trial — they can move straight to ready-to-work once onboarding is complete.
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
      )}

      {showScheduler && (
        <div className={`${showToggle ? 'border-t border-gray-100 pt-4' : ''}`}>
          <p className="text-sm font-medium text-sage-800 mb-2">Trial scheduling</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={pending}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={pending}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800"
            />
            <button
              type="button"
              onClick={doSchedule}
              disabled={pending || !date}
              className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
            >
              {trialScheduledFor ? 'Reschedule' : 'Schedule trial'}
            </button>
          </div>
          {trialScheduledFor && (
            <p className="text-xs text-sage-500 mt-2">
              Currently scheduled: {fmtScheduled(trialScheduledFor)}
            </p>
          )}
        </div>
      )}

      {showOutcomeButtons && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <p className="text-sm font-medium text-sage-800 mb-2">Trial outcome</p>
          <textarea
            value={outcomeNote}
            onChange={(e) => setOutcomeNote(e.target.value)}
            rows={2}
            placeholder="Note (optional — appears on the audit log)..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 mb-2 focus:outline-none focus:ring-2 focus:ring-sage-300"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => doOutcome('passed')}
              disabled={pending}
              className="inline-flex items-center gap-2 bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              Mark passed → ready to work
            </button>
            <button
              type="button"
              onClick={() => doOutcome('failed')}
              disabled={pending}
              className="inline-flex items-center gap-2 bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              Mark failed → reject
            </button>
          </div>
        </div>
      )}

      {trialOutcome && (
        <div className="border-t border-gray-100 pt-4 mt-4">
          <p className="text-xs uppercase tracking-wide text-sage-500 mb-1">Last outcome</p>
          <p className="text-sm text-sage-800 whitespace-pre-line">{trialOutcome}</p>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
      )}
    </div>
  )
}
