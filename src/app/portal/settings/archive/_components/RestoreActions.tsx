'use client'

// Phase 6 — restore controls used on the Archived Records page.
// One-click restore for both quote and invoice rows; the server actions
// take care of audit + revalidation.

import { useTransition, useState } from 'react'
import { restoreQuote, restoreInvoice } from '../../../_actions/archive'
import { useRouter } from 'next/navigation'
import { ArchiveRestore } from 'lucide-react'

function Button({
  isPending, error, onClick, children,
}: {
  isPending: boolean
  error: string | null
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 bg-sage-100 hover:bg-sage-200 text-sage-800 font-medium px-3 py-1.5 rounded-md text-xs transition-colors disabled:opacity-50"
      >
        <ArchiveRestore size={12} />
        {isPending ? 'Restoring…' : children}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  )
}

export function RestoreQuoteAction({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const result = await restoreQuote({ quote_id: quoteId })
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return <Button isPending={isPending} error={error} onClick={handleRestore}>Restore</Button>
}

export function RestoreInvoiceAction({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const result = await restoreInvoice({ invoice_id: invoiceId })
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return <Button isPending={isPending} error={error} onClick={handleRestore}>Restore</Button>
}
