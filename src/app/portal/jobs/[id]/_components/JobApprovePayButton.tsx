'use client'

// Stage C — per-worker contractor pay approval on the job page. Uses the
// SAME shared approveContractorPay action as the Pending approvals
// worklist, so both stay consistent and can't create duplicate payables.
// When a contractor_invoice already exists it shows an "Already approved
// for pay" state linking to the CI (no re-approve in this stage).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, DollarSign, X, Loader2, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import { approveContractorPay } from '../../../contractor-invoices/_actions-approve-pay'

export interface ExistingPayable {
  id: string
  invoice_number: string | null
  amount: number | null
  status: string | null
}

export interface JobApprovePayButtonProps {
  jobId: string
  contractorId: string
  contractorName: string
  mode: 'hourly' | 'fixed'
  defaultApprovedHours: number | null
  rate: number | null
  computedAmount: number | null
  existingCI: ExistingPayable | null
}

const num = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : NaN }

export function JobApprovePayButton(props: JobApprovePayButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState(props.defaultApprovedHours != null ? String(props.defaultApprovedHours) : '')
  const [amount, setAmount] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<ExistingPayable | null>(null)
  const [pending, startTransition] = useTransition()

  const approved = done ?? props.existingCI
  if (approved) {
    return (
      <Link href={`/portal/contractor-invoices/${approved.id}`}
        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition-colors">
        <CheckCircle size={12} /> Already approved for pay
        {approved.invoice_number ? ` · ${approved.invoice_number}` : ''}
        {approved.amount != null ? ` · ${formatCurrency(approved.amount)}` : ''}
        <ExternalLink size={11} />
      </Link>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setErr(null); setOpen(true) }}
        className="inline-flex items-center gap-1.5 border border-sage-200 text-sage-700 font-medium px-2.5 py-1 rounded-md text-xs hover:bg-sage-50 transition-colors">
        <DollarSign size={12} /> Approve for pay
      </button>
    )
  }

  function submit() {
    setErr(null)
    startTransition(async () => {
      let payload: { approvedHours?: number; fixedAmount?: number }
      if (props.mode === 'fixed') {
        const a = num(amount)
        if (!(a > 0)) { setErr('Enter a fixed amount.'); return }
        payload = { fixedAmount: a }
      } else {
        const h = num(hours)
        if (!(h > 0)) { setErr('Enter approved hours.'); return }
        if (props.rate == null) { setErr('No contractor rate on file — set it on the contractor.'); return }
        payload = { approvedHours: h }
      }
      const res = await approveContractorPay(props.jobId, props.contractorId, payload)
      if (res.error || !res.payable) {
        setErr(res.error ?? 'Could not approve.')
        return
      }
      setDone({ id: res.payable.id, invoice_number: res.payable.invoice_number, amount: res.payable.amount, status: res.payable.status })
      router.refresh()
    })
  }

  const live = props.mode === 'hourly' && props.rate != null && Number.isFinite(num(hours)) ? num(hours) * props.rate : props.computedAmount
  const input = 'rounded-md border border-sage-200 px-2 py-1 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="bg-white border border-sage-200 rounded-lg p-3 space-y-2 w-full max-w-sm shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-sage-800">Approve for pay — {props.contractorName}</span>
        <button type="button" onClick={() => setOpen(false)} className="text-sage-400 hover:text-sage-600"><X size={15} /></button>
      </div>

      {props.mode === 'fixed' ? (
        <label className="flex items-center justify-between gap-2 text-xs">
          <span className="text-sage-600">Fixed amount</span>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${input} w-28 text-right`} aria-label="Fixed amount" />
        </label>
      ) : (
        <div className="space-y-1.5 text-xs">
          <label className="flex items-center justify-between gap-2">
            <span className="text-sage-600">Approved hours</span>
            <input type="number" step="0.25" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className={`${input} w-24 text-right`} aria-label="Approved hours" />
          </label>
          <div className="flex items-center justify-between">
            <span className="text-sage-600">Rate</span>
            <span className="text-sage-800">{props.rate != null ? `${formatCurrency(props.rate)} /hr` : '—'}</span>
          </div>
          <div className="flex items-center justify-between border-t border-sage-100 pt-1">
            <span className="text-sage-700 font-medium">Pay</span>
            <span className="font-bold text-sage-800">{live != null ? formatCurrency(live) : '—'}</span>
          </div>
        </div>
      )}

      {err && <p className="text-red-600 text-xs">{err}</p>}

      <div className="flex items-center gap-2 pt-0.5">
        <button type="button" onClick={submit} disabled={pending}
          className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-3 py-1.5 rounded-md text-xs hover:bg-sage-700 disabled:opacity-50">
          {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          {pending ? 'Approving…' : 'Approve for pay'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null) }} className="text-xs text-sage-600 hover:text-sage-800">Cancel</button>
      </div>
    </div>
  )
}
