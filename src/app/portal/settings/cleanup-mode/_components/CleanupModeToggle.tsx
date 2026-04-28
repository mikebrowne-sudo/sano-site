'use client'

// Phase 5.5.14 — Cleanup-mode toggle (admin only).
//
// Single switch. Saves immediately via setCleanupMode (no Save button)
// because there's only one field — a Save step would just add friction.
// Inline status feedback under the toggle.

import { useState, useTransition } from 'react'
import { setCleanupMode } from '../_actions'
import { AlertTriangle, Loader2 } from 'lucide-react'

export function CleanupModeToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<null | { kind: 'ok' | 'error'; text: string }>(null)

  function flip(next: boolean) {
    // Optimistic update — flip immediately so the operator sees their
    // intent reflected, then revert on server-side rejection.
    setEnabled(next)
    setFeedback(null)
    startTransition(async () => {
      const r = await setCleanupMode(next)
      if ('error' in r) {
        setEnabled(!next)
        setFeedback({ kind: 'error', text: r.error })
        return
      }
      setFeedback({
        kind: 'ok',
        text: next ? 'Cleanup mode enabled.' : 'Cleanup mode disabled.',
      })
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-sage-800">Cleanup mode</h2>
          <p className="text-sm text-sage-600 mt-1">
            Master gate for the operational lifecycle controls — Mark as
            test, Archive, Restore, and the bulk-action bar on every list
            page. The same gate is enforced server-side, so turning this
            off blocks the API even for admins.
          </p>
        </div>
      </div>

      <label className="flex items-start gap-4 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable Cleanup Mode"
          onClick={() => flip(!enabled)}
          disabled={pending}
          className={
            (enabled ? 'bg-amber-500' : 'bg-sage-200') +
            ' relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors mt-0.5 disabled:opacity-60'
          }
        >
          <span
            className={
              (enabled ? 'translate-x-5' : 'translate-x-1') +
              ' inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
            }
          />
        </button>
        <span>
          <span className="block text-sm font-semibold text-sage-800">
            Enable Cleanup Mode
          </span>
          <span className="block text-xs text-sage-500 leading-relaxed mt-0.5">
            <strong className="text-sage-700">OFF (default):</strong> system runs as a normal operational tool — no checkboxes, no Mark-as-test / Archive / Restore. The Show archived/test toggle is hidden too.
            <br />
            <strong className="text-sage-700">ON:</strong> admin-only controls appear on every list and detail page; bulk actions become available.
          </span>
        </span>
      </label>

      <div className="mt-4 flex items-center gap-2 text-xs">
        {pending && (
          <span className="inline-flex items-center gap-1 text-sage-500">
            <Loader2 size={12} className="animate-spin" /> Saving…
          </span>
        )}
        {!pending && feedback?.kind === 'ok' && (
          <span className="text-emerald-700 font-medium">{feedback.text}</span>
        )}
        {!pending && feedback?.kind === 'error' && (
          <span className="text-red-700 font-medium">{feedback.text}</span>
        )}
      </div>
    </div>
  )
}
