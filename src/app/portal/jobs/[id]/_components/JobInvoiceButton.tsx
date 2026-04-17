'use client'

import { useState, useTransition } from 'react'
import { createInvoiceFromJob } from '../_actions'
import Link from 'next/link'
import { Receipt, FileOutput } from 'lucide-react'

export function JobInvoiceButton({
  jobId,
  invoiceId,
  hasJobPrice,
}: {
  jobId: string
  invoiceId: string | null
  hasJobPrice: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Already has invoice — show view link
  if (invoiceId) {
    return (
      <Link
        href={`/portal/invoices/${invoiceId}`}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
      >
        <Receipt size={16} />
        View Invoice
      </Link>
    )
  }

  // No job price — can't create invoice
  if (!hasJobPrice) {
    return (
      <span className="text-xs text-sage-400">
        Set a job price to create an invoice
      </span>
    )
  }

  // Ready to create
  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createInvoiceFromJob(jobId)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
      >
        <FileOutput size={16} />
        {isPending ? 'Creating…' : 'Create Invoice'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
