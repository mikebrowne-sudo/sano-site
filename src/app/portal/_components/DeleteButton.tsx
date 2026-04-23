'use client'

// Hard-delete control kept for clients / jobs / contractors only.
// Quotes and invoices switched to soft-delete (archive) in Phase 6 —
// see ArchiveQuoteButton + ArchiveInvoiceButton.

import { useState, useTransition } from 'react'
import {
  deleteClient,
  deleteJob,
  deleteContractor,
} from '../_actions/delete-record'
import { Trash2 } from 'lucide-react'

type DeleteType = 'client' | 'job' | 'contractor'

const CONFIRM_HEADLINE: Partial<Record<DeleteType, string>> = {
  job: 'This will permanently delete this job.',
  contractor: 'This will permanently delete this contractor.',
}

export function DeleteButton({ type, id }: { type: DeleteType; id: string }) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result =
        type === 'client' ? await deleteClient(id)
        : type === 'job' ? await deleteJob(id)
        : await deleteContractor(id)

      if (result?.error) {
        setError(result.error)
        setConfirming(false)
      }
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs text-sage-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={13} />
        Delete
      </button>
    )
  }

  const headline = CONFIRM_HEADLINE[type] ?? `Are you sure you want to delete this ${type}?`

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <p className="text-sm text-red-800 font-medium">{headline}</p>
      <p className="text-xs text-red-600">This action cannot be undone.</p>
      {error && <p className="text-xs text-red-600 bg-red-100 rounded px-2 py-1">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 bg-red-600 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} />
          {isPending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-sage-600 hover:text-sage-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
