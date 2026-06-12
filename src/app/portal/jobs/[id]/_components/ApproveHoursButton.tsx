'use client'

// Approve for pay (allowed-hours model, 2026-06).
//
// Per-worker admin action in the Labour & Margin section. The page
// renders it only for admins on completed / invoiced jobs. In the
// allowed-hours model the payable figure is NOT typed by the admin —
// it is `allowed_hours + admin-approved extra hours`. This control
// just confirms that figure and flips the worker's pay_status to
// `approved`, snapshotting the pay rate so the pay run can pick it up.
//
// Post-approval the row shows a read-only "Approved / In pay run /
// Paid" pill with the payable hours × rate = amount.

import { useState, useTransition } from 'react'
import { approveJobWorkerHours } from '../_actions-approve-hours'
import { CheckCircle, DollarSign, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export interface ApproveHoursButtonProps {
  jobId: string
  contractorId: string
  contractorName: string
  payableHours: number | null // allowed + approved extra
  rate: number | null
  payStatus: string | null
  approvedHours: number | null
  payRate: number | null
}

function fmtHours(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  const r = Math.round(n * 100) / 100
  return `${r} hr${r === 1 ? '' : 's'}`
}

function fmtCurrency(dollars: number | null): string {
  if (dollars == null || !Number.isFinite(dollars)) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export function ApproveHoursButton(props: ApproveHoursButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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

  const amountPreview = (props.payableHours ?? 0) * (props.rate ?? 0)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 font-medium px-2.5 py-1 rounded-md text-xs hover:bg-sage-50 transition-colors"
      >
        <DollarSign size={12} />
        Approve for pay
      </button>
    )
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await approveJobWorkerHours({
        jobId: props.jobId,
        contractorId: props.contractorId,
        note: note || null,
      })
      if ('error' in result) {
        setError(result.error ?? 'Failed to approve for pay.')
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
          Approve for pay — {props.contractorName}
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600">
          <X size={16} />
        </button>
      </div>

      <div className="rounded-md bg-sage-50 border border-sage-100 px-3 py-2.5 text-xs space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sage-600">Payable hours <span className="text-sage-400">(allowed + approved extra)</span></span>
          <span className="font-semibold text-sage-800">{fmtHours(props.payableHours)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sage-600">Rate (snapshot)</span>
          <span className="font-semibold text-sage-800">{fmtCurrency(props.rate)} /hr</span>
        </div>
        <div className="flex items-center justify-between border-t border-sage-200 pt-1 mt-1">
          <span className="text-sage-700 font-medium">Pay</span>
          <span className="font-bold text-sage-800">{fmtCurrency(amountPreview)}</span>
        </div>
      </div>

      <p className="text-[11px] text-sage-500 leading-snug">
        To pay more than the allowed hours, record extra hours on the worker row and approve them first — they fold into the payable figure above.
      </p>

      <label className="block">
        <span className="block text-sm font-semibold text-sage-800 mb-1.5">Pay note (optional)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Notes for the pay run, etc."
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
          {isPending ? 'Approving…' : 'Approve for pay'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null) }} className="text-sm text-sage-600 hover:text-sage-800">
          Cancel
        </button>
      </div>
    </div>
  )
}
