'use client'

// The three DISTINCT payroll obligations for a pay run, shown separately so
// nothing implies they've all happened: (1) employee wage payment, (2) payday
// filing, (3) IRD remittance of PAYE + KiwiSaver. Plus the first-pay readiness
// checklist. Being marked paid clears none of the others.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle, Clock, Wallet, FileText, Landmark } from 'lucide-react'
import type { ReadinessItem } from '@/lib/payroll/first-pay-readiness'
import type { IrdSetAside } from '@/lib/payroll/payrun-obligations'
import { markIrdCompared, markFilingSubmitted, markFilingAccepted, markEmpRegistered } from '../_actions-status'

const money = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

export interface PayRunWorkflowProps {
  runId: string
  isAdmin: boolean
  payment: { status: string; netTotal: number; label: string; paidAt: string | null }
  filing: { status: string; submittedAt: string | null; acceptedAt: string | null; due: string }
  emp: { registered: boolean; note: string | null }
  setAside: IrdSetAside
  irdComparedAt: string | null
  readiness: { employeeName: string; items: ReadinessItem[] }[]
}

const FILING_LABEL: Record<string, string> = {
  not_filed: 'Not filed', queued: 'Queued', submitted: 'Submitted', accepted: 'Accepted',
  rejected: 'Rejected', correction_required: 'Correction required',
}

export function PayRunWorkflowPanel(p: PayRunWorkflowProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok?: true; error?: string }>) => {
    setErr(null)
    startTransition(async () => {
      const r = await fn()
      if (r.error) setErr(r.error); else router.refresh()
    })
  }
  const paid = p.payment.status === 'paid'
  const filingDone = p.filing.status === 'accepted'
  const card = 'rounded-xl border p-4 bg-white'
  const btn = 'inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border border-sage-200 text-sage-700 hover:bg-sage-50 disabled:opacity-50'

  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1 — Employee wage payment */}
        <div className={`${card} ${paid ? 'border-emerald-200' : 'border-sage-200'}`}>
          <div className="flex items-center gap-2 text-sage-500 text-xs font-semibold uppercase tracking-wide"><Wallet size={14} /> Employee payment</div>
          <p className="mt-2 text-sage-800 font-semibold">
            {paid ? `${money(p.payment.netTotal)} paid` : `Pay ${p.payment.label} ${money(p.payment.netTotal)}`}
          </p>
          <p className="text-xs text-sage-500 mt-0.5">
            {paid ? `Paid on ${fmtDate(p.payment.paidAt)}` : `Status: ${p.payment.status}. Approve, then make the bank transfer and mark paid.`}
          </p>
        </div>

        {/* 2 — Payday filing */}
        <div className={`${card} ${filingDone ? 'border-emerald-200' : 'border-amber-200'}`}>
          <div className="flex items-center gap-2 text-sage-500 text-xs font-semibold uppercase tracking-wide"><FileText size={14} /> Payday filing (IR348)</div>
          <p className="mt-2 text-sage-800 font-semibold">{FILING_LABEL[p.filing.status] ?? p.filing.status}</p>
          <p className="text-xs text-sage-500 mt-0.5">Due {fmtDate(p.filing.due)}{p.filing.acceptedAt ? ` · accepted ${fmtDate(p.filing.acceptedAt)}` : p.filing.submittedAt ? ` · submitted ${fmtDate(p.filing.submittedAt)}` : ''}</p>
          {!p.emp.registered && (
            <p className="text-[11px] mt-1 text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">EMP registration pending — filing not yet possible. Does not block payment.</p>
          )}
          {p.isAdmin && (
            <div className="flex flex-wrap gap-2 mt-2">
              {!p.emp.registered && <button className={btn} disabled={isPending} onClick={() => run(() => markEmpRegistered({ runId: p.runId, registered: true }))}>Mark EMP registered</button>}
              {p.emp.registered && p.filing.status !== 'submitted' && p.filing.status !== 'accepted' && <button className={btn} disabled={isPending} onClick={() => run(() => markFilingSubmitted({ runId: p.runId }))}>Mark submitted</button>}
              {p.filing.status === 'submitted' && <button className={btn} disabled={isPending} onClick={() => run(() => markFilingAccepted({ runId: p.runId }))}>Mark accepted</button>}
            </div>
          )}
        </div>

        {/* 3 — IRD remittance */}
        <div className={`${card} border-sage-200`}>
          <div className="flex items-center gap-2 text-sage-500 text-xs font-semibold uppercase tracking-wide"><Landmark size={14} /> Set aside for IRD</div>
          <p className="mt-2 text-sage-800 font-semibold">{money(p.setAside.total)}</p>
          <p className="text-[11px] text-sage-500 mt-0.5 leading-relaxed">
            PAYE {money(p.setAside.paye)} · employee KiwiSaver {money(p.setAside.employeeKs)} · gross employer KiwiSaver {money(p.setAside.employerKsGross)}
            {p.setAside.esct != null ? ` (ESCT ${money(p.setAside.esct)} within it)` : ''}.
          </p>
          <p className="text-[11px] text-sage-400 mt-1">Outstanding — cleared only when the IRD payment is recorded. (Running ledger arrives with the liability tally.)</p>
        </div>
      </div>

      {/* First-pay readiness */}
      {!paid && p.readiness.length > 0 && (
        <div className="mt-4 rounded-xl border border-sage-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-sage-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-sage-800">First-pay readiness</h3>
            {p.isAdmin && !p.irdComparedAt && (
              <button className={btn} disabled={isPending} onClick={() => run(() => markIrdCompared({ runId: p.runId }))}>Confirm IRD comparison</button>
            )}
            {p.irdComparedAt && <span className="text-[11px] text-emerald-700">IRD-compared {fmtDate(p.irdComparedAt)}</span>}
          </div>
          {p.readiness.map((r, ri) => (
            <div key={ri} className="px-4 py-3 border-b border-sage-50 last:border-0">
              {p.readiness.length > 1 && <p className="text-xs font-semibold text-sage-700 mb-1">{r.employeeName}</p>}
              <ul className="space-y-1">
                {r.items.map((it) => (
                  <li key={it.key} className="flex items-start gap-2 text-[13px]">
                    <span className={`mt-0.5 shrink-0 ${it.status === 'pass' ? 'text-emerald-500' : it.status === 'pending' ? 'text-sage-300' : 'text-amber-500'}`}>
                      {it.status === 'pass' ? <CheckCircle2 size={14} /> : it.status === 'pending' ? <Clock size={14} /> : <AlertTriangle size={14} />}
                    </span>
                    <span className="text-sage-700"><span className="font-medium">{it.label}:</span> {it.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="px-4 py-2 text-[11px] text-sage-400">Advisory — the first pay is manually approved. A pending EMP registration does not block payment.</p>
        </div>
      )}

      {err && <p className="mt-3 text-sm rounded-lg px-3 py-2 bg-red-50 text-red-700 border border-red-200">{err}</p>}
    </div>
  )
}
