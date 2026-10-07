'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { setCleared } from '../_actions'

/**
 * Tick a line off without matching it (an owner transfer, an IRD refund, a
 * line handled elsewhere) — or put it back on the list. `menu` renders as an
 * item inside the row's "⋯" menu; `button` as the row's primary action (used
 * when ticking off IS the right answer, e.g. an IRD refund).
 */
export function ClearToggle({ id, cleared, variant = 'menu' }: { id: string; cleared: boolean; variant?: 'menu' | 'button' }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await setCleared(id, !cleared)
      router.refresh()
    })
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-xs font-semibold text-sage-700 hover:border-sage-300 hover:bg-sage-50 disabled:opacity-50 whitespace-nowrap"
      >
        <CheckCircle2 size={13} /> {isPending ? 'Saving…' : 'Tick off'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm text-sage-700 hover:bg-sage-50 disabled:opacity-50"
    >
      {cleared ? <RotateCcw size={14} className="text-sage-400" /> : <CheckCircle2 size={14} className="text-sage-400" />}
      {isPending ? 'Saving…' : cleared ? 'Put back on the list' : 'Tick off — no match needed'}
    </button>
  )
}
