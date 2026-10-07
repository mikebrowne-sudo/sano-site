'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { Trash2 } from 'lucide-react'
import { deleteEmploymentAgreement } from '../_actions'

/**
 * Delete an agreement (admin only). Signed agreements are refused server-side
 * (they're records — void instead). Confirm-first. `variant` picks the look:
 * a compact trash icon for list rows, a labelled button for the detail page.
 */
export function DeleteAgreementButton({
  agreementId,
  variant = 'row',
  redirectTo,
}: {
  agreementId: string
  variant?: 'row' | 'full'
  redirectTo?: string
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function doDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteEmploymentAgreement(agreementId)
      if (res?.error) { setError(res.error); setConfirming(false) }
      else if (redirectTo) router.push(redirectTo)
      else router.refresh()
    })
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true) }}
        className={clsx('inline-flex items-center gap-1 text-sage-400 hover:text-red-600 transition-colors', variant === 'full' ? 'text-sm font-medium' : 'text-[11px]')}
        title="Delete agreement"
      >
        <Trash2 size={variant === 'full' ? 15 : 13} />
        {variant === 'full' && 'Delete agreement'}
      </button>
    )
  }

  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => { e.preventDefault(); e.stopPropagation() }}>
      <span className="text-[11px] text-sage-600">Delete?</span>
      <button type="button" disabled={isPending} onClick={doDelete}
        className={clsx('text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded', isPending && 'opacity-60')}>
        {isPending ? '…' : 'Yes'}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-[11px] text-sage-500 hover:text-sage-700">Cancel</button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  )
}
