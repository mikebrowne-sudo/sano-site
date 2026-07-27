'use client'

// Employee pay terms — current version + full history + an admin form to record
// a new effective-dated version (e.g. increasing hours). Saving never edits the
// current row; it creates a new version and closes the old one. Historical pay
// runs keep their own snapshot, so past pay is never altered.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { saveEmployeePayTerms } from '../_actions-pay-terms'

export interface PayTermsVersion {
  id: string
  standardWeeklyHours: number
  hourlyRate: number
  workingPattern: string | null
  payFrequency: string
  payday: string
  basis: string
  effectiveFrom: string
  effectiveTo: string | null
}

function money(n: number) { return `$${n.toFixed(2)}` }
function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PayTermsPanel({ workerId, isAdmin, versions }: { workerId: string; isAdmin: boolean; versions: PayTermsVersion[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)

  const current = versions.find((v) => v.effectiveTo == null) ?? versions[0] ?? null
  const history = versions.filter((v) => v.id !== current?.id)

  const [f, setF] = useState({
    standardWeeklyHours: String(current?.standardWeeklyHours ?? 20),
    hourlyRate: String(current?.hourlyRate ?? 30),
    workingPattern: current?.workingPattern ?? '',
    payFrequency: current?.payFrequency ?? 'weekly',
    payday: current?.payday ?? 'monday',
    basis: current?.basis ?? 'advance',
    effectiveFrom: '',
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  function save() {
    setMsg(null)
    startTransition(async () => {
      const res = await saveEmployeePayTerms({
        workerId,
        standardWeeklyHours: Number(f.standardWeeklyHours),
        hourlyRate: Number(f.hourlyRate),
        workingPattern: f.workingPattern || null,
        payFrequency: f.payFrequency as 'weekly' | 'fortnightly',
        payday: f.payday,
        basis: f.basis as 'advance' | 'arrears',
        effectiveFrom: f.effectiveFrom,
      })
      if (res.error) { setMsg({ kind: 'error', text: res.error }); return }
      setMsg({ kind: 'ok', text: 'New pay-terms version saved.' })
      router.refresh()
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const lbl = 'text-[11px] font-medium text-sage-500'

  return (
    <div>
      {current ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div><span className="text-sage-500">Standard hours</span><p className="text-sage-800 font-medium">{current.standardWeeklyHours}/week</p></div>
          <div><span className="text-sage-500">Rate</span><p className="text-sage-800 font-medium">{money(current.hourlyRate)}/hr</p></div>
          <div><span className="text-sage-500">Pay cycle</span><p className="text-sage-800 font-medium capitalize">{current.payFrequency} · {current.basis}</p></div>
          <div className="sm:col-span-3"><span className="text-sage-500">Working pattern</span><p className="text-sage-800 font-medium">{current.workingPattern || '—'}</p></div>
          <div className="sm:col-span-3"><span className="text-sage-400 text-[11px]">Current since {fmt(current.effectiveFrom)} · payday {current.payday}</span></div>
        </div>
      ) : (
        <p className="text-sage-500 text-sm">No pay terms on file yet.</p>
      )}

      {history.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-sage-600">Version history ({history.length})</summary>
          <div className="mt-2 space-y-1">
            {history.sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1)).map((v) => (
              <div key={v.id} className="text-xs text-sage-600 bg-sage-50 rounded px-3 py-1.5">
                {fmt(v.effectiveFrom)} – {fmt(v.effectiveTo)} · {v.standardWeeklyHours}h × {money(v.hourlyRate)} · {v.payFrequency}/{v.basis}
              </div>
            ))}
          </div>
        </details>
      )}

      {isAdmin && (
        <details className="mt-4 rounded-lg border border-sage-100 bg-sage-50/40 px-4 py-2">
          <summary className="cursor-pointer text-sm font-medium text-sage-700 py-1">Change terms / increase hours</summary>
          <p className="text-[11px] text-sage-400 mt-1">Saves a new effective-dated version and closes the current one. Past pay runs keep their own snapshot and are unaffected.</p>
          <div className="grid grid-cols-2 gap-3 mt-3 pb-3">
            <label className="flex flex-col gap-1"><span className={lbl}>Standard weekly hours</span>
              <input type="number" step="0.5" min="0" value={f.standardWeeklyHours} onChange={set('standardWeeklyHours')} className={input} /></label>
            <label className="flex flex-col gap-1"><span className={lbl}>Hourly rate $</span>
              <input type="number" step="0.01" min="0" value={f.hourlyRate} onChange={set('hourlyRate')} className={input} /></label>
            <label className="flex flex-col gap-1 col-span-2"><span className={lbl}>Working pattern</span>
              <input value={f.workingPattern} onChange={set('workingPattern')} className={input} /></label>
            <label className="flex flex-col gap-1"><span className={lbl}>Pay frequency</span>
              <select value={f.payFrequency} onChange={set('payFrequency')} className={input}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option></select></label>
            <label className="flex flex-col gap-1"><span className={lbl}>Payday</span>
              <select value={f.payday} onChange={set('payday')} className={input}>{['monday','tuesday','wednesday','thursday','friday'].map((d) => <option key={d} value={d}>{d[0].toUpperCase()+d.slice(1)}</option>)}</select></label>
            <label className="flex flex-col gap-1"><span className={lbl}>Basis</span>
              <select value={f.basis} onChange={set('basis')} className={input}><option value="advance">Paid in advance</option><option value="arrears">Paid in arrears</option></select></label>
            <label className="flex flex-col gap-1"><span className={lbl}>Effective from</span>
              <input type="date" value={f.effectiveFrom} onChange={set('effectiveFrom')} className={input} /></label>
            <div className="col-span-2">
              <button type="button" disabled={isPending} onClick={save}
                className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : null}{isPending ? 'Saving…' : 'Save new version'}
              </button>
            </div>
          </div>
        </details>
      )}

      {msg && <p className={`mt-2 text-sm rounded-lg px-3 py-2 ${msg.kind === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{msg.text}</p>}
    </div>
  )
}
