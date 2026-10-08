'use client'

import { useState, useTransition } from 'react'
import { CreditCard } from 'lucide-react'
import { setInvoiceCardPayment } from '../_actions-card-payment'

export function CardPaymentToggle({ invoiceId, initial, hint }: { invoiceId: string; initial: boolean; hint: string }) {
  const [checked, setChecked] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(next: boolean) {
    setError(null)
    setChecked(next)
    startTransition(async () => {
      const res = await setInvoiceCardPayment(invoiceId, next)
      if ('error' in res) {
        setChecked(!next)
        setError(res.error)
      }
    })
  }

  return (
    <div className="mb-4">
      <label className="inline-flex items-center gap-2.5 text-sm text-sage-800 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          disabled={isPending}
          onChange={(e) => toggle(e.target.checked)}
          className="h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
        />
        <CreditCard size={15} className="text-sage-600" />
        Show &ldquo;Pay now&rdquo; (card) on this invoice
        <span className="text-xs text-sage-500">{hint}</span>
      </label>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
