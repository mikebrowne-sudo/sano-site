'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock } from 'lucide-react'
import { confirmMyStatement } from '../_actions'

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

export function ConfirmSection({
  id,
  status,
  reviewDueAt,
  confirmedAt,
  confirmedSource,
}: {
  id: string
  status: string
  reviewDueAt: string | null
  confirmedAt: string | null
  confirmedSource: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  if (status === 'confirmed') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6 flex items-start gap-3">
        <CheckCircle2 size={18} className="text-emerald-600 mt-0.5" />
        <div className="text-sm text-emerald-800">
          <p className="font-semibold">Confirmed</p>
          <p>
            {confirmedSource === 'sano'
              ? `Confirmed by Sano on your behalf on ${fmtDate(confirmedAt)}.`
              : `You confirmed this statement on ${fmtDate(confirmedAt)}.`}
          </p>
        </div>
      </div>
    )
  }

  if (status !== 'issued') return null

  function confirm() {
    setErr(null)
    startTransition(async () => {
      const res = await confirmMyStatement(id)
      if (res.error) { setErr(res.error); return }
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-sage-200 bg-white shadow-sm p-5 mb-6">
      <div className="flex items-center gap-2 text-sm text-sage-600 mb-2">
        <Clock size={15} />
        <span>Please review by <strong>{fmtDate(reviewDueAt)}</strong></span>
      </div>
      <p className="text-sm text-sage-700 mb-3">
        Confirming tells Sano the hours and amounts look right to you. It isn’t a tax invoice or acceptance of one.
        If something looks wrong, please contact the Sano team instead of confirming.
      </p>
      <button
        onClick={confirm}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
      >
        <CheckCircle2 size={15} /> {isPending ? 'Confirming…' : 'Confirm statement'}
      </button>
      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mt-3">{err}</p>}
    </div>
  )
}
