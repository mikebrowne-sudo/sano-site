// CI-based contractor remittance advice — branded, print/PDF-friendly.
// Lines come snapshotted from the batch (job + address + note + amount,
// plus any manual adjustment lines). Supports combined household
// payments — each line shows which contractor it belongs to. Contractor
// pay amounts only; no margin / client totals / quote / base price.

import Image from 'next/image'
import { formatCurrency, formatDate } from '@/lib/format'
import type { RemittanceBatch } from '@/lib/contractor-remittance-data'

export function ContractorRemittanceDocument({ data }: { data: RemittanceBatch }) {
  const payee = data.payeeLabel || data.contractorNames.join(' & ') || 'Contractor'
  const multi = data.contractorNames.length > 1

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
              <div className="font-medium text-white">{payee}</div>
            </div>
            <div className="pt-1">
              <div className="text-sage-400 text-[11px] uppercase tracking-wide">Payment date</div>
              <div className="font-medium text-white">{formatDate(data.paymentDate)}</div>
            </div>
            {data.reference && (
              <div>
                <div className="text-sage-400 text-[11px] uppercase tracking-wide">Reference</div>
                <div className="text-white text-xs">{data.reference}</div>
              </div>
            )}
          </div>
        </div>

        {/* Lines */}
        <div className="px-8 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sage-500 border-b border-sage-200">
                {multi && <th className="py-2 pr-3 font-semibold">Contractor</th>}
                <th className="py-2 pr-3 font-semibold">Job</th>
                <th className="py-2 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.length === 0 ? (
                <tr><td colSpan={multi ? 3 : 2} className="py-6 text-center text-sage-400">No lines.</td></tr>
              ) : (
                data.lines.map((l, i) => (
                  <tr key={i} className="border-b border-sage-50">
                    {multi && <td className="py-2.5 pr-3 align-top text-sage-600">{l.kind === 'invoice' ? (l.contractorName ?? '—') : ''}</td>}
                    <td className="py-2.5 pr-3 align-top">
                      {l.kind === 'adjustment' ? (
                        <div className="font-medium text-sage-800">{l.label || 'Adjustment'}</div>
                      ) : (
                        <>
                          <div className="font-medium text-sage-800">
                            {l.jobNumber ?? 'Job'}
                            {l.jobAddress && <span className="text-sage-500 font-normal"> — {l.jobAddress}</span>}
                          </div>
                          {l.note && <div className="text-[11px] text-sage-400 italic mt-0.5">{l.note}</div>}
                        </>
                      )}
                    </td>
                    <td className="py-2.5 align-top text-right font-medium text-sage-800">{formatCurrency(l.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={multi ? 2 : 1} className="py-3 pr-3 text-right font-semibold text-sage-800">Total paid</td>
                <td className="py-3 text-right text-lg font-bold text-sage-800">{formatCurrency(data.total)}</td>
              </tr>
            </tfoot>
          </table>

          {data.notes && <p className="text-xs text-sage-600 mt-4 whitespace-pre-wrap">{data.notes}</p>}

          <p className="text-[11px] text-sage-400 mt-4 leading-relaxed">
            Amounts shown are the total paid for each job. You are responsible for your own GST and tax.
            Questions about your pay? Contact the Sano office.
          </p>
        </div>
      </div>
    </div>
  )
}
