import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Receipt } from 'lucide-react'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
}

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InvoicesPage() {
  const supabase = createClient()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, base_price, discount,
      date_issued, due_date, created_at,
      clients ( name ),
      invoice_items ( price )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Invoices</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load invoices: {error.message}
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().slice(0, 10)

  const rows = (invoices ?? []).map((inv) => {
    const client = inv.clients as unknown as { name: string } | null
    const items = (inv.invoice_items ?? []) as { price: number }[]
    const addOns = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const total = (inv.base_price ?? 0) + addOns - (inv.discount ?? 0)
    const dbStatus = inv.status ?? 'draft'
    const isOverdue = dbStatus === 'sent' && inv.due_date && inv.due_date < today

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: client?.name ?? 'No client',
      status: isOverdue ? 'overdue' : dbStatus,
      dateIssued: inv.date_issued,
      dueDate: inv.due_date,
      total,
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Invoices</h1>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
          <Receipt size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No invoices yet. Convert a quote to create one.</p>
          <Link
            href="/portal/quotes"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            View Quotes
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Invoice #</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Due</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-sage-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{row.invoiceNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-700">{row.clientName}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>{row.status}</span></Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(row.dateIssued)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(row.dueDate)}</Link></td>
                    <td className="p-0"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-right font-medium text-sage-800">{fmt(row.total)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-sage-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/invoices/${row.id}`} className="block px-4 py-4 hover:bg-sage-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{row.invoiceNumber}</span>
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>
                    {row.status}
                  </span>
                </div>
                <div className="text-sage-600 text-sm">{row.clientName}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{fmtDate(row.dateIssued)}</span>
                  <span className="font-medium text-sage-800 text-sm">{fmt(row.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
