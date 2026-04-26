'use client'

// Phase 5.1 — Stage-based action panel.
//
// Renders the recommended forward action for the current pipeline
// stage as a primary button, plus Reject + Put-on-hold buttons that
// open a reason-capture modal. Rejected/on-hold rows show "Reopen".
//
// Forward transitions through the pipeline use updateApplicantStatus.
// Trial-related actions (schedule, outcome) live in the separate
// ApplicantTrialSection. This component intentionally does NOT
// trigger contractor conversion — that lands in Phase 5.2.

import { useState, useTransition } from 'react'
import {
  updateApplicantStatus,
  rejectApplicant,
  putApplicantOnHold,
} from '../_actions'

type Status =
  | 'new' | 'reviewing' | 'phone_screen' | 'approved' | 'onboarding'
  | 'trial' | 'ready_to_work' | 'on_hold' | 'rejected'

const FORWARD: Partial<Record<Status, { next: Status; label: string }>> = {
  new:          { next: 'reviewing',     label: 'Start review' },
  reviewing:    { next: 'phone_screen',  label: 'Move to phone screen' },
  phone_screen: { next: 'approved',      label: 'Approve' },
  approved:     { next: 'onboarding',    label: 'Start onboarding' },
  // onboarding → trial / ready_to_work handled via ApplicantTrialSection
  // trial outcomes handled via ApplicantTrialSection
}

export function ApplicantStageActions({
  applicantId,
  status,
}: {
  applicantId: string
  status: string
}) {
  const current = status as Status
  const [pending, startTransition] = useTransition()
  const [modal, setModal] = useState<null | 'reject' | 'hold'>(null)
  const [reason, setReason] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const forward = FORWARD[current]

  function doForward() {
    if (!forward) return
    setErrorMessage('')
    startTransition(async () => {
      const result = await updateApplicantStatus({
        applicantId, status: forward.next,
      })
      if ('error' in result) setErrorMessage(result.error)
    })
  }

  function doReopen() {
    setErrorMessage('')
    startTransition(async () => {
      const result = await updateApplicantStatus({
        applicantId, status: 'new',
      })
      if ('error' in result) setErrorMessage(result.error)
    })
  }

  function doSubmitModal() {
    if (!reason.trim()) return
    setErrorMessage('')
    startTransition(async () => {
      const fn = modal === 'reject' ? rejectApplicant : putApplicantOnHold
      const result = await fn({ applicantId, reason })
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setModal(null)
      setReason('')
    })
  }

  const showReject = current !== 'rejected'
  const showHold = current !== 'on_hold' && current !== 'rejected'
  const showReopen = current === 'rejected' || current === 'on_hold'

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {forward && (
          <button
            type="button"
            onClick={doForward}
            disabled={pending}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {forward.label}
          </button>
        )}
        {showReopen && (
          <button
            type="button"
            onClick={doReopen}
            disabled={pending}
            className="inline-flex items-center gap-2 bg-sage-100 text-sage-800 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reopen
          </button>
        )}
        {showHold && (
          <button
            type="button"
            onClick={() => { setReason(''); setErrorMessage(''); setModal('hold') }}
            disabled={pending}
            className="inline-flex items-center gap-2 bg-white border border-amber-200 text-amber-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            Put on hold
          </button>
        )}
        {showReject && (
          <button
            type="button"
            onClick={() => { setReason(''); setErrorMessage(''); setModal('reject') }}
            disabled={pending}
            className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        )}
      </div>

      {errorMessage && (
        <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-sage-800 mb-1">
              {modal === 'reject' ? 'Reject applicant' : 'Put applicant on hold'}
            </h3>
            <p className="text-sm text-sage-600 mb-4">
              {modal === 'reject'
                ? 'Reason — internal only. The applicant is not notified automatically.'
                : 'Reason — what needs to change before resuming?'}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Reason..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
            {errorMessage && (
              <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setModal(null); setReason(''); setErrorMessage('') }}
                className="px-4 py-2 rounded-lg text-sm text-sage-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doSubmitModal}
                disabled={pending || !reason.trim()}
                className={
                  modal === 'reject'
                    ? 'bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-amber-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                }
              >
                {modal === 'reject' ? 'Reject' : 'Put on hold'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
