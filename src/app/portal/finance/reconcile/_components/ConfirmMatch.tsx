'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { reconcileBankTransaction } from '../_actions'

export interface ConfirmSuggestion {
  label: string
  allocations: Array<{ invoiceId: string; amount: number }>
  /** Invoice numbers, in allocation order, for display. */
  numbers: string[]
  partial: boolean
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}

/** The best match for a payment, confirmed in one click. Part payments are
 *  recorded against the invoice and leave it open with the balance owing. */
export function ConfirmMatch({ lineId, date, suggestion }: { lineId: string; date: string; suggestion: ConfirmSuggestion }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const shown = suggestion.numbers.length <= 2
    ? suggestion.numbers.join(' + ')
    : `${suggestion.numbers[0]} + ${suggestion.numbers.length - 1} more`

  function confirm() {
    setError(null)
    startTransition(async () => {
      const r = await reconcileBankTransaction(lineId, suggestion.allocations, date)
      if (!r.ok) { setError(r.error ?? 'Could not save.'); return }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span
          className="text-xs text-sage-600 whitespace-nowrap"
          title={`${suggestion.label}\n${suggestion.numbers.map((n, i) => `${n}: ${fmt(suggestion.allocations[i]?.amount ?? 0)}`).join('\n')}`}
        >
          {shown}{suggestion.partial && <span className="text-amber-600"> (part)</span>}
        </span>
        <button
          type="button"
          onClick={confirm}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded-md bg-sage-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sage-700 disabled:opacity-50"
        >
          <Check size={12} /> {isPending ? 'Saving…' : 'Confirm'}
        </button>
      </div>
      <span className="text-[11px] text-sage-400 max-w-[260px] truncate" title={suggestion.label}>{suggestion.label}</span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
