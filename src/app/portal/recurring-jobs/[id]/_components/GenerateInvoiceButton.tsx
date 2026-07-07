'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Loader2 } from 'lucide-react'
import { generateRecurringInvoice } from '../../_actions-invoice'

export function GenerateInvoiceButton({ recurringId }: { recurringId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function run() {
    setMsg(null)
    startTransition(async () => {
      const res = await generateRecurringInvoice(recurringId)
      if (res.error) setMsg(res.error)
      else if (res.invoiceId) {
        setMsg(res.sent ? 'Invoice created and emailed to the client.' : 'Draft invoice created — find it under Invoices / your To-do.')
        router.refresh()
      }
      else setMsg(res.skipped ? `Nothing generated (${res.skipped}).` : 'Nothing to generate.')
    })
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-50 disabled:opacity-50"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <Receipt size={15} />}
        {isPending ? 'Generating…' : 'Generate invoice now'}
      </button>
      {msg && <span className="text-xs text-sage-500">{msg}</span>}
    </div>
  )
}
