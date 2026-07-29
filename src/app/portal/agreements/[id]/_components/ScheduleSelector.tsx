'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { setAgreementScheduleSelection } from '../../_actions'

export interface EligibleSchedule {
  id: string
  name: string
  status: string
  paymentMethod: string | null
  paymentBasis: string | null
  agreedAmount: number | null
}

/** Staff pick which eligible (draft/active) schedules this agreement covers.
 *  Selection drives what gets snapshotted on send — nothing is auto-included. */
export function ScheduleSelector({ agreementId, eligible, selectedIds }: {
  agreementId: string
  eligible: EligibleSchedule[]
  selectedIds: string[]
}) {
  const router = useRouter()
  const [sel, setSel] = useState<Set<string>>(new Set(selectedIds))
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setSel((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
    setSaved(false)
  }

  function save() {
    setErr(null)
    startTransition(async () => {
      const res = await setAgreementScheduleSelection(agreementId, Array.from(sel))
      if (res.error) { setErr(res.error); return }
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-sage-200 bg-white p-5 mb-6">
      <p className="text-sm font-semibold text-sage-800 mb-1">Schedules on this agreement</p>
      <p className="text-[11px] text-sage-400 mb-3">Select which of this contractor&rsquo;s arrangements this agreement covers. Only selected schedules are shown to the contractor and frozen when you send. Nothing is included automatically.</p>

      {eligible.length === 0 ? (
        <p className="text-sm text-sage-400">No eligible (draft or active) schedules for this contractor. Add one in the contractor&rsquo;s Setup.</p>
      ) : (
        <ul className="space-y-1.5">
          {eligible.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-3 rounded-lg border border-sage-100 px-3 py-2 cursor-pointer hover:bg-sage-50/50">
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} className="rounded border-sage-300" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-sage-800">{s.name}</span>
                  <span className="text-[11px] text-sage-400 ml-2">{s.status}</span>
                  <span className="block text-xs text-sage-500">
                    {s.paymentMethod ?? '—'}{s.paymentBasis === 'guaranteed_net' ? ' · guaranteed net' : ' · gross fee'}
                    {s.agreedAmount != null && ` · ${formatCurrency(s.agreedAmount)}`}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-3 mt-3">
        <button type="button" onClick={save} disabled={isPending} className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          <Check size={15} /> {isPending ? 'Saving…' : 'Save selection'}
        </button>
        {saved && <span className="text-xs text-emerald-700">Saved — {sel.size} schedule{sel.size === 1 ? '' : 's'} selected.</span>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  )
}
