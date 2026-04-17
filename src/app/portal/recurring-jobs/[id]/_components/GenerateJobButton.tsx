'use client'

import { useState, useTransition } from 'react'
import { generateNextJob } from '../../_actions'
import { Plus, CheckCircle } from 'lucide-react'
import Link from 'next/link'

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function GenerateJobButton({ recurringId, nextDueDate }: { recurringId: string; nextDueDate: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ jobId: string; jobNumber: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const res = await generateNextJob(recurringId)
      if (res?.error) {
        setError(res.error)
      } else if (res?.jobId) {
        setResult({ jobId: res.jobId, jobNumber: res.jobNumber! })
      }
    })
  }

  if (result) {
    return (
      <Link
        href={`/portal/jobs/${result.jobId}`}
        className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-emerald-100 transition-colors"
      >
        <CheckCircle size={14} />
        {result.jobNumber} created
      </Link>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
      >
        <Plus size={14} />
        {isPending ? 'Generating…' : `Generate Job${nextDueDate ? ` — ${fmtDate(nextDueDate)}` : ''}`}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
