'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { setInsuranceArrangement } from '../_actions'
import type { InsuranceArrangement } from '@/lib/contractor-setup-data'

type Mode = 'own_required' | 'covered_by_sano' | 'not_required' | 'pending_review'

/** Set the contractor's insurance arrangement. Choosing "covered by Sano" hides
 *  the contractor upload step entirely (records internal policy details, never
 *  exposed to the contractor). */
export function InsurancePanel({ contractorId, existing }: { contractorId: string; existing: InsuranceArrangement | null }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(existing?.mode ?? 'pending_review')
  const [sanoPolicyRef, setRef] = useState(existing?.sanoPolicyRef ?? '')
  const [insurer, setInsurer] = useState(existing?.insurer ?? '')
  const [coverLimit, setLimit] = useState<string>(existing?.coverLimit != null ? String(existing.coverLimit) : '')
  const [minCover, setMinCover] = useState<string>(existing?.minCover != null ? String(existing.minCover) : '')
  const [err, setErr] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function save() {
    setErr(null)
    startTransition(async () => {
      const res = await setInsuranceArrangement(contractorId, {
        mode,
        insurer: insurer || null,
        minCover: minCover ? Number(minCover) : null,
        sanoPolicyRef: sanoPolicyRef || null,
        coverLimit: coverLimit ? Number(coverLimit) : null,
      })
      if (res.error) { setErr(res.error); return }
      router.refresh()
    })
  }

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 w-full'

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {([
          ['covered_by_sano', 'Covered under Sano’s insurance'],
          ['own_required', 'Contractor must provide their own'],
          ['not_required', 'Insurance not required'],
          ['pending_review', 'Pending review'],
        ] as [Mode, string][]).map(([v, l]) => (
          <label key={v} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${mode === v ? 'border-sage-500 bg-sage-50' : 'border-sage-200'}`}>
            <input type="radio" name="insmode" checked={mode === v} onChange={() => setMode(v)} /> {l}
          </label>
        ))}
      </div>

      {mode === 'covered_by_sano' && (
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 space-y-2">
          <p className="text-[11px] text-emerald-700 flex items-center gap-1.5"><ShieldCheck size={13} /> No contractor upload required. Internal policy details only — never shown to the contractor.</p>
          <div className="grid sm:grid-cols-3 gap-2">
            <input className={input} placeholder="Sano policy reference" value={sanoPolicyRef} onChange={(e) => setRef(e.target.value)} />
            <input className={input} placeholder="Insurer" value={insurer} onChange={(e) => setInsurer(e.target.value)} />
            <input className={input} type="number" placeholder="Cover limit" value={coverLimit} onChange={(e) => setLimit(e.target.value)} />
          </div>
        </div>
      )}
      {mode === 'own_required' && (
        <div className="grid sm:grid-cols-2 gap-2">
          <input className={input} type="number" placeholder="Minimum cover required" value={minCover} onChange={(e) => setMinCover(e.target.value)} />
          <p className="text-[11px] text-sage-400 self-center">The contractor will be asked to upload their certificate on the secure link.</p>
        </div>
      )}

      {err && <p className="text-xs text-red-600">{err}</p>}
      <button type="button" onClick={save} disabled={isPending} className="bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
        {isPending ? 'Saving…' : 'Save insurance arrangement'}
      </button>
    </div>
  )
}
