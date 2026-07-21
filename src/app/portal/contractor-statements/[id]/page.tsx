import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CornerDownRight } from 'lucide-react'
import { getStatementDetail } from '@/lib/contractor-statement-data'
import { periodLabel } from '@/lib/contractor-statement-period'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const GST_LABEL: Record<string, string> = {
  applied: 'GST applied',
  before_effective_date: 'Before GST registration',
  not_registered: 'Not GST registered',
  pending_review: 'GST — awaiting verification',
  incomplete: 'GST — details incomplete',
  not_assessed: 'GST — not assessed',
}

export default async function StatementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const s = await getStatementDetail(supabase, params.id)
  if (!s) notFound()

  const exGst = s.subtotal - s.gst_total

  return (
    <div>
      <Link
        href="/portal/contractor-statements"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to statements
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">{s.contractor_name ?? 'Unknown contractor'}</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-sage-500">
          <span>{s.statement_number}</span>
          <span>·</span>
          <span>{periodLabel({ period_start: s.period_start, period_end: s.period_end })}</span>
          <span className="inline-block px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs font-medium capitalize">{s.status}</span>
        </div>
        <p className="text-xs text-sage-400 mt-2">
          Contractor payment statement — this is <strong>not a tax invoice</strong>. GST shown is informational only.
        </p>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-6 max-w-md">
        <div className="flex justify-between text-sm py-1">
          <span className="text-sage-500">Subtotal (excl. confirmed GST)</span>
          <span className="text-sage-800 font-medium">{fmtCurrency(exGst)}</span>
        </div>
        <div className="flex justify-between text-sm py-1">
          <span className="text-sage-500">GST included (confirmed)</span>
          <span className="text-sage-800 font-medium">{fmtCurrency(s.gst_total)}</span>
        </div>
        <div className="flex justify-between text-sm py-1 border-t border-sage-100 mt-1 pt-2">
          <span className="text-sage-800 font-semibold">Total payable</span>
          <span className="text-sage-800 font-bold">{fmtCurrency(s.total_payable)}</span>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white rounded-xl border border-sage-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-sage-400 border-b border-sage-100">
                <th className="px-4 py-3 font-medium">Job</th>
                <th className="px-4 py-3 font-medium">Service date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium text-right">Hours</th>
                <th className="px-4 py-3 font-medium">GST</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {s.lines.map((l) => (
                <tr key={l.id} className="border-b border-sage-50 last:border-0">
                  <td className="px-4 py-3 text-sage-700 whitespace-nowrap">{l.job_number ?? l.invoice_number ?? '—'}</td>
                  <td className="px-4 py-3 text-sage-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {fmtDate(l.service_date)}
                      {l.carried && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]" title="Carried from a prior period">
                          <CornerDownRight size={10} /> carried
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sage-700">{l.service_description ?? '—'}</td>
                  <td className="px-4 py-3 text-sage-600">{l.site ?? '—'}</td>
                  <td className="px-4 py-3 text-sage-600 text-right whitespace-nowrap">
                    {l.pay_hours != null ? `${l.pay_hours}${l.pay_basis ? ` (${l.pay_basis})` : ''}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sage-600 whitespace-nowrap">{l.gst_status ? (GST_LABEL[l.gst_status] ?? l.gst_status) : '—'}</td>
                  <td className="px-4 py-3 text-sage-800 font-medium text-right whitespace-nowrap">{fmtCurrency(l.amount)}</td>
                </tr>
              ))}
              {s.lines.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sage-400">No lines on this statement.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
