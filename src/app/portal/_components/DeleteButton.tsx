'use client'

import { useState, useTransition } from 'react'
import { deleteQuote, deleteInvoice, deleteClient } from '../_actions/delete-record'
import { Trash2 } from 'lucide-react'

export function DeleteButton({
  type,
  id,
}: {
  type: 'quote' | 'invoice' | 'client'
  id: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = type === 'quote'
        ? await deleteQuote(id)
        : type === 'invoice'
        ? await deleteInvoice(id)
        : await deleteClient(id)

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

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <p className="text-sm text-red-800 font-medium">
        Are you sure you want to delete this {type}?
      </p>
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
