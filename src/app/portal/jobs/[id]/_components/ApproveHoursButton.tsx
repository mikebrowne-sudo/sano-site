'use client'

// Phase E — Approve Hours for Pay.
//
// Per-worker action rendered inside the Labour & Margin section of
// the staff job page. Admin-only (the page passes isAdmin from the
// server so the button is never rendered for non-admin). Opens a
// modal that shows the allowed / actual / variance figures plus
// the contractor's current rate and a calculated pay preview.
// Admin can adjust approved_hours before submitting.
//
// Post-approval the worker row shows a green "Approved" pill with
// approved hours × rate = amount, and the button is replaced by
// a read-only state.

import { useState, useTransition } from 'react'
import { approveJobWorkerHours } from '../_actions-approve-hours'
import { CheckCircle, DollarSign, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface ApproveHoursButtonProps {
  jobId: string
  contractorId: string
  contractorName: string
  allowedHours: number | null
  actualHours: number | null
  hourlyRate: number | null
  payStatus: string | null
  approvedHours: number | null
  payRate: number | null
}

function fmtHours(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n} hr${n === 1 ? '' : 's'}`
}

function fmtCurrency(dollars: number | null): string {
  if (dollars == null || !Number.isFinite(dollars)) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export function ApproveHoursButton(props: ApproveHoursButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hoursInput, setHoursInput] = useState<string>(
    (props.actualHours != null ? props.actualHours : (props.allowedHours ?? 0)).toString(),
  )
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Already approved / included / paid — render read-only summary.
  const isApprovedOrBeyond =
    props.payStatus === 'approved' ||
    props.payStatus === 'included_in_pay_run' ||
    props.payStatus === 'paid'

  if (isApprovedOrBeyond) {
    const amount = (props.payRate ?? 0) * (props.approvedHours ?? 0)
    const label =
      props.payStatus === 'paid' ? 'Paid'
      : props.payStatus === 'included_in_pay_run' ? 'In pay run'
      : 'Approved'
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
        <CheckCircle size={12} />
        {label}: {fmtHours(props.approvedHours)} × {fmtCurrency(props.payRate)} = {fmtCurrency(amount)}
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 font-medium px-2.5 py-1 rounded-md text-xs hover:bg-sage-50 transition-colors"
      >
        <DollarSign size={12} />
        Approve Hours for Pay
      </button>
    )
  }

  const hoursNum = Number(hoursInput)
  const hoursValid = Number.isFinite(hoursNum) && hoursNum >= 0
  const ratePreview = props.hourlyRate ?? 0
  const amountPreview = hoursValid ? hoursNum * ratePreview : 0

  const variance =
    props.actualHours != null && props.allowedHours != null
      ? Math.round((props.actualHours - props.allowedHours) * 100) / 100
      : null

  function submit() {
    setError(null)
    if (!hoursValid) {
      setError('Approved hours must be zero or more.')
      return
    }
    startTransition(async () => {
      const result = await approveJobWorkerHours({
        jobId: props.jobId,
        contractorId: props.contractorId,
        approvedHours: hoursNum,
        note: note || null,
      })
      if ('error' in result) {
        setError(result.error ?? 'Failed to approve hours.')
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="bg-white border border-sage-200 rounded-lg p-4 space-y-3 w-full max-w-md shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sage-800">
          Approve hours — {props.contractorName}
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-sage-500 font-medium">Allowed</div>
          <div className="text-sage-800 font-semibold">{fmtHours(props.allowedHours)}</div>
        </div>
        <div>
          <div className="text-sage-500 font-medium">Actual</div>
          <div className="text-sage-800 font-semibold">{fmtHours(props.actualHours)}</div>
        </div>
        <div>
          <div className="text-sage-500 font-medium">Variance</div>
          <div
            className={
              variance == null
                ? 'text-sage-800 font-semibold'
                : variance > 0
                ? 'text-amber-700 font-semibold'
                : variance < 0
                ? 'text-emerald-700 font-semibold'
                : 'text-sage-800 font-semibold'
            }
          >
            {variance == null ? '—' : (variance > 0 ? `+${variance}` : variance)} hr
          </div>
        </div>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Approved hours</span>
        <input
          type="number"
          min="0"
          step="0.25"
          value={hoursInput}
          onChange={(e) => setHoursInput(e.target.value)}
          className="w-full rounded-lg border border-sage-200 px-4 py-2 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
        <span className="block text-[11px] text-sage-500 mt-1">
          Defaults to actual. Adjust if you want to pay more or less than what was worked.
        </span>
      </label>

      <div className="rounded-md bg-sage-50 border border-sage-100 px-3 py-2 text-xs flex items-center justify-between">
        <span className="text-sage-600">
          Rate (snapshot): <span className="font-semibold text-sage-800">{fmtCurrency(props.hourlyRate)}</span> /hr
        </span>
        <span className="text-sage-600">
          Pay: <span className="font-semibold text-sage-800">{fmtCurrency(amountPreview)}</span>
        </span>
      </div>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Pay note (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Reason for adjustment, notes for pay run, etc."
          className="w-full rounded-lg border border-sage-200 px-4 py-2 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm"
        />
      </label>

      {error && <p className="text-red-600 text-xs">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={14} />
          {isPending ? 'Approving…' : 'Approve Hours'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="text-sm text-sage-600 hover:text-sage-800">
          Cancel
        </button>
      </div>
    </div>
  )
}
