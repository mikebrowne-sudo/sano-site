'use client'

// Phase 5.5.3 — Contractor portal access action buttons.
// Mirrors the staff InviteActions component shape.
//
// Phase 5.5.10 fix — the status helpers (Status type, STATUS_LABEL,
// STATUS_BADGE, contractorAccessStatus) moved to ./access-shared so
// the server-side ContractorAccessPanel can import them safely. Re-
// exported here as a back-compat surface for callsites still
// importing from this file (notably the contractors list page chip).

import { useState, useTransition } from 'react'
import {
  inviteContractorUser,
  disableContractorAccess,
  enableContractorAccess,
} from '../_actions-access'
import {
  STATUS_LABEL as _STATUS_LABEL,
  STATUS_BADGE as _STATUS_BADGE,
  contractorAccessStatus as _contractorAccessStatus,
  type AccessStatus,
} from './access-shared'

type Status = AccessStatus

export const STATUS_LABEL = _STATUS_LABEL
export const STATUS_BADGE = _STATUS_BADGE
export const contractorAccessStatus = _contractorAccessStatus

export function ContractorAccessActions({
  contractorId,
  status,
  featureEnabled,
}: {
  contractorId: string
  status: Status
  featureEnabled: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [modal, setModal] = useState<null | 'disable'>(null)
  const [reason, setReason] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [flash, setFlash] = useState<'idle' | 'invite_sent' | 'enabled'>('idle')

  function doInvite() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await inviteContractorUser({ contractorId })
      if ('error' in r) {
        setErrorMessage(r.error)
        return
      }
      setFlash('invite_sent')
      setTimeout(() => setFlash('idle'), 2500)
    })
  }

  function doDisable() {
    if (!reason.trim()) return
    setErrorMessage('')
    startTransition(async () => {
      const r = await disableContractorAccess({ contractorId, reason })
      if ('error' in r) {
        setErrorMessage(r.error)
        return
      }
      setModal(null)
      setReason('')
    })
  }

  function doEnable() {
    setErrorMessage('')
    startTransition(async () => {
      const r = await enableContractorAccess({ contractorId })
      if ('error' in r) {
        setErrorMessage(r.error)
        return
      }
      setFlash('enabled')
      setTimeout(() => setFlash('idle'), 2000)
    })
  }

  if (!featureEnabled) {
    return (
      <p className="text-sm text-sage-500">
        Contractor portal is disabled in workforce settings — invite actions are unavailable.
      </p>
    )
  }

  const inviteLabel =
    status === 'not_invited' ? 'Send invite' :
    status === 'invited'     ? 'Resend invite' :
    status === 'active'      ? 'Resend invite' :
                                null

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {status !== 'disabled' && inviteLabel && (
          <button
            type="button"
            onClick={doInvite}
            disabled={pending}
            className="bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {pending ? 'Working…' : inviteLabel}
          </button>
        )}
        {(status === 'invited' || status === 'active') && (
          <button
            type="button"
            onClick={() => { setReason(''); setErrorMessage(''); setModal('disable') }}
            disabled={pending}
            className="bg-white border border-red-200 text-red-700 font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            Disable access
          </button>
        )}
        {status === 'disabled' && (
          <button
            type="button"
            onClick={doEnable}
            disabled={pending}
            className="bg-emerald-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {pending ? 'Working…' : 'Re-enable access'}
          </button>
        )}
      </div>

      {flash === 'invite_sent' && (
        <p className="text-xs text-emerald-700 mt-2">Invite email sent.</p>
      )}
      {flash === 'enabled' && (
        <p className="text-xs text-emerald-700 mt-2">Access re-enabled.</p>
      )}
      {errorMessage && (
        <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
      )}

      {modal === 'disable' && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !pending && setModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-sage-800 mb-1">Disable contractor access</h3>
            <p className="text-sm text-sage-600 mb-4">
              The contractor will be signed out and unable to log into <code className="text-xs">/contractor/*</code>. Job assignment is a separate gate (contractor.status). Re-enabling restores login immediately. Reason is captured in the audit log.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Reason for disabling…"
              className="w-full border border-sage-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300"
            />
            {errorMessage && (
              <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setModal(null)}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm text-sage-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doDisable}
                disabled={pending || !reason.trim()}
                className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? 'Disabling…' : 'Disable access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
