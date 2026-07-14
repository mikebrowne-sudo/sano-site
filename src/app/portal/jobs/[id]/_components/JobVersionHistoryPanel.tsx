'use client'

// Job version history — a reversible record of every amendment. Each row is
// the job as it was BEFORE that edit; admins can restore any version (which
// itself snapshots the current state first, so restores are reversible too).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { History, RotateCcw, ShieldAlert } from 'lucide-react'
import { restoreJobVersion } from '../_actions-restore'
import { JOB_FIELD_LABELS, type JobTrackedField } from '@/lib/job-versions'

interface JobVersionRow {
  id: string
  version_no: number
  changed_fields: string[] | null
  reason: string | null
  is_restore: boolean
  actor_email: string | null
  created_at: string
}

function fmtWhen(iso: string) {
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function labelFor(field: string) {
  return JOB_FIELD_LABELS[field as JobTrackedField] ?? field
}

export function JobVersionHistoryPanel({
  versions,
  jobId,
  isAdmin,
}: {
  versions: JobVersionRow[]
  jobId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!versions || versions.length === 0) return null

  function handleRestore(versionId: string) {
    setPendingId(versionId)
    setError(null)
    startTransition(async () => {
      const result = await restoreJobVersion({ jobId, versionId })
      setPendingId(null)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History size={16} className="text-sage-500" />
        <h2 className="text-lg font-semibold text-sage-800">Edit history</h2>
        <span className="text-xs text-sage-500">({versions.length})</span>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <ol className="space-y-2.5">
        {versions.map((v) => {
          const changed = (v.changed_fields ?? []).map(labelFor)
          return (
            <li key={v.id} className="border border-sage-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sage-800 text-sm">v{v.version_no}</span>
                    {v.is_restore && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        <RotateCcw size={10} /> Restore point
                      </span>
                    )}
                    <span className="text-xs text-sage-500">{fmtWhen(v.created_at)}</span>
                    {v.actor_email && <span className="text-xs text-sage-400">· {v.actor_email}</span>}
                  </div>

                  {changed.length > 0 && (
                    <p className="text-xs text-sage-600 mt-1">
                      Changed: {changed.join(', ')}
                    </p>
                  )}

                  {v.reason && (
                    <p className="text-xs text-sage-700 mt-1 inline-flex items-start gap-1">
                      <ShieldAlert size={12} className="text-amber-600 shrink-0 mt-0.5" />
                      <span className="italic">{v.reason}</span>
                    </p>
                  )}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRestore(v.id)}
                    disabled={pendingId !== null}
                    className="inline-flex items-center gap-1.5 text-xs bg-sage-100 hover:bg-sage-200 text-sage-800 font-medium px-2.5 py-1 rounded transition-colors disabled:opacity-50 shrink-0"
                    title="Restore the job to this earlier state"
                  >
                    <RotateCcw size={12} />
                    {pendingId === v.id ? 'Restoring…' : 'Restore'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-3 text-[11px] text-sage-400">
        Each entry is the job as it was <em>before</em> that edit. Restoring reverts the job to that
        state and is itself recorded here, so nothing is ever lost.
      </p>
    </div>
  )
}
