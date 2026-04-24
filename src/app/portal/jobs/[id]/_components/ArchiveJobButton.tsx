'use client'

// Phase D.2 — admin-only "Archive job" control. Soft-deletes the job
// (sets deleted_at + deleted_by, snapshots the row, writes audit_log).
// Intentionally simpler than ArchiveQuoteButton — jobs don't have the
// versioning / linked-invoice warnings that quotes do, so a single
// confirmation dialog is enough.
//
// Restore lives on /portal/settings/archive where archived jobs are
// listed with their restore button.

import { useState, useTransition } from 'react'
import { archiveJob } from '../../../_actions/archive'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

export function ArchiveJobButton({
  jobId,
  jobNumber,
}: {
  jobId: string
  jobNumber: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      const result = await archiveJob({ job_id: jobId })
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      router.push('/portal/jobs')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-colors"
      >
        <Trash2 size={12} />
        Delete
      </button>
    )
  }

  return (
    <div className="bg-white border border-red-200 rounded-lg p-4 space-y-3 w-full max-w-md shadow-sm">
      <div>
        <p className="text-sm font-semibold text-sage-800">
          Delete job {jobNumber}?
        </p>
        <p className="text-sm text-sage-600 mt-1">
          This can be restored later from Settings → Archive.
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-xs">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleArchive}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Deleting…' : 'Delete Job'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="text-sm text-sage-600 hover:text-sage-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
