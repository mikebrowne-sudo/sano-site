'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Undo2 } from 'lucide-react'
import { reverseDebitLink } from '../_actions'

/** Undo a money-out link. The bank line reappears for reconciling; an expense
 *  the link auto-recorded (IRD payment, repeat bill) is removed with it. */
export function ReverseDebitLink({ linkId, label, createdExpense }: { linkId: string; label: string; createdExpense: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function undo() {
    const msg = createdExpense
      ? `Undo "${label}"? The expense it recorded will be removed and the bank line will need reconciling again.`
      : `Undo "${label}"? The bank line will need reconciling again.`
    if (!window.confirm(msg)) return
    setError(null)
    startTransition(async () => {
      const r = await reverseDebitLink(linkId, null)
      if (!r.ok) { setError(r.error ?? 'Could not undo.'); return }
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={undo} disabled={isPending} title="Undo this match" className="text-sage-400 hover:text-red-600 disabled:opacity-50">
        <Undo2 size={12} />
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </>
  )
}
