// Remittance advice document — branded, print/PDF-friendly.
// Rendered on the public token route (PDF source + contractor view).

import Image from 'next/image'
import { formatCurrency, formatDate } from '@/lib/format'
import type { RemittanceData } from '@/lib/remittance-data'

export function RemittanceDocument({ data }: { data: RemittanceData }) {
  const periodLabel =
    data.periodStart && data.periodEnd
      ? `${formatDate(data.periodStart)} – ${formatDate(data.periodEnd)}`
      : '—'

  return (
    <div className="min-h-screen bg-sage-50 py-10 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm print:shadow-none border border-sage-100 print:border-0 overflow-hidden tnum">
        {/* Header */}
        <div className="bg-sage-800 px-8 py-6 flex items-start justify-between gap-6">
          <div>
            <Image src="/brand/sano-full-white.png" alt="Sano" width={96} height={32} className="h-7 w-auto" priority />
            <h1 className="text-white text-xl font-semibold mt-3">Remittance Advice</h1>
            <p className="text-sage-300 text-xs mt-0.5">{data.remittanceNumber}</p>
          </div>
          <div className="text-right text-sage-100 text-sm space-y-1 shrink-0">
            <div>
              <div className="text-sage-400 text-[11px] uppercase tracking-wide">Paid to</div>
              <div className="font-medium text-white">{data.contractorName}</div>
              {data.contractorCompany && <div className="text-sage-300 text-xs">{data.contractorCompany}</div>}
            </div>
            <div className="pt-1">
              <div className="text-sage-400 text-[11px] uppercase tracking-wide">Pay date</div>
              <div className="font-medium text-white">{formatDate(data.payDate)}</div>
            </div>
            <div>
              <div className="text-sage-400 text-[11px] uppercase tracking-wide">Period</div>
              <div className="text-white text-xs">{periodLabel}</div>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="px-8 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sage-500 border-b border-sage-200">
                <th className="py-2 pr-3 font-semibold">Job</th>
                <th className="py-2 pr-3 font-semibold">Address</th>
                <th className="py-2 pr-3 font-semibold text-right">Hours</th>
                <th className="py-2 font-semibold text-right">Pay</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-sage-400">No jobs in this remittance.</td></tr>
              ) : (
                data.lines.map((l, i) => (
                  <tr key={`${l.jobNumber}-${i}`} className="border-b border-sage-50">
                    <td className="py-2.5 pr-3 align-top">
                      <div className="font-medium text-sage-800">{l.jobNumber}</div>
                      {l.jobDate && <div className="text-[11px] text-sage-400">{formatDate(l.jobDate)}</div>}
                    </td>
                    <td className="py-2.5 pr-3 align-top text-sage-600">{l.address ?? '—'}</td>
                    <td className="py-2.5 pr-3 align-top text-right text-sage-700">{l.hours.toFixed(1)}h</td>
                    <td className="py-2.5 align-top text-right font-medium text-sage-800">{formatCurrency(l.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="py-3 pr-3 text-right font-semibold text-sage-800">Total paid</td>
                <td className="py-3 text-right text-lg font-bold text-sage-800">{formatCurrency(data.total)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="text-[11px] text-sage-400 mt-4 leading-relaxed">
            Amounts shown are the total paid for each job. You are responsible for your own GST and tax.
            Questions about your pay? Contact the Sano office.
          </p>
        </div>
      </div>
    </div>
  )
}
