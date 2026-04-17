'use client'

import { useState } from 'react'
import { calculatePayPreview } from '@/lib/nz-paye'
import clsx from 'clsx'

function fmt(d: number) { return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d) }

export function PayPreview({ contractor }: {
  contractor: {
    hourly_rate: number | null
    base_hourly_rate: number | null
    loaded_hourly_rate: number | null
    holiday_pay_percent: number | null
    pay_frequency: string | null
    standard_hours: number | null
    tax_code: string | null
    holiday_pay_method: string | null
    kiwisaver_enrolled: boolean
    kiwisaver_employee_rate: number | null
    kiwisaver_employer_rate: number | null
  }
}) {
  const [hours, setHours] = useState(String(contractor.standard_hours ?? 40))

  const isPaygo = contractor.holiday_pay_method === 'pay_as_you_go_8_percent'
  const baseRate = contractor.base_hourly_rate ?? contractor.hourly_rate ?? 0
  const loadedRate = contractor.loaded_hourly_rate ?? baseRate
  const effectiveRate = isPaygo ? loadedRate : baseRate
  const hoursNum = parseFloat(hours) || 0

  const result = calculatePayPreview({
    hoursWorked: hoursNum,
    hourlyRate: effectiveRate,
    payFrequency: (contractor.pay_frequency as 'weekly' | 'fortnightly') || 'fortnightly',
    taxCode: contractor.tax_code || 'M',
    kiwisaverEnrolled: contractor.kiwisaver_enrolled,
    kiwisaverEmployeeRate: contractor.kiwisaver_employee_rate ?? 3,
    kiwisaverEmployerRate: contractor.kiwisaver_employer_rate ?? 3,
    holidayPayMethod: isPaygo ? null : contractor.holiday_pay_method,
  })

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">Hours worked</span>
          <input type="number" step="0.5" min="0" value={hours} onChange={(e) => setHours(e.target.value)} className="w-32 rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm focus:outline-none focus:ring-2 focus:ring-sage-500" />
        </label>
        <div className="text-sm text-sage-600">
          {isPaygo ? (
            <span>Base ${baseRate.toFixed(2)}/hr → <span className="font-semibold text-emerald-700">Loaded ${loadedRate.toFixed(2)}/hr</span> (incl. {contractor.holiday_pay_percent ?? 8}% holiday)</span>
          ) : (
            <span>${effectiveRate.toFixed(2)}/hr</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <Row label={`Gross pay (${hoursNum}h × $${effectiveRate.toFixed(2)})`} value={fmt(result.grossPay)} />
            {result.holidayPay > 0 && <Row label="Holiday pay (8%)" value={fmt(result.holidayPay)} />}
            {result.holidayPay > 0 && <Row label="Effective gross" value={fmt(result.effectiveGross)} bold />}
            {isPaygo && <Row label="(Holiday pay included in loaded rate)" value="" note />}
            <Row label={`PAYE (${contractor.tax_code || 'M'})`} value={`-${fmt(result.paye)}`} color="red" />
            {result.employeeKiwisaver > 0 && <Row label={`KiwiSaver employee (${contractor.kiwisaver_employee_rate ?? 3}%)`} value={`-${fmt(result.employeeKiwisaver)}`} color="red" />}
            <Row label="Net pay" value={fmt(result.netPay)} bold color="emerald" highlight />
          </tbody>
        </table>
      </div>

      <div className="bg-sage-50 rounded-xl border border-sage-100 mt-3 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <Row label="Gross pay" value={fmt(result.effectiveGross)} />
            {result.employerKiwisaver > 0 && <Row label={`KiwiSaver employer (${contractor.kiwisaver_employer_rate ?? 3}%)`} value={fmt(result.employerKiwisaver)} />}
            <Row label="Total employer cost" value={fmt(result.totalEmployerCost)} bold />
          </tbody>
        </table>
      </div>

      <p className="text-xs text-sage-400 mt-3">Preview only — based on {contractor.pay_frequency ?? 'fortnightly'} pay period. Actual amounts may vary.</p>
    </div>
  )
}

function Row({ label, value, bold, color, highlight, note }: { label: string; value: string; bold?: boolean; color?: string; highlight?: boolean; note?: boolean }) {
  if (note) {
    return <tr><td colSpan={2} className="px-4 py-1.5 text-xs text-sage-400 italic">{label}</td></tr>
  }
  return (
    <tr className={clsx(highlight && 'bg-emerald-50')}>
      <td className={clsx('px-4 py-2.5', bold ? 'font-semibold text-sage-800' : 'text-sage-600')}>{label}</td>
      <td className={clsx('px-4 py-2.5 text-right font-mono', bold && 'font-bold', color === 'red' ? 'text-red-600' : color === 'emerald' ? 'text-emerald-700' : 'text-sage-800')}>{value}</td>
    </tr>
  )
}
