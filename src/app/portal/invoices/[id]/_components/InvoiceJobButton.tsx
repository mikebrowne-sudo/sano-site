'use client'

import { useState, useTransition } from 'react'
import { createJobFromInvoice } from '../_actions-job'
import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import clsx from 'clsx'

const JOB_STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

export function InvoiceJobButton({
  invoiceId,
  linkedJob,
}: {
  invoiceId: string
  linkedJob: { id: string; job_number: string; status: string } | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (linkedJob) {
    return (
      <Link
        href={`/portal/jobs/${linkedJob.id}`}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
      >
        <Briefcase size={16} />
        {linkedJob.job_number}
        <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', JOB_STATUS_STYLES[linkedJob.status] ?? JOB_STATUS_STYLES.draft)}>
          {linkedJob.status.replace('_', ' ')}
        </span>
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
