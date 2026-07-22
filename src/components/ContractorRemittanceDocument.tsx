// CI-based contractor remittance advice — branded, A4 print/PDF-friendly.
//
// Lines come snapshotted from the batch (job + address + note + optional
// hours + amount, plus any manual adjustment lines). Supports combined
// household payments — each line shows which contractor it belongs to.
// Contractor pay amounts only; no margin / client totals / quote / base
// price.
//
// Print: a self-contained @media print block (injected below) prints ONLY
// the advice — page chrome, nav, buttons, the admin preview banner and the
// on-screen print tip all drop out via the visibility technique — and lays
// it out as a single A4 portrait document: header banner, table, total and
// footer note share one content width, with the Total kept once at the end.
//
// Browser print headers/footers (date, "Sano Portal", URL, page number)
// are a browser-print-dialog setting, NOT controllable from CSS — the
// preview screen carries a tip telling the operator to switch them off.

import Image from 'next/image'
import { formatCurrency, formatDate } from '@/lib/format'
import { cleanRemittanceAddress } from '@/lib/remittance-address'
import type { RemittanceBatch } from '@/lib/contractor-remittance-data'

// Injected print CSS. @page sets A4 portrait + 14mm margins. The
// visibility trick guarantees only the remittance prints (no sidebar,
// topbar, back links, buttons, preview banner or print tip). The document
// stretches edge-to-edge of the page content box; rows avoid splitting
// across a page break; the dark banner keeps its colour in print.
const REMITTANCE_PRINT_CSS = `
@page { size: A4 portrait; margin: 14mm; }
@media print {
  html, body { background: #ffffff !important; }
  body * { visibility: hidden !important; }
  .remit-print-root, .remit-print-root * { visibility: visible !important; }
  .remit-print-root {
    position: absolute;
    left: 0; right: 0; top: 0;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }
  .remit-card {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    /* overflow:hidden (screen, for the rounded corners) makes Chromium
       treat the card as one atomic box and bump it to a fresh page when
       taller than A4. Reset so pagination + full-width banner work. */
    overflow: visible !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Banner spans the full document width — same edges as the page box. */
  .remit-header { width: 100% !important; }
  .remit-header {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .remit-row { break-inside: avoid; page-break-inside: avoid; }
  .remit-total { break-inside: avoid; page-break-inside: avoid; }
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
  const showDate = data.lines.some((l) => l.kind === 'invoice' && !!l.date)
  const colCount = 2 + (multi ? 1 : 0) + (showHours ? 1 : 0) + (showDate ? 1 : 0)

  return (
    <div className="remit-print-root min-h-screen bg-sage-50 py-10 px-4 print:bg-white print:py-0">
      <style dangerouslySetInnerHTML={{ __html: REMITTANCE_PRINT_CSS }} />
      <div className="remit-card max-w-[760px] mx-auto bg-white rounded-[10px] shadow-sm border border-sage-100 overflow-hidden tnum">
        {/* Header banner — shares the document content width with the body.
            rounded-t on the banner itself (not just the card clip) so the
            subtle rounded top corners survive in the server-generated PDF,
            where the card's overflow clip is removed for pagination. */}
        <div className="remit-header bg-sage-800 rounded-t-[10px] px-10 py-7 flex items-start justify-between gap-6">
          <div>
            <Image src="/brand/sano-full-white.png" alt="Sano" width={96} height={32} className="h-7 w-auto" priority />
            <h1 className="text-white text-xl font-semibold mt-3">Remittance Advice</h1>
            <p className="text-sage-300 text-xs mt-0.5">{data.remittanceNumber}</p>
          </div>
          <div className="text-right text-sage-100 text-sm space-y-1.5 shrink-0">
            <div>
              <div className="text-sage-400 text-[11px] uppercase tracking-wide">Paid to</div>
              <div className="font-medium text-white">{payee}</div>
            </div>
            <div>
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

        {/* Body — same horizontal padding as the banner. */}
        <div className="px-10 py-7">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sage-500 border-b border-sage-200">
                <th className="py-2 pr-3 font-semibold">Job / Details</th>
                {showDate && <th className="py-2 pr-3 font-semibold w-28">Date</th>}
                {multi && <th className="py-2 pr-3 font-semibold">Contractor</th>}
                {showHours && <th className="py-2 pr-3 font-semibold text-right w-16">Hours</th>}
                <th className="py-2 font-semibold text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.length === 0 ? (
                <tr><td colSpan={colCount} className="py-6 text-center text-sage-400">No lines.</td></tr>
              ) : (
                data.lines.map((l, i) => {
                  if (l.kind === 'adjustment') {
                    return (
                      <tr key={i} className="remit-row border-b border-sage-50">
                        <td className="py-2.5 pr-3 align-top font-medium text-sage-800">{l.label || 'Adjustment'}</td>
                        {showDate && <td className="py-2.5 pr-3" />}
                        {multi && <td className="py-2.5 pr-3" />}
                        {showHours && <td className="py-2.5 pr-3" />}
                        <td className="py-2.5 align-top text-right font-medium text-sage-800">{formatCurrency(l.amount)}</td>
                      </tr>
                    )
                  }
                  const address = cleanRemittanceAddress(l.jobAddress)
                  const detail = address ?? l.note ?? null
                  // Second line = the line note, shown verbatim (operator-
                  // controlled via the remittance edit page). Only when there
                  // is an address (else the note is already the primary line),
                  // and never a legacy dumped job description.
                  const rawNote = l.note?.trim() ?? ''
                  const noteLine =
                    address != null && rawNote.length > 0 && rawNote.length <= 160 ? rawNote : null
                  return (
                    <tr key={i} className="remit-row border-b border-sage-50">
                      <td className="py-2.5 pr-3 align-top">
                        <div className="font-medium text-sage-800">
                          {l.jobNumber ?? 'Job'}
                          {detail && <span className="text-sage-500 font-normal"> · {detail}</span>}
                        </div>
                        {noteLine && <div className="text-[11px] text-sage-400 italic mt-0.5">{noteLine}</div>}
                      </td>
                      {showDate && <td className="py-2.5 pr-3 align-top text-sage-600 whitespace-nowrap">{l.date ? formatDate(l.date) : ''}</td>}
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

          <p className="text-[11px] text-sage-400 mt-5 leading-relaxed">
            Please keep this remittance advice for your records. For any payment questions, contact the Sano team.
          </p>
        </div>
      </div>
    </div>
  )
}
