'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText } from 'lucide-react'
import { createMonthlyInvoice } from '../../_actions'

export interface MonthlyJobRow {
  id: string
  jobNumber: string | null
  title: string | null
  date: string
  hours: number | null
  jobPrice: number | null
  assignedTo: string | null
}

const fmt = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const round2 = (n: number) => Math.round(n * 100) / 100
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`
}

export function MonthlyInvoiceForm({
  clients, clientId, months, month, monthLabel, jobs, defaultRate, defaultLabel, defaultNotes, defaultGstIncluded,
}: {
  clients: { id: string; label: string; count: number }[]
  clientId: string | null
  months: { value: string; label: string }[]
  month: string | null
  monthLabel: string | null
  jobs: MonthlyJobRow[]
  defaultRate: number | null
  defaultLabel: string
  defaultNotes: string
  defaultGstIncluded: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(() => new Set(jobs.map((j) => j.id)))
  const [rate, setRate] = useState(defaultRate != null ? String(defaultRate) : '')
  const [label, setLabel] = useState(defaultLabel)
  const [notes, setNotes] = useState(defaultNotes)
  const [gstIncluded, setGstIncluded] = useState(defaultGstIncluded)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const rateNum = rate.trim() === '' ? null : Number(rate)
  const rateValid = rateNum == null || (Number.isFinite(rateNum) && rateNum > 0)

  const { total, unpriced } = useMemo(() => {
    let t = 0
    let u = 0
    for (const j of jobs) {
      if (!selected.has(j.id)) continue
      const p = j.jobPrice != null && j.jobPrice > 0 ? j.jobPrice : (rateValid ? rateNum : null)
      if (p == null) u++
      else t += p
    }
    return { total: round2(t), unpriced: u }
  }, [jobs, selected, rateNum, rateValid])
  // GST-inclusive prices: the total already contains GST (3/23 of it).
  const gst = gstIncluded ? round2(total * 3 / 23) : round2(total * 0.15)
  const grand = gstIncluded ? total : round2(total + gst)

  function go(params: { client?: string | null; month?: string | null }) {
    const q = new URLSearchParams()
    if (params.client) q.set('client', params.client)
    if (params.month) q.set('month', params.month)
    router.push(`/portal/invoices/monthly/new${q.toString() ? `?${q}` : ''}`)
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit() {
    setErr(null)
    if (!clientId || !month) return
    if (!rateValid) { setErr('Per-visit rate must be a positive number.'); return }
    startTransition(async () => {
      const res = await createMonthlyInvoice({
        clientId,
        month,
        jobIds: jobs.filter((j) => selected.has(j.id)).map((j) => j.id),
        ratePerVisit: rateNum,
        serviceLabel: label,
        notes,
        gstIncluded,
      })
      if (res && 'error' in res) setErr(res.error)
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 bg-white'

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-sage-700 mb-1">Client</span>
          <select className={input} value={clientId ?? ''} onChange={(e) => go({ client: e.target.value || null })}>
            <option value="">— Select a client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.label} — {c.count} visit{c.count === 1 ? '' : 's'} to bill</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-sage-700 mb-1">Month</span>
          <select className={input} value={month ?? ''} disabled={!clientId}
            onChange={(e) => go({ client: clientId, month: e.target.value || null })}>
            <option value="">— Select a month —</option>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>

      {clients.length === 0 && (
        <p className="text-sm text-sage-600">No completed visits are waiting to be invoiced.</p>
      )}

      {clientId && month && (
        <>
          <div className="rounded-xl border border-sage-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-sage-50 text-sage-600 text-left">
                <tr>
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2">Visit</th>
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Hours</th>
                  <th className="px-3 py-2 text-right">Price{gstIncluded ? ' (incl. GST)' : ' (ex GST)'}</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => {
                  const own = j.jobPrice != null && j.jobPrice > 0
                  const price = own ? j.jobPrice : (rateValid ? rateNum : null)
                  return (
                    <tr key={j.id} className="border-t border-sage-100">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(j.id)} onChange={() => toggle(j.id)}
                          className="rounded border-sage-300" aria-label={`Include ${j.jobNumber ?? 'visit'}`} />
                      </td>
                      <td className="px-3 py-2 font-medium text-sage-800">{fmtDay(j.date)}</td>
                      <td className="px-3 py-2 text-sage-600">
                        {j.jobNumber}{j.title ? ` · ${j.title}` : ''}{j.assignedTo ? ` · ${j.assignedTo}` : ''}
                      </td>
                      <td className="px-3 py-2 text-sage-600">{j.hours ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {price != null ? fmt(price) : <span className="text-red-600">No price</span>}
                        {!own && price != null && <span className="block text-[11px] text-sage-500">from rate</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-sage-700 mb-1">Per-visit rate{gstIncluded ? ' (incl. GST)' : ' (ex GST)'}</span>
              <input className={input} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 315" />
              <span className="block text-xs text-sage-500 mt-1">Used for visits with no price on the job. It&apos;s saved onto those jobs.</span>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-sage-700 mb-1">Invoice heading</span>
              <input className={input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Residential Housekeeping" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-sage-700">
            <input type="checkbox" checked={gstIncluded} onChange={(e) => setGstIncluded(e.target.checked)} className="rounded border-sage-300" />
            Prices include GST <span className="text-xs text-sage-500">(e.g. $180 incl. GST — prefilled from the client&apos;s schedule)</span>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-sage-700 mb-1">Invoice notes</span>
            <textarea className={input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Contract rate: $630.00 + GST per week ($724.50 incl. GST)" />
            <span className="block text-xs text-sage-500 mt-1">Printed in the Notes box on the invoice. Prefilled from the client&apos;s recurring schedule.</span>
          </label>

          <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-sage-600">{monthLabel} — {selected.size} visit{selected.size === 1 ? '' : 's'}</span><span>{fmt(total)}</span></div>
            <div className="flex justify-between"><span className="text-sage-600">{gstIncluded ? 'Includes GST (15%)' : 'GST (15%)'}</span><span>{fmt(gst)}</span></div>
            <div className="flex justify-between font-semibold text-sage-800"><span>Total</span><span>{fmt(grand)}</span></div>
            {unpriced > 0 && <p className="text-red-600 text-xs pt-1">{unpriced} selected visit{unpriced === 1 ? ' has' : 's have'} no price — enter a per-visit rate.</p>}
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button type="button" onClick={submit} disabled={pending || selected.size === 0 || unpriced > 0 || !rateValid}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {pending ? 'Creating…' : 'Create draft invoice'}
          </button>
        </>
      )}
    </div>
  )
}
