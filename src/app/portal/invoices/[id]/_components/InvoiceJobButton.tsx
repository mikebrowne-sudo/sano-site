'use client'

import { useState, useTransition } from 'react'
import { createJobFromInvoice } from '../_actions-job'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'

export function InvoiceJobButton({
  invoiceId,
  linkedJobId,
}: {
  invoiceId: string
  linkedJobId: string | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (linkedJobId) {
    return (
      <Link
        href={`/portal/jobs/${linkedJobId}`}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
      >
        <Briefcase size={16} />
        View Job
      </Link>
    )
  }

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createJobFromInvoice(invoiceId)
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
        <Briefcase size={16} />
        {isPending ? 'Creating…' : 'Create Job'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
