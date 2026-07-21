// Read-only render of an issued contractor statement, straight from the
// immutable issued_snapshot. Used by the staff issued view AND the contractor
// portal view so the two can never drift. This is NOT a tax invoice.

import type { IssuedSnapshot } from '@/lib/contractor-statement-snapshot'
import { CornerDownRight } from 'lucide-react'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

/** Contractor-facing GST wording. Never "$0 GST"; never a claimed split for flagged rows. */
function gstCell(status: string | null, amount: number | null): string {
  if (status === 'applied') return amount != null ? `GST ${fmtCurrency(amount)}` : 'GST applied'
  if (status === 'not_registered' || status === 'before_effective_date') return 'No GST component applied'
  return 'GST treatment awaiting verification'
}

export function ContractorStatementSnapshot({ snapshot, superseded }: { snapshot: IssuedSnapshot; superseded?: boolean }) {
  const exGst = snapshot.subtotal - snapshot.gst_total
  return (
    <div>
      {superseded && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This statement has been <strong>superseded</strong> by a corrected statement. It is kept as a record of what was originally issued.
        </div>
      )}

      <div className="mb-5">
        <h1 className="text-2xl font-bold text-sage-800">{snapshot.supplier_name}</h1>
        <div className="text-sm text-sage-500 mt-1">
          <span>{snapshot.statement_number}</span>
          <span className="mx-1.5">·</span>
          <span>{fmtDate(snapshot.period_start)} – {fmtDate(snapshot.period_end)}</span>
        </div>
        {snapshot.contractor_contact_name && snapshot.contractor_contact_name !== snapshot.supplier_name && (
          <div className="text-xs text-sage-400 mt-0.5">Contact: {snapshot.contractor_contact_name}</div>
        )}
        <div className="text-xs text-sage-400 mt-0.5">
          Issued {fmtDate(snapshot.issued_at)} · Please review by <strong>{fmtDate(snapshot.review_due_at)}</strong>
          {!snapshot.supplier_identity_verified && snapshot.supplier_name_source !== 'full_name' && ' · supplier identity unverified'}
        </div>
        <p className="text-xs text-sage-400 mt-2">
          Contractor payment statement — this is <strong>not a tax invoice</strong>. GST shown is informational only. Payment is not necessarily made on the issue date.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-6 max-w-md">
        <div className="flex justify-between text-sm py-1"><span className="text-sage-500">Subtotal (excl. confirmed GST)</span><span className="text-sage-800 font-medium">{fmtCurrency(exGst)}</span></div>
        <div className="flex justify-between text-sm py-1"><span className="text-sage-500">GST included (confirmed)</span><span className="text-sage-800 font-medium">{fmtCurrency(snapshot.gst_total)}</span></div>
        <div className="flex justify-between text-sm py-1 border-t border-sage-100 mt-1 pt-2"><span className="text-sage-800 font-semibold">Total payable</span><span className="text-sage-800 font-bold">{fmtCurrency(snapshot.total_payable)}</span></div>
      </div>

      <div className="bg-white rounded-xl border border-sage-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-sage-400 border-b border-sage-100">
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Service date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium text-right">Hours / rate</th>
                <th className="px-4 py-3 font-medium">GST</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.lines.map((l) => (
                <tr key={l.contractor_invoice_id} className="border-b border-sage-50 last:border-0">
                  <td className="px-4 py-3 text-sage-700 whitespace-nowrap">{l.job_number ?? l.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-sage-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {fmtDate(l.service_date)}
                      {l.carried_forward && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]" title="Carried from a prior period">
                          <CornerDownRight size={10} /> carried
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sage-700">{l.description ?? '—'}</td>
                  <td className="px-4 py-3 text-sage-600">{l.site ?? '—'}</td>
                  <td className="px-4 py-3 text-sage-600 text-right whitespace-nowrap">
                    {l.hours != null ? `${l.hours}${l.rate != null ? ` @ ${fmtCurrency(l.rate)}` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sage-600 whitespace-nowrap">{gstCell(l.gst_status, l.gst_amount)}</td>
                  <td className="px-4 py-3 text-sage-800 font-medium text-right whitespace-nowrap">{fmtCurrency(l.amount)}</td>
                </tr>
              ))}
              {snapshot.lines.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sage-400">No lines.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
