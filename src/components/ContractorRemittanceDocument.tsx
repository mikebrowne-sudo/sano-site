// CI-based contractor remittance advice — branded, A4 print/PDF-friendly.
//
// Lines come snapshotted from the batch (job + address + note + optional
// hours + amount, plus any manual adjustment lines). Supports combined
// household payments — each line shows which contractor it belongs to.
// Contractor pay amounts only; no margin / client totals / quote / base
// price.
//
// Print: a self-contained @media print block (injected below) prints ONLY
// the advice — page chrome, nav, buttons and the admin preview banner all
// drop out via the visibility technique — and lays it out for A4 portrait
// with the Total kept once at the end of the document.

import Image from 'next/image'
import { formatCurrency, formatDate } from '@/lib/format'
import { cleanRemittanceAddress, noteAddsValue } from '@/lib/remittance-address'
import type { RemittanceBatch } from '@/lib/contractor-remittance-data'

// Injected print CSS. @page sets A4 + sensible margins; the visibility
// trick guarantees only the remittance prints (no sidebar, topbar, back
// links, "Open / print" buttons or preview banner). Rows avoid splitting
// across a page break; the dark header keeps its colour in print.
const REMITTANCE_PRINT_CSS = `
@page { size: A4 portrait; margin: 14mm; }
@media print {
  html, body { background: #ffffff !important; }
  body * { visibility: hidden !important; }
  .remit-print-root, .remit-print-root * { visibility: visible !important; }
  .remit-print-root {
    position: absolute;
    left: 0; top: 0;
    width: 100%;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }
  .remit-card {
    max-width: 100% !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  .remit-header {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .remit-row { break-inside: avoid; page-break-inside: avoid; }
  .remit-total { break-inside: avoid; page-break-inside: avoid; }
  .remit-screen-only { display: none !important; }
}
`

function formatHours(h: number | null): string {
  if (h == null) return ''
  return Number.isInteger(h) ? String(h) : String(Number(h.toFixed(2)))
}

export function ContractorRemittanceDocument({ data }: { data: RemittanceBatch }) {
  const payee = data.payeeLabel || data.contractorNames.join(' & ') || 'Contractor'
  const multi = data.contractorNames.length > 1
  // Show the Hours column only if at least one line actually has hours,
  // so fixed-price-only remittances aren't padded with an empty column.
  const showHours = data.lines.some((l) => l.hours != null)

  return (
    <div className="remit-print-root min-h-screen bg-sage-50 py-10 px-4 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: REMITTANCE_PRINT_CSS }} />
      <div className="remit-card max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-sage-100 overflow-hidden tnum">
        {/* Header */}
        <div className="remit-header bg-sage-800 px-8 py-6 flex items-start justify-between gap-6">
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
              <div className="pt-1">
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
                <th className="py-2 pr-3 font-semibold">Job / Details</th>
                {multi && <th className="py-2 pr-3 font-semibold">Contractor</th>}
                {showHours && <th className="py-2 pr-3 font-semibold text-right w-16">Hours</th>}
                <th className="py-2 font-semibold text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.length === 0 ? (
                <tr><td colSpan={2 + (multi ? 1 : 0) + (showHours ? 1 : 0)} className="py-6 text-center text-sage-400">No lines.</td></tr>
              ) : (
                data.lines.map((l, i) => {
                  if (l.kind === 'adjustment') {
                    return (
                      <tr key={i} className="remit-row border-b border-sage-50">
                        <td className="py-2.5 pr-3 align-top font-medium text-sage-800">{l.label || 'Adjustment'}</td>
                        {multi && <td className="py-2.5 pr-3" />}
                        {showHours && <td className="py-2.5 pr-3" />}
                        <td className="py-2.5 align-top text-right font-medium text-sage-800">{formatCurrency(l.amount)}</td>
                      </tr>
                    )
                  }
                  const address = cleanRemittanceAddress(l.jobAddress)
                  const detail = address ?? l.note ?? null
                  const showNote = address != null && noteAddsValue(l.note, address)
                  return (
                    <tr key={i} className="remit-row border-b border-sage-50">
                      <td className="py-2.5 pr-3 align-top">
                        <div className="font-medium text-sage-800">
                          {l.jobNumber ?? 'Job'}
                          {detail && <span className="text-sage-500 font-normal"> · {detail}</span>}
                        </div>
                        {showNote && <div className="text-[11px] text-sage-400 italic mt-0.5">{l.note}</div>}
                      </td>
                      {multi && <td className="py-2.5 pr-3 align-top text-sage-600">{l.contractorName ?? '—'}</td>}
                      {showHours && <td className="py-2.5 pr-3 align-top text-right text-sage-600">{formatHours(l.hours)}</td>}
                      <td className="py-2.5 align-top text-right font-medium text-sage-800">{formatCurrency(l.amount)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Total — kept once at the end of the document (never repeated
              mid-document on a multi-page print). */}
          <div className="remit-total mt-4 flex items-baseline justify-between border-t-2 border-sage-800 pt-3">
            <span className="font-semibold text-sage-800">Total paid</span>
            <span className="text-xl font-bold text-sage-800">{formatCurrency(data.total)}</span>
          </div>

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
