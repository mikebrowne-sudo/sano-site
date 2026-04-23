'use client'

// Phase 6 — admin-only "Archive invoice" control. Mirror of
// ArchiveQuoteButton with the linked-records check scoped to jobs only
// (no further downstream entities for invoices today).

import { useState, useTransition } from 'react'
import { archiveInvoice } from '../../../_actions/archive'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'

const RISKY_STATUSES = new Set(['sent', 'paid', 'overdue'])

export function ArchiveInvoiceButton({
  invoiceId,
  invoiceNumber,
  invoiceStatus,
}: {
  invoiceId: string
  invoiceNumber: string
  invoiceStatus: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmLinked, setConfirmLinked] = useState(false)
  const [linkedWarning, setLinkedWarning] = useState<{ job_ids: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isRisky = RISKY_STATUSES.has(invoiceStatus)

  function handleArchive() {
    setError(null)
    startTransition(async () => {
      const result = await archiveInvoice({
        invoice_id: invoiceId,
        confirm_linked: confirmLinked,
      })
      if ('error' in result && result.error) {
        if ('reason' in result && result.reason === 'linked_records' && 'linked' in result && result.linked) {
          setLinkedWarning(result.linked)
          return
        }
        setError(result.error)
        return
      }
      router.push('/portal/invoices')
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-colors"
      >
        <Trash2 size={14} />
        Archive
      </button>
    )
  }

  return (
    <div className="bg-white border border-red-200 rounded-xl p-5 max-w-md w-full">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={18} className="text-red-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-sage-800">Archive {invoiceNumber}?</h3>
          <p className="text-xs text-sage-600 mt-1">
            The invoice will be hidden from the active list. You can restore it any time
            from <strong>Settings → Archived Records</strong>.
          </p>
        </div>
      </div>

      {isRisky && !linkedWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-900">
          This invoice is <strong>{invoiceStatus}</strong>. Archiving doesn&apos;t notify the customer
          and the existing share link continues to work. Use this for typos or
          duplicates — for cancelled work, set status to Cancelled first.
        </div>
      )}

      {linkedWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-xs text-red-900 space-y-1">
          <div className="font-semibold">This invoice is linked to other records:</div>
          {linkedWarning.job_ids.length > 0 && (
            <div>{linkedWarning.job_ids.length} job(s)</div>
          )}
          <div className="pt-1">
            Linked jobs will <strong>not</strong> be archived. Tick below to acknowledge and proceed.
          </div>
        </div>
      )}

      {linkedWarning && (
        <label className="flex items-start gap-2 text-xs text-sage-800 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmLinked}
            onChange={(e) => setConfirmLinked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-sage-300 text-red-600 focus:ring-red-500"
          />
          <span>I understand this invoice has linked records. Archive it anyway.</span>
        </label>
      )}

      {error && <p className="text-red-600 text-xs bg-red-50 rounded-md px-2.5 py-1.5 mb-3">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleArchive}
          disabled={isPending || (!!linkedWarning && !confirmLinked)}
          className={clsx(
            'inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-md text-xs transition-colors disabled:opacity-50',
            'bg-red-600 text-white hover:bg-red-700',
          )}
        >
          <Trash2 size={12} />
          {isPending ? 'Archiving…' : 'Archive Invoice'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setLinkedWarning(null); setConfirmLinked(false); setError(null) }}
          className="text-xs text-sage-600 hover:text-sage-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
