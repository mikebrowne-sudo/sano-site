'use client'

// Phase 5.4 (locked) — Admin override button.
//
// Bypass onboarding completion + trial gates. Visible only to admin
// users (caller checks isAdmin). Requires a non-empty reason which
// is captured in the admin_override_activation audit_log entry.

import { useState, useTransition } from 'react'
import { adminOverrideActivate } from '../_actions-onboarding'

export function AdminOverrideButton({
  contractorId,
}: {
  contractorId: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  function onConfirm() {
    if (!reason.trim()) return
    setErrorMessage('')
    startTransition(async () => {
      const result = await adminOverrideActivate({ contractorId, reason })
      if ('error' in result) {
        setErrorMessage(result.error)
        return
      }
      setOpen(false)
      setReason('')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setReason(''); setErrorMessage(''); setOpen(true) }}
        className="text-xs text-amber-700 hover:text-amber-900 underline-offset-2 hover:underline"
      >
        Override and activate anyway
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-sage-800 mb-1">Admin override</h3>
            <p className="text-sm text-sage-600 mb-4">
              This will activate the worker without verifying the onboarding checklist or trial outcome. The reason below is captured in the audit log alongside which gate was bypassed.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              autoFocus
              placeholder="Reason for override (required)…"
              className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            {errorMessage && (
              <p className="text-xs text-red-600 mt-2">{errorMessage}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="px-4 py-2 rounded-lg text-sm text-sage-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={pending || !reason.trim()}
                className="bg-amber-600 text-white font-semibold px-5 py-2 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? 'Overriding…' : 'Override & activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
