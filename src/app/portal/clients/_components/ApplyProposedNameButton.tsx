'use client'

// One-record, explicit "Apply proposed account name" for a branch-style
// account (e.g. Barfoot & Thompson / Ellerslie → "Barfoot & Thompson -
// Ellerslie", company cleared). Two-step confirm; audited server-side.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2, Check, Loader2, AlertCircle } from 'lucide-react'
import { applyProposedAccountName } from '../_actions-cleanup'

export function ApplyProposedNameButton({
  clientId,
  proposedName,
}: {
  clientId: string
  proposedName: string
}) {
  const router = useRouter()
  const [armed, setArmed] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
        <Check size={15} /> Renamed to “{done}”.
      </span>
    )
  }

  function apply() {
    setErr(null)
    startTransition(async () => {
      const res = await applyProposedAccountName(clientId)
      if ('error' in res) { setErr(res.error); setArmed(false); return }
      setDone(res.name)
      router.refresh()
    })
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      {!armed ? (
        <button type="button" onClick={() => { setErr(null); setArmed(true) }}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Wand2 size={15} /> Apply proposed name
        </button>
      ) : (
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-sage-600">Rename to “{proposedName}”?</span>
          <button type="button" onClick={apply} disabled={pending}
            className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-medium px-3 py-1.5 rounded-md text-sm hover:bg-sage-700 disabled:opacity-50">
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {pending ? 'Applying…' : 'Apply'}
          </button>
          <button type="button" onClick={() => setArmed(false)} disabled={pending}
            className="text-xs text-sage-500 hover:text-sage-700">Cancel</button>
        </div>
      )}
      {err && <span className="inline-flex items-start gap-1 text-xs text-red-600 max-w-[260px]"><AlertCircle size={12} className="mt-0.5 shrink-0" /> {err}</span>}
    </div>
  )
}
