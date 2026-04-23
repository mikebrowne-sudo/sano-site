import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { RefreshCw, Plus } from 'lucide-react'
import clsx from 'clsx'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function RecurringJobsPage() {
  const supabase = createClient()

  const { data: items, error } = await supabase
    .from('recurring_jobs')
    .select('id, title, address, frequency, status, next_due_date, last_generated_date, assigned_to, clients ( name )')
    .order('next_due_date', { ascending: true, nullsFirst: false })

  if (error) {
    return (
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Recurring Jobs</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">Failed to load: {error.message}</div>
      </div>
    )
  }

  const rows = (items ?? []).map((r) => {
    const client = r.clients as unknown as { name: string } | null
    return { id: r.id, title: r.title ?? '—', address: r.address ?? '', clientName: client?.name ?? '—', frequency: r.frequency, status: r.status, nextDue: r.next_due_date, lastGenerated: r.last_generated_date, assignedTo: r.assigned_to ?? '' }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Recurring Jobs</h1>
        <Link href="/portal/recurring-jobs/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Plus size={16} /> New Recurring Job
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <RefreshCw size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No recurring jobs yet.</p>
          <Link href="/portal/recurring-jobs/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
            <Plus size={16} /> Create your first
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Frequency</th>
                  <th className="px-5 py-3 font-semibold">Contractor</th>
                  <th className="px-5 py-3 font-semibold">Next Due</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/recurring-jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors font-medium text-sage-800">{row.title}</Link></td>
                    <td className="p-0"><Link href={`/portal/recurring-jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-700">{row.clientName}</Link></td>
                    <td className="p-0"><Link href={`/portal/recurring-jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600 capitalize">{row.frequency}</Link></td>
                    <td className="p-0"><Link href={`/portal/recurring-jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{row.assignedTo || <span className="text-sage-300">Unassigned</span>}</Link></td>
                    <td className="p-0"><Link href={`/portal/recurring-jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(row.nextDue)}</Link></td>
                    <td className="p-0"><Link href={`/portal/recurring-jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{row.status}</span></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/recurring-jobs/${row.id}`} className="block px-4 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{row.title}</span>
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{row.status}</span>
                </div>
                <div className="text-sage-600 text-sm">{row.clientName}</div>
                <div className="flex items-center justify-between mt-1 text-xs text-sage-500">
                  <span className="capitalize">{row.frequency}</span>
                  <span>Next: {fmtDate(row.nextDue)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
