'use client'

import { useState, useTransition } from 'react'
import { setOnboardingItemStatus, overrideOnboardingItem } from '../_actions-onboarding'
import { COMPLETION_SOURCE_LABEL, type CompletionSource } from '@/lib/onboarding-checklist'

// Admin override is always styled DISTINCTLY (amber ring) so it can never be
// mistaken for a genuine workflow completion.
const SOURCE_STYLE: Record<string, string> = {
  worker_submitted: 'bg-sky-50 text-sky-700',
  worker_acknowledged: 'bg-sky-50 text-sky-700',
  staff_verified: 'bg-emerald-50 text-emerald-700',
  system_completed: 'bg-gray-100 text-gray-600',
  admin_override: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
  imported_legacy: 'bg-gray-100 text-gray-500',
}

export interface ChecklistItemProps {
  itemId: string
  contractorId: string
  itemKey: string
  label: string
  required: boolean
  complete: boolean
  completedDateLabel: string
  source: string | null
  effectiveDate: string | null
  confirmedBy: string | null
  evidenceRef: string | null
  overrideReason: string | null
  isStaffVerify: boolean
  isWorkflowOwned: boolean
  isAdmin: boolean
}

function Check() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M2 5.5L4.5 8L9 3" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const btn = 'text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50'

export function OnboardingChecklistItem(props: ChecklistItemProps) {
  const {
    itemId, contractorId, label, required, complete, completedDateLabel,
    source, effectiveDate, confirmedBy, evidenceRef, overrideReason,
    isStaffVerify, isWorkflowOwned, isAdmin,
  } = props

  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showOverride, setShowOverride] = useState(false)

  function run(status: 'pending' | 'complete') {
    setError('')
    startTransition(async () => {
      const r = await setOnboardingItemStatus({ itemId, contractorId, status })
      if ('error' in r) setError(r.error)
    })
  }

  const sourceLabel = source ? (COMPLETION_SOURCE_LABEL[source as CompletionSource] ?? source) : null
  const isOverride = source === 'admin_override'

  return (
    <div className={`rounded-xl border p-3 ${complete ? 'border-sage-200 bg-sage-50/40' : 'border-sage-100 bg-white'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${
            complete ? (isOverride ? 'bg-amber-500 border-amber-500' : 'bg-sage-500 border-sage-500') : 'border-sage-200 bg-white'
          }`}
        >
          {complete && <Check />}
        </span>

        <span className={`flex-1 text-sm ${complete ? 'text-sage-700' : 'text-sage-800 font-medium'}`}>
          {label}
          {!required && (
            <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-gray-100 text-gray-500 align-middle">
              Optional
            </span>
          )}
        </span>

        {/* Actions — staff-verify items toggle directly; workflow-owned items are
            never a bare toggle (admin can Override, or Reopen a completed one). */}
        {isStaffVerify ? (
          <button type="button" onClick={() => run(complete ? 'pending' : 'complete')} disabled={pending}
            className={`${btn} border-sage-200 text-sage-700 hover:bg-sage-50`}>
            {complete ? 'Unverify' : 'Verify'}
          </button>
        ) : complete ? (
          isAdmin && (
            <button type="button" onClick={() => run('pending')} disabled={pending}
              className={`${btn} border-sage-200 text-sage-500 hover:bg-sage-50`}>
              Reopen
            </button>
          )
        ) : (
          isAdmin && (
            <button type="button" onClick={() => setShowOverride((v) => !v)}
              className={`${btn} border-amber-300 text-amber-700 hover:bg-amber-50`}>
              Override
            </button>
          )
        )}
      </div>

      {/* Evidence */}
      {complete && (
        <div className="mt-2 pl-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {sourceLabel && (
            <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${SOURCE_STYLE[source!] ?? 'bg-gray-100 text-gray-600'}`}>
              {sourceLabel}
            </span>
          )}
          {completedDateLabel && <span className="text-sage-500">Completed {completedDateLabel}</span>}
          {effectiveDate && <span className="text-sage-500">Effective {effectiveDate}</span>}
          {confirmedBy && <span className="text-sage-500">Confirmed by {confirmedBy}</span>}
          {evidenceRef && <span className="text-sage-500">Evidence: {evidenceRef}</span>}
        </div>
      )}
      {isOverride && overrideReason && (
        <p className="mt-1 pl-8 text-[11px] text-amber-700"><span className="font-medium">Override reason:</span> {overrideReason}</p>
      )}
      {!complete && isWorkflowOwned && !showOverride && (
        <p className="mt-1 pl-8 text-[11px] text-sage-400">
          Completes via its own process{isAdmin ? ' — or record an offline completion with Override.' : '.'}
        </p>
      )}

      {showOverride && isAdmin && (
        <OverrideForm itemId={itemId} contractorId={contractorId} onClose={() => setShowOverride(false)} />
      )}
      {error && <p className="mt-1 pl-8 text-[11px] text-red-600">{error}</p>}
    </div>
  )
}

function OverrideForm({ itemId, contractorId, onClose }: { itemId: string; contractorId: string; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [confirmedBy, setConfirmedBy] = useState('')
  const [evidenceRef, setEvidenceRef] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const input = 'w-full rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs text-sage-800 focus:outline-none focus:ring-2 focus:ring-amber-400'

  function submit() {
    setError('')
    startTransition(async () => {
      const r = await overrideOnboardingItem({ itemId, contractorId, reason, effectiveDate, confirmedBy, evidenceRef: evidenceRef || null })
      if ('error' in r) { setError(r.error); return }
      onClose()
    })
  }

  return (
    <div className="mt-3 ml-8 rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
      <p className="text-[11px] font-semibold text-amber-800">Record an admin override</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="block"><span className="block text-[10px] text-amber-700 mb-0.5">Reason <span className="text-red-500">*</span></span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={input} placeholder="e.g. inducted in person, signed paper record held" /></label>
        <label className="block"><span className="block text-[10px] text-amber-700 mb-0.5">Effective date <span className="text-red-500">*</span></span>
          <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={input} /></label>
        <label className="block"><span className="block text-[10px] text-amber-700 mb-0.5">Completed / confirmed by <span className="text-red-500">*</span></span>
          <input value={confirmedBy} onChange={(e) => setConfirmedBy(e.target.value)} className={input} placeholder="who did / confirmed it" /></label>
        <label className="block"><span className="block text-[10px] text-amber-700 mb-0.5">Evidence reference</span>
          <input value={evidenceRef} onChange={(e) => setEvidenceRef(e.target.value)} className={input} placeholder="optional — doc / note" /></label>
      </div>
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="button" onClick={submit} disabled={pending}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
          {pending ? 'Saving…' : 'Record override'}
        </button>
        <button type="button" onClick={onClose} className="text-[11px] text-sage-600 hover:text-sage-800">Cancel</button>
      </div>
    </div>
  )
}
