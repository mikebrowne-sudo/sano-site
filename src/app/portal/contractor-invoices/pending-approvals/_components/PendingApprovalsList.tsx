'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, AlertTriangle, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import { formatCurrency, formatDate } from '@/lib/format'
import { approveContractorPay } from '../../_actions-approve-pay'
import type { ApprovalFlag, Readiness } from '@/lib/pending-approvals'

export interface ApprovalRow {
  jobId: string
  contractorId: string
  jobNumber: string
  jobAddress: string | null
  completedAt: string | null
  jobStatus: string | null
  contractorName: string
  note: string | null
  allowedHours: number | null
  submittedHours: number | null
  defaultApprovedHours: number | null
  rate: number | null
  mode: 'hourly' | 'fixed'
  computedAmount: number | null
  flags: ApprovalFlag[]
  readiness: Readiness
  existingCI: { id: string; invoice_number: string | null; status: string | null } | null
}

const FLAG_LABEL: Record<ApprovalFlag, string> = {
  already_approved: 'Already approved',
  missing_rate: 'Missing rate',
  missing_hours: 'Missing hours',
  submitted_exceeds_allowed: 'Submitted > allowed',
  multiple_contractors: 'Multiple contractors',
  fixed_needs_amount: 'Fixed — enter amount',
}

type Category = 'pending' | 'ready' | 'needs_review' | 'missing_rate' | 'missing_hours' | 'fixed' | 'already_approved' | 'all'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'pending', label: 'Pending (needs action)' },
  { value: 'ready', label: 'Ready to approve' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'missing_rate', label: 'Missing rate' },
  { value: 'missing_hours', label: 'Missing hours' },
  { value: 'fixed', label: 'Fixed-price' },
  { value: 'already_approved', label: 'Already approved' },
  { value: 'all', label: 'All' },
]

const key = (r: ApprovalRow) => `${r.jobId}::${r.contractorId}`
const num = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : NaN }

export function PendingApprovalsList({
  rows,
  contractors,
}: {
  rows: ApprovalRow[]
  contractors: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [contractorId, setContractorId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [category, setCategory] = useState<Category>('pending')

  const [hours, setHours] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [key(r), r.defaultApprovedHours != null ? String(r.defaultApprovedHours) : ''])))
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Record<string, { ci?: { id: string; invoice_number: string | null }; error?: string }>>({})
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => rows.filter((r) => {
    const approvedNow = !!result[key(r)]?.ci
    const readiness: Readiness = approvedNow ? 'already_approved' : r.readiness
    if (contractorId && r.contractorId !== contractorId) return false
    const d = (r.completedAt ?? '').slice(0, 10)
    if (dateFrom && d && d < dateFrom) return false
    if (dateTo && d && d > dateTo) return false
    switch (category) {
      case 'pending': return readiness !== 'already_approved'
      case 'ready': return readiness === 'ready'
      case 'needs_review': return readiness === 'needs_review'
      case 'missing_rate': return r.flags.includes('missing_rate')
      case 'missing_hours': return r.flags.includes('missing_hours')
      case 'fixed': return r.mode === 'fixed' && readiness !== 'already_approved'
      case 'already_approved': return readiness === 'already_approved'
      default: return true
    }
  }), [rows, contractorId, dateFrom, dateTo, category, result])

  function approve(r: ApprovalRow) {
    const k = key(r)
    setResult((p) => ({ ...p, [k]: {} }))
    setPendingKey(k)
    startTransition(async () => {
      let payload: { approvedHours?: number; fixedAmount?: number }
      if (r.mode === 'fixed') {
        const amt = num(amounts[k] ?? '')
        if (!(amt > 0)) { setResult((p) => ({ ...p, [k]: { error: 'Enter a fixed amount.' } })); setPendingKey(null); return }
        payload = { fixedAmount: amt }
      } else {
        const h = num(hours[k] ?? '')
        if (!(h > 0)) { setResult((p) => ({ ...p, [k]: { error: 'Enter approved hours.' } })); setPendingKey(null); return }
        if (r.rate == null) { setResult((p) => ({ ...p, [k]: { error: 'No contractor rate on file — set it on the contractor.' } })); setPendingKey(null); return }
        payload = { approvedHours: h }
      }
      const res = await approveContractorPay(r.jobId, r.contractorId, payload)
      setPendingKey(null)
      if (res.error || !res.payable) { setResult((p) => ({ ...p, [k]: { error: res.error ?? 'Could not approve.' } })); return }
      setResult((p) => ({ ...p, [k]: { ci: { id: res.payable!.id, invoice_number: res.payable!.invoice_number } } }))
      router.refresh()
    })
  }

  const input = 'rounded-md border border-sage-200 px-2 py-1 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="space-y-4 tnum">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Contractor</span>
          <select value={contractorId} onChange={(e) => setContractorId(e.target.value)} className={input}>
            <option value="">All</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Completed from</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Show</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={input}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <span className="ml-auto text-xs text-sage-500">{filtered.length} row{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sage-500 text-sm">
          Nothing to show for this filter.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sage-500 border-b border-sage-200 bg-sage-50/50">
                  <th className="py-3 px-3 font-semibold">Job</th>
                  <th className="py-3 px-3 font-semibold">Completed</th>
                  <th className="py-3 px-3 font-semibold">Contractor</th>
                  <th className="py-3 px-3 font-semibold">Hours</th>
                  <th className="py-3 px-3 font-semibold text-right">Amount</th>
                  <th className="py-3 px-3 font-semibold">Flags</th>
                  <th className="py-3 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const k = key(r)
                  const res = result[k]
                  const approved = res?.ci ?? (r.existingCI ? { id: r.existingCI.id, invoice_number: r.existingCI.invoice_number } : null)
                  const liveAmount = r.mode === 'hourly' && r.rate != null
                    ? (Number.isFinite(num(hours[k] ?? '')) ? num(hours[k] ?? '') * r.rate : null)
                    : null
                  return (
                    <tr key={k} className="border-b border-sage-50 align-top">
                      <td className="py-3 px-3">
                        <Link href={`/portal/jobs/${r.jobId}`} className="font-medium text-sage-800 hover:underline">{r.jobNumber}</Link>
                        {r.jobAddress && <div className="text-xs text-sage-500 max-w-[220px]">{r.jobAddress}</div>}
                        {r.note && <div className="text-[11px] text-sage-400 italic max-w-[220px] truncate" title={r.note}>{r.note}</div>}
                      </td>
                      <td className="py-3 px-3 text-sage-600 text-xs whitespace-nowrap">{formatDate(r.completedAt)}</td>
                      <td className="py-3 px-3 text-sage-700">{r.contractorName}</td>
                      <td className="py-3 px-3">
                        <div className="text-[11px] text-sage-400">
                          allowed {r.allowedHours ?? '—'}{r.submittedHours != null ? ` · submitted ${r.submittedHours}` : ''}
                        </div>
                        {r.mode === 'hourly' && !approved ? (
                          <input type="number" step="0.25" min="0" value={hours[k] ?? ''} onChange={(e) => setHours((p) => ({ ...p, [k]: e.target.value }))}
                            className={clsx(input, 'w-20 mt-1')} aria-label="Approved hours" />
                        ) : (
                          <div className="text-sage-700">{r.mode === 'hourly' ? (r.defaultApprovedHours ?? '—') : '—'}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {r.mode === 'fixed' && !approved ? (
                          <input type="number" step="0.01" min="0" value={amounts[k] ?? ''} onChange={(e) => setAmounts((p) => ({ ...p, [k]: e.target.value }))}
                            placeholder="0.00" className={clsx(input, 'w-24 text-right')} aria-label="Fixed amount" />
                        ) : (
                          <span className="font-medium text-sage-800">
                            {approved ? '—' : formatCurrency(liveAmount ?? r.computedAmount ?? 0)}
                          </span>
                        )}
                        {r.mode === 'hourly' && r.rate != null && !approved && (
                          <div className="text-[11px] text-sage-400">@ {formatCurrency(r.rate)}/hr</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {r.flags.filter((f) => f !== 'already_approved').map((f) => (
                            <span key={f} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-medium">
                              <AlertTriangle size={10} /> {FLAG_LABEL[f]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {approved ? (
                          <Link href={`/portal/contractor-invoices/${approved.id}`} className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-medium whitespace-nowrap">
                            <Check size={13} /> Approved{approved.invoice_number ? ` · ${approved.invoice_number}` : ''} <ExternalLink size={11} />
                          </Link>
                        ) : (
                          <div className="inline-flex flex-col items-end gap-1">
                            <button type="button" onClick={() => approve(r)} disabled={pendingKey === k}
                              className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-medium px-3 py-1.5 rounded-md text-xs hover:bg-sage-700 disabled:opacity-50">
                              {pendingKey === k ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                              {pendingKey === k ? 'Approving…' : 'Approve'}
                            </button>
                            {res?.error && <span className="text-[11px] text-red-600 max-w-[200px] text-right">{res.error}</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
