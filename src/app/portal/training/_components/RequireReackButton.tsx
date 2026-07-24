'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { requireModuleReacknowledgement } from '../_actions'

// Admin-only: after updating a module's content/version, explicitly require
// workers who acknowledged an older version to read and confirm it again.
export function RequireReackButton({ moduleId }: { moduleId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run() {
    setErr(null); setMsg(null)
    startTransition(async () => {
      const r = await requireModuleReacknowledgement(moduleId)
      if ('error' in r && r.error) { setErr(r.error); return }
      setConfirming(false)
      setMsg(`Re-acknowledgement required for ${r.flagged ?? 0} worker${r.flagged === 1 ? '' : 's'}.`)
      router.refresh()
    })
  }

  return (
    <div>
      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-1.5 border border-amber-300 text-amber-700 font-medium px-3 py-1.5 rounded-lg text-xs hover:bg-amber-50">
          <RefreshCw size={13} /> Require re-acknowledgement
        </button>
      ) : (
        <div className="inline-flex items-center gap-2">
          <span className="text-xs text-sage-600">Flag workers on an older version to re-acknowledge?</span>
          <button type="button" onClick={run} disabled={pending}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50">
            {pending ? 'Working…' : 'Confirm'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-xs text-sage-500 hover:text-sage-700">Cancel</button>
        </div>
      )}
      {msg && <p className="text-[11px] text-emerald-700 mt-1">{msg}</p>}
      {err && <p className="text-[11px] text-red-600 mt-1">{err}</p>}
    </div>
  )
}
