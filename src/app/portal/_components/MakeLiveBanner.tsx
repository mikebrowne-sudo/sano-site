'use client'

// Admin "Make live" control shown on a quote/invoice detail page when the
// record is hidden from the active list — flagged as test and/or archived.
// Uses the admin-only restore actions (NOT cleanup-mode gated), so it's always
// available to an admin viewing a hidden record. Clears both the test and
// archive flags and returns the record to the live list.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArchiveRestore, FlaskConical } from 'lucide-react'
import { restoreQuote, restoreInvoice } from '../_actions/archive'

export function MakeLiveBanner({
  entity,
  id,
  isTest,
  isArchived,
}: {
  entity: 'quote' | 'invoice'
  id: string
  isTest: boolean
  isArchived: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!isTest && !isArchived) return null

  const reason = isTest && isArchived
    ? 'marked as test and archived'
    : isTest ? 'marked as a test record' : 'archived'

  function makeLive() {
    setError(null)
    startTransition(async () => {
      const r = entity === 'quote'
        ? await restoreQuote({ quote_id: id })
        : await restoreInvoice({ invoice_id: id })
      if ('error' in r && r.error) { setError(r.error); return }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-4">
      <p className="flex items-center gap-2 text-sm text-amber-800">
        <FlaskConical size={15} className="shrink-0" />
        This {entity} is {reason}, so it’s hidden from the active list.
        {error && <span className="ml-1 text-red-700">· {error}</span>}
      </p>
      <button
        type="button"
        onClick={makeLive}
        disabled={pending}
        className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-500 text-white font-semibold px-3.5 py-2 rounded-lg text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50"
      >
        <ArchiveRestore size={14} /> {pending ? 'Making live…' : 'Make live'}
      </button>
    </div>
  )
}
