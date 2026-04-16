'use client'

import { useState, useTransition } from 'react'
import { regenerateShareToken } from '../_actions/regenerate-token'
import { RefreshCw } from 'lucide-react'

export function RegenerateShareLink({ table, id }: { table: 'quotes' | 'invoices'; id: string }) {
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleClick() {
    if (!confirm('This will invalidate the current share link. Any previously sent links will stop working. Continue?')) return

    startTransition(async () => {
      const result = await regenerateShareToken(table, id)
      if (!result?.error) {
        setDone(true)
        setTimeout(() => setDone(false), 3000)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-xs text-sage-500 hover:text-sage-700 transition-colors disabled:opacity-50"
    >
      <RefreshCw size={12} />
      {isPending ? 'Regenerating…' : done ? 'Link regenerated' : 'Regenerate share link'}
    </button>
  )
}
