'use client'

// Run a casual employee's pay: enter hours + rate, choose how 8% holiday pay is
// handled (included in the rate, or added on top), pick the period + pay date; a
// live payslip preview computes base/holiday/gross, PAYE (verify-gated),
// KiwiSaver, employer KiwiSaver + ESCT and net, plus the figures you file with
// IRD. Save records the run + the wages expense.

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { computePayslip, type HolidayPayMode } from '@/lib/payroll/payslip'
import type { PayPeriod } from '@/lib/payroll/paye'
import { saveEmployeePayRun } from '../_actions'

const nzd = (n: number) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)

export function EmployeePayForm({ personLabel }: { personLabel: string }) {
  const router = useRouter()
  const [payPeriod, setPayPeriod] = useState<PayPeriod>('weekly')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [payDate, setPayDate] = useState('')
  const [hours, setHours] = useState('')
  const [rate, setRate] = useState('')
  const [optedOut, setOptedOut] = useState(true)
  // Default: ordinary rate + 8% on top (Holidays-Act pay-as-you-go). Inclusive
  // is only for reviewed existing agreements where the ordinary rate + 8%
  // component are clearly identifiable.
  const [holidayMode, setHolidayMode] = useState<HolidayPayMode>('exclusive_on_top')
  const [paygEligible, setPaygEligible] = useState(true)
  const [esctThreshold, setEsctThreshold] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()

  const h = Number(hours) || 0
  const r = Number(rate) || 0
  // Employer contributes the KiwiSaver minimum (3.5% from 1 Apr 2026) when the
  // employee is a member; ESCT is withheld from it. Both are 0 when opted out.
  const employerRate = optedOut ? 0 : 0.035
  const esctThresholdAmount = Number(esctThreshold) > 0 ? Number(esctThreshold) : undefined
  const slip = useMemo(
    () => computePayslip({
      hours: h,
      rate: r,
      period: payPeriod,
      holidayPayMode: holidayMode,
      kiwiSaverEmployeeRate: optedOut ? 0 : 0.03,
      employerKiwiSaverRate: employerRate,
      esctThresholdAmount,
    }),
    [h, r, payPeriod, holidayMode, optedOut, employerRate, esctThresholdAmount],
  )
  const canSave = payDate && h > 0 && r > 0 && !saving

  function save() {
    setError(null)
    startSave(async () => {
      const res = await saveEmployeePayRun({
        personLabel,
        taxCode: 'M',
        payPeriod,
        periodStart: periodStart || null,
        periodEnd: periodEnd || null,
        payDate,
        hours: h,
        rate: r,
        holidayPayMode: holidayMode,
        paygHolidayEligible: paygEligible,
        kiwiSaverEmployeeRate: optedOut ? 0 : 0.03,
        employerKiwiSaverRate: employerRate,
        esctThresholdAmount: esctThresholdAmount ?? null,
        notes,
      })
      if (res.error) { setError(res.error); return }
      setHours(''); setRate(''); setNotes(''); setPeriodStart(''); setPeriodEnd(''); setPayDate('')
      router.refresh()
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-sage-800">Run pay — {personLabel}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Pay period</span>
            <select value={payPeriod} onChange={(e) => setPayPeriod(e.target.value as PayPeriod)} className={input}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Pay date *</span>
            <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Period start</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Period end</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Hours *</span>
            <input type="number" step="0.01" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className={input} placeholder="e.g. 20" />
          </label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Rate $/hr * {holidayMode === 'inclusive' ? '(incl. 8% hol. pay)' : '(base — 8% added)'}</span>
            <input type="number" step="0.01" min="0" value={rate} onChange={(e) => setRate(e.target.value)} className={input} placeholder="e.g. 25.00" />
          </label>
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Holiday pay</span>
            <select value={holidayMode} onChange={(e) => setHolidayMode(e.target.value as HolidayPayMode)} className={input}>
              <option value="exclusive_on_top">Add 8% on top of the rate (default)</option>
              <option value="inclusive">Rate includes 8% — reviewed agreements only</option>
            </select>
          </label>
        </div>
        {holidayMode === 'inclusive' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Inclusive rate — only use where the signed agreement clearly identifies the ordinary rate and the 8% holiday-pay component. Otherwise use the default (8% on top).
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input type="checkbox" checked={paygEligible} onChange={(e) => setPaygEligible(e.target.checked)} className="rounded border-sage-300" />
          Genuine casual — eligible for pay-as-you-go 8% holiday pay
        </label>
        {!paygEligible && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Pay-as-you-go 8% is only lawful for genuine, intermittent casual work. If the
            work is regular/ongoing, the employee is likely <span className="font-semibold">entitled to accrued annual leave</span>
            {' '}(4 weeks) instead — check with your accountant before paying PAYG.
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-sage-700">
          <input type="checkbox" checked={optedOut} onChange={(e) => setOptedOut(e.target.checked)} className="rounded border-sage-300" />
          Employee has opted out of KiwiSaver
        </label>
        {!optedOut && (
          <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Est. annual earnings for ESCT rate (optional)</span>
            <input type="number" step="1" min="0" value={esctThreshold} onChange={(e) => setEsctThreshold(e.target.value)} className={input} placeholder="defaults to annualising this run" />
          </label>
        )}
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={input} placeholder="Optional" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={save} disabled={!canSave}
          className="w-full inline-flex items-center justify-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving…' : 'Save pay run + record wages expense'}
        </button>
      </div>

      {/* Payslip preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 tnum">
        <h2 className="text-sm font-semibold text-sage-800 mb-3">Payslip preview</h2>
        <dl className="text-sm divide-y divide-sage-50">
          {slip.holidayPayMode === 'exclusive_on_top' ? (
            <>
              <Row label={`Base (${h || 0} hrs × ${nzd(r)})`} value={nzd(slip.baseEarnings)} />
              <Row label="+ Holiday pay (8%)" value={nzd(slip.holidayPayComponent)} />
              <Row label="Gross" value={nzd(slip.gross)} strong />
            </>
          ) : (
            <>
              <Row label={`Gross (${h || 0} hrs × ${nzd(r)})`} value={nzd(slip.gross)} strong />
              <Row label="— incl. holiday pay (8%)" value={nzd(slip.holidayPayComponent)} muted />
            </>
          )}
          <Row label="Income tax" value={`− ${nzd(slip.incomeTax)}`} />
          <Row label="ACC earner levy" value={`− ${nzd(slip.accLevy)}`} />
          <Row label="PAYE (tax + ACC)" value={`− ${nzd(slip.paye)}`} strong />
          <Row label="KiwiSaver" value={`− ${nzd(slip.kiwiSaver)}`} />
          <Row label="Net pay to employee" value={nzd(slip.net)} strong emphasis />
        </dl>
        {slip.employerKiwiSaver > 0 && (
          <dl className="text-sm divide-y divide-sage-50 mt-3 pt-1 border-t border-sage-100">
            <Row label="Employer KiwiSaver (3.5%)" value={nzd(slip.employerKiwiSaver)} strong />
            <Row label={`— ESCT (${(slip.esctRate * 100).toFixed(1)}%) to IRD`} value={`− ${nzd(slip.esct)}`} muted />
            <Row label="— net to employee's KiwiSaver" value={nzd(slip.employerKiwiSaverNet)} muted />
          </dl>
        )}
        <div className="mt-4 rounded-lg bg-sage-50 border border-sage-100 px-3 py-2 text-xs text-sage-600">
          <div className="font-semibold text-sage-700 mb-1">File with IRD (payday filing)</div>
          <div className="flex justify-between"><span>Gross earnings</span><span>{nzd(slip.gross)}</span></div>
          <div className="flex justify-between"><span>PAYE</span><span>{nzd(slip.paye)}</span></div>
          {slip.employerKiwiSaver > 0 && (
            <>
              <div className="flex justify-between"><span>Employer KiwiSaver (gross)</span><span>{nzd(slip.employerKiwiSaver)}</span></div>
              <div className="flex justify-between"><span>ESCT</span><span>{nzd(slip.esct)}</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong, muted, emphasis }: { label: string; value: string; strong?: boolean; muted?: boolean; emphasis?: boolean }) {
  return (
    <div className={clsx('flex justify-between py-1.5', muted && 'text-sage-400', emphasis && 'text-emerald-700')}>
      <dt className={clsx(strong ? 'font-semibold text-sage-800' : 'text-sage-600', muted && 'text-sage-400', emphasis && 'text-emerald-700')}>{label}</dt>
      <dd className={clsx(strong ? 'font-bold' : 'font-medium', !emphasis && !muted && 'text-sage-800')}>{value}</dd>
    </div>
  )
}
