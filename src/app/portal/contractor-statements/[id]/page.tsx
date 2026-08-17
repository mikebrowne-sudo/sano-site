// Historical statement detail — READ-ONLY (Phase 2, 2026-08-17).
//
// The IssuePanel (issue · resend · confirm-on-behalf · extend deadline ·
// supersede) is removed: statements are retired as an active workflow and every
// one of those actions is stubbed. What remains is the record itself.
//
// Both render modes are kept so nothing becomes unreachable — an issued
// statement still renders from its immutable snapshot, a draft still renders
// live from its linked payables. Neither is rewritten.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { CornerDownRight } from 'lucide-react'
import { BackLink } from '../../_components/BackLink'
import { getStatementDetail } from '@/lib/contractor-statement-data'
import { periodLabel } from '@/lib/contractor-statement-period'
import type { IssuedSnapshot } from '@/lib/contractor-statement-snapshot'
import { ContractorStatementSnapshot } from '@/components/ContractorStatementSnapshot'

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(n)
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Show the GST component only where it's applied; non-applied lines show nothing.
function gstLabel(status: string | null): string {
  return status === 'applied' ? 'GST applied' : ''
}

export default async function StatementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: stmt } = await supabase
    .from('contractor_statements')
    .select('id, status, issued_snapshot, review_due_at, confirmed_source')
    .eq('id', params.id)
    .maybeSingle()
  if (!stmt) notFound()

  const status = stmt.status as string
  const snapshot = stmt.issued_snapshot as IssuedSnapshot | null

  // Draft → live detail; issued+ → render from the immutable snapshot.
  const detail = status === 'draft' ? await getStatementDetail(supabase, params.id) : null

  return (
    <div>
      <BackLink fallbackHref="/portal/contractor-statements" label="Back to statements" />

      <div className="rounded-xl border border-sage-200 bg-sage-50 p-4 mb-6 text-sm text-sage-700">
        <p>
          <span className="font-semibold">Historical record — read-only.</span> The
          statement workflow is retired; contractor pay runs through{' '}
          <Link href="/portal/contractor-invoices/pay-run" className="underline hover:text-sage-900">Pay run</Link>.
        </p>
      </div>

      {snapshot ? (
        <ContractorStatementSnapshot snapshot={snapshot} superseded={status === 'superseded'} />
      ) : detail ? (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-sage-800">{detail.contractor_name ?? 'Unknown contractor'}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-sage-500">
              <span>{detail.statement_number}</span><span>·</span>
              <span>{periodLabel({ period_start: detail.period_start, period_end: detail.period_end })}</span>
              <span className="inline-block px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-xs font-medium capitalize">{detail.status}</span>
            </div>
            <p className="text-xs text-sage-400 mt-2">Draft — live from linked payables. Not a tax invoice.</p>
          </div>
          <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-5 mb-6 max-w-md">
            <div className="flex justify-between text-sm py-1"><span className="text-sage-500">Subtotal (excl. confirmed GST)</span><span className="text-sage-800 font-medium">{fmtCurrency(detail.subtotal - detail.gst_total)}</span></div>
            <div className="flex justify-between text-sm py-1"><span className="text-sage-500">GST included (confirmed)</span><span className="text-sage-800 font-medium">{fmtCurrency(detail.gst_total)}</span></div>
            <div className="flex justify-between text-sm py-1 border-t border-sage-100 mt-1 pt-2"><span className="text-sage-800 font-semibold">Total payable</span><span className="text-sage-800 font-bold">{fmtCurrency(detail.total_payable)}</span></div>
          </div>
          <div className="bg-white rounded-xl border border-sage-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-sage-400 border-b border-sage-100">
                    <th className="px-4 py-3 font-medium">Job</th><th className="px-4 py-3 font-medium">Service date</th><th className="px-4 py-3 font-medium">Description</th><th className="px-4 py-3 font-medium">Site</th><th className="px-4 py-3 font-medium text-right">Hours</th><th className="px-4 py-3 font-medium">GST</th><th className="px-4 py-3 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((l) => (
                    <tr key={l.id} className="border-b border-sage-50 last:border-0">
                      <td className="px-4 py-3 text-sage-700 whitespace-nowrap">{l.job_number ?? l.invoice_number ?? '—'}</td>
                      <td className="px-4 py-3 text-sage-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">{fmtDate(l.service_date)}{l.carried && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px]"><CornerDownRight size={10} /> carried</span>}</div>
                      </td>
                      <td className="px-4 py-3 text-sage-700">{l.service_description ?? '—'}</td>
                      <td className="px-4 py-3 text-sage-600">{l.site ?? '—'}</td>
                      <td className="px-4 py-3 text-sage-600 text-right whitespace-nowrap">{l.pay_hours != null ? `${l.pay_hours}${l.pay_basis ? ` (${l.pay_basis})` : ''}` : '—'}</td>
                      <td className="px-4 py-3 text-sage-600 whitespace-nowrap">{gstLabel(l.gst_status)}</td>
                      <td className="px-4 py-3 text-sage-800 font-medium text-right whitespace-nowrap">{fmtCurrency(l.amount)}</td>
                    </tr>
                  ))}
                  {detail.lines.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-sage-400">No lines on this statement.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        notFound()
      )}
    </div>
  )
}
