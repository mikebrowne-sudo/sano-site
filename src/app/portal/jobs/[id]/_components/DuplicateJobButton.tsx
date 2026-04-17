'use client'

import { useTransition } from 'react'
import { duplicateJob } from '../../_actions'
import { Copy } from 'lucide-react'

export function DuplicateJobButton({ jobId }: { jobId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await duplicateJob(jobId)
      if (result?.error) {
        alert(result.error)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors disabled:opacity-50"
    >
      <Copy size={14} />
      {isPending ? 'Duplicating…' : 'Duplicate'}
    </button>
  )
}
