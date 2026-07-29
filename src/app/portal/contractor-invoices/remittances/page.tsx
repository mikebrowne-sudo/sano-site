// Saved CI-based remittance batches — admin list. Find and reopen any
// remittance created via the builder. Read-only summary; the Open action
// reuses the existing branded preview/print page at
// /portal/contractor-invoices/remittances/[id]. Contractor pay amounts
// only — no margin / client totals / quote / base price.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Plus, CheckCircle2, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { listRemittanceBatches } from '@/lib/contractor-remittance-data'
import { SendRemittanceButton } from '@/components/SendRemittanceButton'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function SavedRemittancesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const batches = await listRemittanceBatches()

  return (
    <div className="max-w-5xl mx-auto">
      <Link href="/portal/contractor-invoices" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Back to contractor invoices
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Saved remittances</h1>
          <p className="text-sm text-sage-500 mt-0.5">{batches.length} remittance{batches.length === 1 ? '' : 's'} created.</p>
        </div>
        <Link href="/portal/contractor-invoices/remittances/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Plus size={16} /> New remittance
        </Link>
      </div>

      {batches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <FileText size={28} className="mx-auto text-sage-300" />
          <p className="text-sage-600 mt-3 text-sm">No remittances yet.</p>
          <Link href="/portal/contractor-invoices/remittances/new" className="inline-flex items-center gap-2 mt-4 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
            <Plus size={16} /> Create the first remittance
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden tnum">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sage-500 border-b border-sage-200 bg-sage-50/50">
                  <th className="py-3 px-4 font-semibold">Remittance</th>
                  <th className="py-3 px-4 font-semibold">Payee</th>
                  <th className="py-3 px-4 font-semibold">Payment date</th>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold">Paid</th>
                  <th className="py-3 px-4 font-semibold">Sent</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const payee = b.payeeLabel || b.contractorNames.join(' & ') || '—'
                  return (
                    <tr key={b.id} className="border-b border-sage-50 hover:bg-sage-50/40">
                      <td className="py-3 px-4 font-medium text-sage-800">{b.remittanceNumber}</td>
                      <td className="py-3 px-4 text-sage-700">{payee}</td>
                      <td className="py-3 px-4 text-sage-600">{formatDate(b.paymentDate)}</td>
                      <td className="py-3 px-4 text-sage-500 max-w-[180px] truncate" title={b.reference ?? ''}>{b.reference || '—'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-sage-800">{formatCurrency(b.total)}</td>
                      <td className="py-3 px-4">
                        {b.paymentConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium" title="Matched to an outgoing bank payment">
                            <CheckCircle2 size={12} /> Confirmed
                          </span>
                        ) : b.paidAt ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium" title="Marked paid but not yet matched to a bank payment — reconcile on Finance → Outgoing reconciliation">
                            <Clock size={12} /> Paid, unconfirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {b.sentAt ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700">
                            <CheckCircle2 size={14} /> <span className="text-xs">{formatDateTime(b.sentAt)}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Not sent</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sage-500">{formatDate(b.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-3">
                          {!b.sentAt && <SendRemittanceButton id={b.id} sentAt={b.sentAt} variant="compact" />}
                          <Link href={`/portal/contractor-invoices/remittances/${b.id}`} className="inline-flex items-center gap-1.5 text-sage-600 hover:text-sage-800 font-medium">
                            Open
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
