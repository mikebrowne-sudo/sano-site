'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { recordIrdPayment } from '../../_actions-ird-liability'

export function RecordIrdPaymentForm({ liabilityId, outstanding }: { liabilityId: string; outstanding: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState('')
  const [amount, setAmount] = useState(outstanding > 0 ? outstanding.toFixed(2) : '')
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState<string | null>(null)

  function submit() {
    setErr(null)
    startTransition(async () => {
      const res = await recordIrdPayment({ liabilityId, paymentDate: date, amount: Number(amount), irdReference: ref || undefined, notes: notes || undefined })
      if (res.error) { setErr(res.error); return }
      setOpen(false); setRef(''); setNotes(''); router.refresh()
    })
  }

  const input = 'rounded border border-sage-200 px-2 py-1.5 text-sm'
  if (!open) return <button onClick={() => setOpen(true)} className="text-sm font-medium text-sage-700 border border-sage-200 rounded-lg px-3 py-1.5 hover:bg-sage-50">Record IRD payment</button>

  return (
    <div className="mt-2 grid grid-cols-2 gap-2 max-w-md">
      <p className="col-span-2 text-[11px] text-sage-500">Records a payment made to IRD. Partial payments are fine — the period clears only when fully paid.</p>
      <label className="flex flex-col gap-1"><span className="text-[10px] text-sage-500">Payment date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} /></label>
      <label className="flex flex-col gap-1"><span className="text-[10px] text-sage-500">Amount $</span><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} /></label>
      <label className="flex flex-col gap-1"><span className="text-[10px] text-sage-500">IRD reference</span><input value={ref} onChange={(e) => setRef(e.target.value)} className={input} /></label>
      <label className="flex flex-col gap-1"><span className="text-[10px] text-sage-500">Notes</span><input value={notes} onChange={(e) => setNotes(e.target.value)} className={input} /></label>
      <div className="col-span-2 flex gap-2">
        <button disabled={isPending} onClick={submit} className="bg-sage-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">{isPending ? 'Saving…' : 'Save payment'}</button>
        <button disabled={isPending} onClick={() => setOpen(false)} className="border border-sage-200 text-sage-700 px-4 py-1.5 rounded-lg text-sm">Cancel</button>
      </div>
      {err && <p className="col-span-2 text-sm text-red-600">{err}</p>}
    </div>
  )
}
