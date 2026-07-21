'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { generateDraftStatements } from '../_actions'

interface PeriodOption {
  value: string // "period_start|period_end"
  label: string
}

export function GeneratePanel({ periods, selected }: { periods: PeriodOption[]; selected: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [ps, pe] = selected.split('|')

  function onPeriodChange(value: string) {
    const [nps, npe] = value.split('|')
    router.push(`/portal/contractor-statements?ps=${nps}&pe=${npe}`)
  }

  function generate() {
    setMsg(null)
    setErr(null)
    startTransition(async () => {
      const res = await generateDraftStatements({ period_start: ps, period_end: pe })
      if (res.error) { setErr(res.error); return }
      const parts: string[] = []
      if (res.created) parts.push(`${res.created} created`)
      if (res.refreshed) parts.push(`${res.refreshed} refreshed`)
      if (res.linked_cis) parts.push(`${res.linked_cis} payables linked`)
      if (!parts.length) parts.push('no new eligible payables — nothing changed')
      if (res.skipped?.length) parts.push(`${res.skipped.length} left untouched (past draft)`)
      setMsg(parts.join(' · '))
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <label className="block flex-1 max-w-xs">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Closed period</span>
          <div className="relative">
            <select
              value={selected}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-2.5 pr-10 text-sage-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500"
            >
              {periods.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 pointer-events-none" />
          </div>
        </label>
        <button
          onClick={generate}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
          {isPending ? 'Generating…' : 'Generate / refresh drafts'}
        </button>
      </div>
      <p className="text-xs text-sage-400 mt-2">
        Prepares staff-only draft statements by grouping this period&rsquo;s approved, unpaid payables per contractor.
        Refreshing adds newly eligible payables without removing existing lines. Nothing is issued or sent.
      </p>
      {msg && <p className="text-sm text-sage-700 bg-sage-50 rounded-lg px-4 py-2 mt-3">{msg}</p>}
      {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mt-3">{err}</p>}
    </div>
  )
}
