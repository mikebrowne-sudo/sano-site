'use client'

// Phase 5.2 — "Start Onboarding" trigger + modal.
//
// Renders the primary forward action when an applicant is in
// status='approved'. Captures worker kind (Independent contractor /
// Sano team member) and the optional trial-skip toggle, then calls
// the startContractorOnboarding server action.
//
// On success: shows a brief success state and redirects to the new
// contractor record. On error: surfaces the message inline; modal
// stays open so the admin can retry or adjust.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { startContractorOnboarding } from '../_actions'

type WorkerKind = 'contractor' | 'employee'

const WORKER_OPTIONS: {
  value: WorkerKind
  label: string
  helper: string
}[] = [
  {
    value: 'contractor',
    label: 'Independent contractor',
    helper: 'Works independently with their own equipment and insurance',
  },
  {
    value: 'employee',
    label: 'Sano team member',
    helper: 'Works as part of the Sano team (casual or part-time)',
  },
]

export function StartOnboardingButton({
  applicantId,
  applicationType,
  alreadyConvertedContractorId,
}: {
  applicantId: string
  applicationType: string | null
  alreadyConvertedContractorId: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState<string | null>(null)

  // Default the worker kind based on what the applicant selected on
  // the public form ('contractor' / 'employee'); admin can flip
  // either way before confirming.
  const initialKind: WorkerKind =
    applicationType === 'employee' ? 'employee' : 'contractor'
  const [workerKind, setWorkerKind] = useState<WorkerKind>(initialKind)
  const [skipTrial, setSkipTrial] = useState(false)

  // If already converted (idempotent state), render as a link to the
  // contractor record rather than the conversion CTA.
  if (alreadyConvertedContractorId) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-sm text-emerald-800 font-medium mb-1">
          Already converted to a contractor record
        </p>
        <a
          href={`/portal/contractors/${alreadyConvertedContractorId}`}
          className="text-sm text-emerald-700 underline-offset-2 hover:underline"
        >
          View contractor record →
        </a>
      </div>
    )
  }

  function onConfirm() {
    setErrorMessage('')
    startTransition(async () => {
      const result = await startContractorOnboarding({
        applicantId,
        workerKind,
        trialRequired: !skipTrial,
      })
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setSuccess(result.contractorId)
      // Brief success flash, then jump to the new contractor record.
      // Phase 5.3 — tightened from 900ms to 600ms (still enough to
      // register the "Created" feedback without feeling slow).
      setTimeout(() => router.push(`/portal/contractors/${result.contractorId}`), 600)
    })
  }

  function close() {
    if (pending) return
    setOpen(false)
    setErrorMessage('')
    setSuccess(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setErrorMessage(''); setSuccess(null); setOpen(true) }}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
      >
        Start Onboarding
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={close}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-sage-800 mb-1">Start onboarding?</h3>
            <p className="text-sm text-sage-600 mb-5">
              This will create a worker profile and begin onboarding.
            </p>

            <p className="text-xs uppercase tracking-wide font-semibold text-sage-700 mb-2">
              How will they work with Sano?
            </p>
            <div className="grid gap-2 mb-5">
              {WORKER_OPTIONS.map((o) => {
                const active = workerKind === o.value
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setWorkerKind(o.value)}
                    disabled={pending}
                    className={`w-full text-left rounded-xl border-2 p-3 transition-colors duration-150 ${
                      active
                        ? 'border-sage-500 bg-sage-50'
                        : 'border-sage-100 bg-white hover:border-sage-300'
                    } disabled:opacity-50`}
                  >
                    <p className="font-semibold text-sm text-sage-800">{o.label}</p>
                    <p className="text-xs text-sage-600 mt-0.5">{o.helper}</p>
                  </button>
                )
              })}
            </div>

            <label className="flex items-start gap-3 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={skipTrial}
                onChange={(e) => setSkipTrial(e.target.checked)}
                disabled={pending}
                className="mt-0.5 w-4 h-4 accent-sage-500"
              />
              <div>
                <p className="text-sm font-medium text-sage-800">Skip trial (experienced applicant)</p>
                <p className="text-xs text-sage-500 mt-0.5">
                  By default, a trial shift is required after onboarding. Tick this if you&apos;re confident enough that you want them to skip straight to ready-to-work.
                </p>
              </div>
            </label>

            {errorMessage && (
              <p className="text-sm text-red-600 mb-3">{errorMessage}</p>
            )}
            {success && (
              <p className="text-sm text-emerald-700 mb-3">
                Contractor created. Redirecting…
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm text-sage-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending || !!success}
                className="bg-sage-500 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? 'Creating…' : success ? 'Created' : 'Confirm & start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
