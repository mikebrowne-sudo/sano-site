'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Plus } from 'lucide-react'
import { setInsuranceArrangement } from '../_actions'
import type { InsuranceArrangement } from '@/lib/contractor-setup-data'

type Mode = 'own_required' | 'covered_by_sano' | 'not_required' | 'pending_review'
const MODE_LABEL: Record<Mode, string> = {
  covered_by_sano: 'Covered under Sano’s insurance',
  own_required: 'Contractor provides their own',
  not_required: 'Not required',
  pending_review: 'Pending review',
}

/** Set the contractor's DEFAULT insurance arrangement plus optional per-schedule
 *  overrides. "Covered by Sano" hides the contractor upload step and keeps policy
 *  details internal. Each save supersedes the prior current row (history kept). */
export function InsurancePanel({ contractorId, existing, schedules, overrides }: {
  contractorId: string
  existing: InsuranceArrangement | null
  schedules: { id: string; name: string }[]
  overrides: InsuranceArrangement[]
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-2">Default arrangement</p>
        <ArrangementForm contractorId={contractorId} scope="contractor_default" existing={existing} />
      </div>

      <div className="border-t border-sage-100 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-2">Per-schedule overrides</p>
        {overrides.length > 0 && (
          <ul className="space-y-1 mb-3 text-sm">
            {overrides.map((o) => {
              const sch = schedules.find((s) => s.id === o.serviceScheduleId)
              return (
                <li key={o.id} className="flex items-center justify-between border border-sage-100 rounded-lg px-3 py-2">
                  <span className="text-sage-700">{sch?.name ?? 'Schedule'} — <span className="text-sage-500">{MODE_LABEL[o.mode]}</span></span>
                </li>
              )
            })}
          </ul>
        )}
        {schedules.length === 0 ? (
          <p className="text-xs text-sage-400">Add a service schedule first to set a per-schedule insurance override.</p>
        ) : (
          <OverrideAdder contractorId={contractorId} schedules={schedules} overrides={overrides} />
        )}
      </div>
    </div>
  )
}

function ArrangementForm({ contractorId, scope, serviceScheduleId, existing, onDone }: {
  contractorId: string
  scope: 'contractor_default' | 'schedule_override'
  serviceScheduleId?: string
  existing: InsuranceArrangement | null
  onDone?: () => void
}) {
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
        scope, serviceScheduleId,
        mode,
        insurer: insurer || null,
        minCover: minCover ? Number(minCover) : null,
        sanoPolicyRef: sanoPolicyRef || null,
        coverLimit: coverLimit ? Number(coverLimit) : null,
      })
      if (res.error) { setErr(res.error); return }
      onDone?.()
      router.refresh()
    })
  }

  const input = 'rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 w-full'

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {(Object.keys(MODE_LABEL) as Mode[]).map((v) => (
          <label key={v} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${mode === v ? 'border-sage-500 bg-sage-50' : 'border-sage-200'}`}>
            <input type="radio" checked={mode === v} onChange={() => setMode(v)} /> {MODE_LABEL[v]}
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
        {isPending ? 'Saving…' : 'Save arrangement'}
      </button>
    </div>
  )
}

function OverrideAdder({ contractorId, schedules, overrides }: {
  contractorId: string
  schedules: { id: string; name: string }[]
  overrides: InsuranceArrangement[]
}) {
  const [open, setOpen] = useState(false)
  const [scheduleId, setScheduleId] = useState(schedules[0]?.id ?? '')
  const overridden = new Set(overrides.map((o) => o.serviceScheduleId))
  const existing = overrides.find((o) => o.serviceScheduleId === scheduleId) ?? null

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sage-600 hover:text-sage-800 text-sm"><Plus size={14} /> Add per-schedule override</button>
  }
  return (
    <div className="border border-sage-200 rounded-xl p-4 space-y-3">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-sage-500">Service schedule</span>
        <select className="rounded-lg border border-sage-200 px-3 py-2 text-sm w-full" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
          {schedules.map((s) => <option key={s.id} value={s.id}>{s.name}{overridden.has(s.id) ? ' (has override)' : ''}</option>)}
        </select>
      </label>
      <ArrangementForm contractorId={contractorId} scope="schedule_override" serviceScheduleId={scheduleId} existing={existing} onDone={() => setOpen(false)} />
    </div>
  )
}
