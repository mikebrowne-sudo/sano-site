import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { HardHat, Plus } from 'lucide-react'
import clsx from 'clsx'

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export default async function ContractorsPage() {
  const supabase = createClient()

  const { data: contractors, error } = await supabase
    .from('contractors')
    .select('id, full_name, email, phone, hourly_rate, status, worker_type')
    .order('full_name')

  if (error) {
    return (
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Contractors</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load contractors: {error.message}
        </div>
      </div>
    )
  }

  const rows = contractors ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Contractors</h1>
        <Link
          href="/portal/contractors/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          New Contractor
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <HardHat size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No contractors yet.</p>
          <Link
            href="/portal/contractors/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            Add your first contractor
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Rate</th>
                  <th className="px-5 py-3 font-semibold">Type</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/contractors/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{c.full_name}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractors/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{c.email || '—'}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractors/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{c.phone || '—'}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractors/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtCurrency(c.hourly_rate)}/hr</Link></td>
                    <td className="p-0"><Link href={`/portal/contractors/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600 capitalize">{(c.worker_type ?? 'contractor').replace('_', ' ')}</Link></td>
                    <td className="p-0"><Link href={`/portal/contractors/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{c.status}</span></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((c) => (
              <Link key={c.id} href={`/portal/contractors/${c.id}`} className="block px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{c.full_name}</span>
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{c.status}</span>
                </div>
                <div className="text-sage-600 text-sm">{c.email || c.phone || '—'}</div>
                {c.hourly_rate != null && <div className="text-sage-500 text-xs mt-1">{fmtCurrency(c.hourly_rate)}/hr</div>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
