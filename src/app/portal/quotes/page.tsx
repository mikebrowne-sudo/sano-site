import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { FileText, Plus, FileSearch } from 'lucide-react'
import { StatusBadge } from '../_components/StatusBadge'

function formatCurrency(dollars: number) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
  }).format(dollars)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default async function QuotesPage() {
  const supabase = createClient()

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      base_price,
      discount,
      date_issued,
      valid_until,
      created_at,
      service_address,
      service_category,
      version_number,
      clients ( name ),
      quote_items ( price )
    `)
    .is('deleted_at', null)
    .eq('is_latest_version', true)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Quotes</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load quotes: {error.message}
        </div>
      </div>
    )
  }

  const rows = (quotes ?? []).map((q) => {
    const client = q.clients as unknown as { name: string } | null
    const items = (q.quote_items ?? []) as { price: number }[]
    const addOns = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const total = (q.base_price ?? 0) + addOns - (q.discount ?? 0)

    const versionNumber = (q.version_number as number | null) ?? 1
    const displayNumber = versionNumber > 1
      ? `${q.quote_number}-v${versionNumber}`
      : q.quote_number

    return {
      id: q.id,
      quoteNumber: displayNumber,
      versionNumber,
      clientName: client?.name ?? 'No client',
      address: q.service_address ?? null,
      status: q.status ?? 'draft',
      dateIssued: q.date_issued,
      validUntil: q.valid_until,
      total,
      isCommercial: q.service_category === 'commercial',
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Quotes</h1>
        <Link
          href="/portal/quotes/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          New Quote
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <FileText size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No quotes yet.</p>
          <Link
            href="/portal/quotes/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            Create your first quote
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Quote #</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Address</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Valid until</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                  <th className="px-3 py-3 font-semibold text-right" aria-label="Actions"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{row.quoteNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-700">{row.clientName}</Link></td>
                    <td className="p-0">
                      <Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">
                        {row.address ? (
                          <span className="block max-w-[180px] truncate" title={row.address}>{row.address}</span>
                        ) : (
                          <span className="text-sage-400">—</span>
                        )}
                      </Link>
                    </td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors"><StatusBadge kind="quote" status={row.status} /></Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{formatDate(row.dateIssued)}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{formatDate(row.validUntil)}</Link></td>
                    <td className="p-0"><Link href={`/portal/quotes/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-right font-medium text-sage-800">{formatCurrency(row.total)}</Link></td>
                    <td className="px-3 py-3 text-right">
                      {row.isCommercial && (
                        <Link
                          href={`/portal/quotes/${row.id}/proposal`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Commercial Proposal"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-sage-500 hover:text-sage-800 hover:bg-sage-100 transition-colors"
                        >
                          <FileSearch size={15} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/quotes/${row.id}`} className="block px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{row.quoteNumber}</span>
                  <StatusBadge kind="quote" status={row.status} />
                </div>
                <div className="text-sage-600 text-sm">{row.clientName}</div>
                {row.address && (
                  <div className="text-sage-500 text-xs truncate">{row.address}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{formatDate(row.dateIssued)}</span>
                  <span className="font-medium text-sage-800 text-sm">{formatCurrency(row.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
