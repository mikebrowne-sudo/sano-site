import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Briefcase, Plus } from 'lucide-react'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function statusLabel(s: string) {
  return s.replace('_', ' ')
}

export default async function JobsPage() {
  const supabase = createClient()

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_number, title, status, scheduled_date, created_at, clients ( name )')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-sage-800 mb-6">Jobs</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load jobs: {error.message}
        </div>
      </div>
    )
  }

  const rows = (jobs ?? []).map((j) => {
    const client = j.clients as unknown as { name: string } | null
    return {
      id: j.id,
      jobNumber: j.job_number,
      clientName: client?.name ?? '—',
      title: j.title ?? '—',
      status: j.status ?? 'draft',
      scheduledDate: j.scheduled_date,
      createdAt: j.created_at,
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Jobs</h1>
        <Link
          href="/portal/jobs/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          New Job
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-sage-100 p-10 text-center">
          <Briefcase size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-600 text-sm mb-4">No jobs yet.</p>
          <Link
            href="/portal/jobs/new"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Plus size={16} />
            Create your first job
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Job #</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Scheduled</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-sage-50 last:border-0 group">
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors font-medium text-sage-800">{row.jobNumber}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-700">{row.clientName}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-700">{row.title}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors"><span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>{statusLabel(row.status)}</span></Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(row.scheduledDate)}</Link></td>
                    <td className="p-0"><Link href={`/portal/jobs/${row.id}`} className="block px-5 py-3 group-hover:bg-sage-50/50 transition-colors text-sage-600">{fmtDate(row.createdAt)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-sage-100">
            {rows.map((row) => (
              <Link key={row.id} href={`/portal/jobs/${row.id}`} className="block px-4 py-4 hover:bg-sage-50/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sage-800">{row.jobNumber}</span>
                  <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_STYLES[row.status] ?? STATUS_STYLES.draft)}>{statusLabel(row.status)}</span>
                </div>
                <div className="text-sage-700 text-sm">{row.title}</div>
                <div className="text-sage-600 text-xs mt-1">{row.clientName}</div>
                <div className="text-sage-500 text-xs mt-1">{fmtDate(row.scheduledDate)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
