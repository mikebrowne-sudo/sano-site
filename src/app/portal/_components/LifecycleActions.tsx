'use client'

// Phase 5.5.13 — single-record lifecycle actions for quote/job/invoice
// detail pages. Three buttons:
//   · Mark as test — flips is_test + archives so the row drops out of
//                    live views immediately.
//   · Archive     — soft-archive (deleted_at = now) with no test flag.
//   · Restore     — unarchive; admin chooses whether to also clear
//                   is_test ("as live") via a confirm prompt.
//
// Renders in two compact rows depending on the current state. No
// modal — the destructive intent is low (every action is reversible
// via the others).

import { useState, useTransition } from 'react'
import { Archive, ArchiveRestore, FlaskConical, X } from 'lucide-react'
import {
  markAsTest,
  archiveRecords,
  restoreRecords,
  type LifecycleEntity,
} from '../_actions/lifecycle'

interface Props {
  entity: LifecycleEntity
  id: string
  isArchived: boolean
  isTest: boolean
}

export function LifecycleActions({ entity, id, isArchived, isTest }: Props) {
  const [pending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')
  const [flash, setFlash] = useState<'idle' | 'archived' | 'restored' | 'test'>('idle')

  function call(fn: () => Promise<{ ok: true; count: number } | { error: string }>, kind: 'archived' | 'restored' | 'test') {
    setErrorMessage('')
    startTransition(async () => {
      const r = await fn()
      if ('error' in r) { setErrorMessage(r.error); return }
      setFlash(kind)
      setTimeout(() => setFlash('idle'), 2000)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isArchived && !isTest && (
        <>
          <button
            type="button"
            onClick={() => call(() => markAsTest(entity, id), 'test')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <FlaskConical size={12} /> Mark as test
          </button>
          <button
            type="button"
            onClick={() => call(() => archiveRecords(entity, id), 'archived')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-sage-200 text-sage-700 px-3 py-1.5 rounded-lg hover:bg-sage-50 transition-colors disabled:opacity-50"
          >
            <Archive size={12} /> Archive
          </button>
        </>
      )}

      {isArchived && (
        <>
          <button
            type="button"
            onClick={() => call(() => restoreRecords(entity, id), 'restored')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <ArchiveRestore size={12} /> Restore
          </button>
          {isTest && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Restore as live? This clears the test flag and returns the record to operational views.')) {
                  call(() => restoreRecords(entity, id, { asLive: true }), 'restored')
                }
              }}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              <ArchiveRestore size={12} /> Restore as live
            </button>
          )}
        </>
      )}

      {isTest && !isArchived && (
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-2 py-0.5">
          <FlaskConical size={10} /> Test
        </span>
      )}

      {flash === 'test'     && <span className="text-xs text-amber-700">Marked as test.</span>}
      {flash === 'archived' && <span className="text-xs text-sage-700">Archived.</span>}
      {flash === 'restored' && <span className="text-xs text-emerald-700">Restored.</span>}
      {errorMessage && (
        <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
          <X size={11} /> {errorMessage}
        </span>
      )}
    </div>
  )
}
