'use client'

// Admin-only soft-delete button for commercial quotes.
//
// Two-step confirm flow:
//   1. Initial click reveals a confirmation panel ("Are you sure?").
//   2. First confirm calls softDeleteQuote. If the quote is linked to
//      invoices or jobs the action returns reason='linked_records';
//      we show those ids and expose a second "Delete anyway" button
//      that re-invokes the action with confirm_linked: true.
//   3. On success the user is redirected to /portal/quotes.
//
// Parent must only render this for admin users (user.email ===
// 'michael@sano.nz'); the server action also guards, so this is
// defence-in-depth.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import { softDeleteQuote } from '../../_actions-commercial'

interface LinkedRecords {
  invoice_ids: string[]
  job_ids: string[]
}

export function CommercialDeleteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const [stage, setStage] = useState<'idle' | 'confirm' | 'linked'>('idle')
  const [linked, setLinked] = useState<LinkedRecords | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function runDelete(confirmLinked: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await softDeleteQuote({ quote_id: quoteId, confirm_linked: confirmLinked })
      if ('ok' in result && result.ok) {
        router.push('/portal/quotes')
        router.refresh()
        return
      }
      if ('reason' in result && result.reason === 'linked_records' && result.linked) {
        setLinked({
          invoice_ids: result.linked.invoice_ids,
          job_ids: result.linked.job_ids,
        })
        setStage('linked')
        return
      }
      setError('error' in result ? result.error : 'Failed to delete quote.')
    })
  }

  if (stage === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStage('confirm')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 rounded-lg px-3 py-1.5"
      >
        <Trash2 size={14} />
        Delete quote
      </button>
    )
  }

  if (stage === 'confirm') {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
        <AlertTriangle size={14} className="text-red-700" />
        <span className="text-red-800 font-medium">Delete this commercial quote?</span>
        <span className="text-xs text-red-700">Soft-delete — can be restored from the audit log.</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => runDelete(false)}
          className="ml-2 bg-red-600 text-white font-medium px-3 py-1 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => { setStage('idle'); setError(null) }}
          className="text-red-700 hover:text-red-900 px-2 py-1 disabled:opacity-50"
        >
          Cancel
        </button>
        {error && <span className="ml-2 text-xs text-red-700">{error}</span>}
      </div>
    )
  }

  // stage === 'linked'
  const invCount = linked?.invoice_ids.length ?? 0
  const jobCount = linked?.job_ids.length ?? 0
  return (
    <div className="inline-flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm max-w-xl">
      <div className="flex items-center gap-2 text-amber-900 font-medium">
        <AlertTriangle size={14} />
        Quote is linked to {invCount} invoice{invCount === 1 ? '' : 's'} and {jobCount} job{jobCount === 1 ? '' : 's'}.
      </div>
      <div className="text-xs text-amber-900">
        Proceeding will soft-delete the quote and record the linked IDs in the audit trail.
        The invoices and jobs themselves will stay intact.
      </div>
      {linked && linked.invoice_ids.length > 0 && (
        <div className="text-[11px] text-amber-900">
          <span className="font-medium">Invoice IDs:</span> {linked.invoice_ids.join(', ')}
        </div>
      )}
      {linked && linked.job_ids.length > 0 && (
        <div className="text-[11px] text-amber-900">
          <span className="font-medium">Job IDs:</span> {linked.job_ids.join(', ')}
        </div>
      )}
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          disabled={isPending}
          onClick={() => runDelete(true)}
          className="bg-red-600 text-white font-medium px-3 py-1.5 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
        >
          {isPending ? 'Deleting…' : 'Delete anyway'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => { setStage('idle'); setLinked(null); setError(null) }}
          className="text-amber-900 hover:text-amber-950 px-2 py-1 disabled:opacity-50 text-sm"
        >
          Cancel
        </button>
      </div>
      {error && <span className="text-xs text-red-700 mt-1">{error}</span>}
    </div>
  )
}
