import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Receipt, Plus } from 'lucide-react'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-gray-100 text-gray-700',
  approved: 'bg-blue-50 text-blue-700',
  paid:     'bg-emerald-50 text-emerald-700',
}

function fmt(d: number) { return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d) }
function fmtDate(iso: string | null) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default async function ContractorInvoicesPage() {
  const supabase = createClient()

  const { data: invoices, error } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, amount, date_submitted, date_paid, status, contractors ( full_name ), jobs ( job_number )')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Contractor Invoices</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">{error.message}</div>
      </div>
    )
  }

  const rows = (invoices ?? []).map((ci) => {
    const contractor = ci.contractors as unknown as { full_name: string } | null
    const job = ci.jobs as unknown as { job_number: string } | null
    return { id: ci.id, number: ci.invoice_number, contractor: contractor?.full_name ?? '—', job: job?.job_number ?? '—', amount: ci.amount, date: ci.date_submitted, datePaid: ci.date_paid, status: ci.status }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Contractor Invoices</h1>
        <Link href="/portal/contractor-invoices/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
          <Receipt size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No contractor invoices yet.</p>
          <Link href="/portal/contractor-invoices/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"><Plus size={16} /> Create first</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Invoice #</th>
                  <th className="px-5 py-3 font-semibold">Contractor</th>
                  <th className="px-5 py-3 font-semibold">Job</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-sage-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/contractor-invoices/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{r.number}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractor-invoices/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-700">{r.contractor}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractor-invoices/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{r.job}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractor-invoices/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(r.date)}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractor-invoices/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[r.status])}>{r.status}</span></Link></td>
                    <td className="p-0"><Link href={`/portal/contractor-invoices/${r.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-right font-medium text-sage-800">{fmt(r.amount)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden divide-y divide-sage-100">
            {rows.map((r) => (
              <Link key={r.id} href={`/portal/contractor-invoices/${r.id}`} className="block px-4 py-4 hover:bg-sage-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{r.number}</span>
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[r.status])}>{r.status}</span>
                </div>
                <div className="text-sage-600 text-sm">{r.contractor}</div>
                <div className="flex items-center justify-between mt-1 text-xs text-sage-500">
                  <span>{fmtDate(r.date)}</span>
                  <span className="font-medium text-sage-800 text-sm">{fmt(r.amount)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
