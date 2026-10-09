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

/** One-click confirm of the row's best match. Details live in the tooltip and
 *  the row's Match column, so the button stays compact. Part payments are
 *  recorded against the invoice and leave it open with the balance owing. */
export function ConfirmMatch({ lineId, date, suggestion }: { lineId: string; date: string; suggestion: ConfirmSuggestion }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const detail = [
    suggestion.label,
    ...suggestion.numbers.map((n, i) => `${n}: ${fmt(suggestion.allocations[i]?.amount ?? 0)}`),
  ].join('\n')

  function confirm() {
    setError(null)
    startTransition(async () => {
      const r = await reconcileBankTransaction(lineId, suggestion.allocations, date)
      if (!r.ok) { setError(r.error ?? 'Could not save.'); return }
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={isPending}
      title={error ?? detail}
      className={
        error
          ? 'inline-flex h-7 items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-700'
          : 'inline-flex h-7 items-center gap-1 rounded-md bg-sage-500 px-2.5 text-xs font-semibold text-white hover:bg-sage-700 disabled:opacity-50'
      }
    >
      <Check size={13} /> {isPending ? 'Saving…' : error ? 'Retry' : 'Confirm'}
    </button>
  )
}
