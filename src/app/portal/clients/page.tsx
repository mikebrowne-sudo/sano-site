import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Users, Plus } from 'lucide-react'
import { ClientSearch } from './_components/ClientSearch'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''

  let query = supabase
    .from('clients')
    .select('id, name, company_name, phone, email')
    .order('name')

  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data: clients, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Clients</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load clients: {error.message}
        </div>
      </div>
    )
  }

  const rows = clients ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Clients</h1>
        <Link
          href="/portal/clients/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          New Client
        </Link>
      </div>

      <ClientSearch defaultValue={q} />

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center mt-4">
          <Users size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">
            {q ? `No clients matching "${q}".` : 'No clients yet.'}
          </p>
          {!q && (
            <Link
              href="/portal/clients/new"
              className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
            >
              <Plus size={16} />
              Add your first client
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-4">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Company</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/clients/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{c.name}</Link></td>
                    <td className="p-0"><Link href={`/portal/clients/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{c.company_name || '—'}</Link></td>
                    <td className="p-0"><Link href={`/portal/clients/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{c.phone || '—'}</Link></td>
                    <td className="p-0"><Link href={`/portal/clients/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{c.email || '—'}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((c) => (
              <Link key={c.id} href={`/portal/clients/${c.id}`} className="block px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="font-medium text-sage-800">{c.name}</div>
                {c.company_name && <div className="text-sage-600 text-sm">{c.company_name}</div>}
                <div className="flex items-center gap-4 mt-1 text-xs text-sage-500">
                  {c.phone && <span>{c.phone}</span>}
                  {c.email && <span>{c.email}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
