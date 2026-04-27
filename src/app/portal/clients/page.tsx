import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Users, Plus, Archive } from 'lucide-react'
import { ClientSearch } from './_components/ClientSearch'
import clsx from 'clsx'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; archived?: string }
}) {
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''
  // Phase 5.5.10 — archived clients are hidden by default. Toggle via
  // ?archived=1 on the list URL.
  const showArchived = searchParams.archived === '1'

  let query = supabase
    .from('clients')
    .select('id, name, company_name, phone, email, is_archived')
    .order('name')

  if (!showArchived) {
    query = query.eq('is_archived', false)
  }
  if (q) {
    query = query.ilike('name', `%${q}%`)
  }

  const { data: clients, error } = await query

  // Phase 5.5.10 — flag rows that share an email or phone (case-insensitive
  // for email, normalised digits for phone). Lightweight client-side pass
  // — at 23 rows today this is cheap, and the cleanup dashboard handles
  // the heavy detection.
  const dupKeys = new Map<string, number>()
  function bump(k: string) { dupKeys.set(k, (dupKeys.get(k) ?? 0) + 1) }
  for (const c of (clients ?? []) as { email: string | null; phone: string | null }[]) {
    if (c.email && c.email.trim()) bump('e:' + c.email.trim().toLowerCase())
    const digits = (c.phone ?? '').replace(/\D+/g, '')
    if (digits.length >= 6) bump('p:' + digits)
  }
  function isDupe(c: { email: string | null; phone: string | null }) {
    if (c.email && c.email.trim() && (dupKeys.get('e:' + c.email.trim().toLowerCase()) ?? 0) > 1) return true
    const digits = (c.phone ?? '').replace(/\D+/g, '')
    if (digits.length >= 6 && (dupKeys.get('p:' + digits) ?? 0) > 1) return true
    return false
  }

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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <ClientSearch defaultValue={q} />
        <Link
          href={showArchived
            ? `/portal/clients${q ? `?q=${encodeURIComponent(q)}` : ''}`
            : `/portal/clients?archived=1${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          className="inline-flex items-center gap-1.5 text-xs text-sage-600 hover:text-sage-800 transition-colors"
        >
          <Archive size={12} />
          {showArchived ? 'Hide archived' : 'Show archived'}
        </Link>
      </div>

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
                  <tr key={c.id} className={clsx('border-b border-gray-50 last:border-0 group', (c as { is_archived?: boolean }).is_archived && 'opacity-60')}>
                    <td className="p-0">
                      <Link href={`/portal/clients/${c.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors">
                        <span className="font-medium text-sage-800">{c.name}</span>
                        {(c as { is_archived?: boolean }).is_archived && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-2 py-0.5"><Archive size={10} /> Archived</span>
                        )}
                        {isDupe(c) && (
                          <span className="ml-2 inline-block text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">Possible duplicate</span>
                        )}
                      </Link>
                    </td>
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
              <Link key={c.id} href={`/portal/clients/${c.id}`} className={clsx('block px-4 py-4 hover:bg-gray-50 transition-colors', (c as { is_archived?: boolean }).is_archived && 'opacity-60')}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sage-800">{c.name}</span>
                  {(c as { is_archived?: boolean }).is_archived && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-2 py-0.5"><Archive size={10} /> Archived</span>
                  )}
                  {isDupe(c) && (
                    <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">Possible duplicate</span>
                  )}
                </div>
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
