'use client'

import { useState, useTransition } from 'react'
import { CreditCard } from 'lucide-react'
import { setClientCardPayment } from '../_actions-card-payment'

export function ClientCardPaymentToggle({ clientId, initial }: { clientId: string; initial: boolean }) {
  const [checked, setChecked] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(next: boolean) {
    setError(null)
    setChecked(next)
    startTransition(async () => {
      const res = await setClientCardPayment(clientId, next)
      if ('error' in res) {
        setChecked(!next)
        setError(res.error)
      }
    })
  }

  return (
    <div className="mt-6 max-w-2xl rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={checked}
          disabled={isPending}
          onChange={(e) => toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
        />
        <span>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-sage-800">
            <CreditCard size={15} className="text-sage-600" />
            Always show &ldquo;Pay now&rdquo; (card) on this customer&apos;s invoices
          </span>
          <span className="block text-xs text-sage-500 mt-0.5">
            Includes on-account invoices. You can still switch it off on a single invoice.
          </span>
        </span>
      </label>
      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  )
}
