import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import clsx from 'clsx'

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ContractorDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: contractor, error }, { data: jobs, count: jobCount }] = await Promise.all([
    supabase
      .from('contractors')
      .select('id, full_name, email, phone, hourly_rate, status, notes, created_at')
      .eq('id', params.id)
      .single(),
    supabase
      .from('jobs')
      .select('id, job_number, title, status, scheduled_date', { count: 'exact' })
      .eq('contractor_id', params.id)
      .order('scheduled_date', { ascending: false })
      .limit(5),
  ])

  if (error || !contractor) notFound()

  return (
    <div>
      <Link
        href="/portal/contractors"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to contractors
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">{contractor.full_name}</h1>
          <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize mt-1', contractor.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>
            {contractor.status}
          </span>
        </div>
        <Link
          href={`/portal/contractors/${params.id}/edit`}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      <div className="max-w-2xl space-y-8">
        <Section title="Contact">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-sage-500">Email</span>
              <p className="text-sage-800 font-medium">{contractor.email || '—'}</p>
            </div>
            <div>
              <span className="text-sage-500">Phone</span>
              <p className="text-sage-800 font-medium">{contractor.phone || '—'}</p>
            </div>
          </div>
        </Section>

        <Section title="Rate">
          <p className="text-sage-800 font-medium text-sm">{fmtCurrency(contractor.hourly_rate)}/hr</p>
        </Section>

        {contractor.notes && (
          <Section title="Notes">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{contractor.notes}</p>
          </Section>
        )}

        {/* Recent jobs */}
        <Section title={`Jobs${jobCount != null ? ` (${jobCount})` : ''}`}>
          {(!jobs || jobs.length === 0) ? (
            <p className="text-sage-500 text-sm">No jobs assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/portal/jobs/${j.id}`}
                  className="flex items-center justify-between bg-sage-50 rounded-lg px-4 py-3 hover:bg-sage-100 transition-colors text-sm"
                >
                  <div>
                    <span className="font-medium text-sage-800">{j.job_number}</span>
                    {j.title && <span className="text-sage-600 ml-2">{j.title}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-sage-500">{fmtDate(j.scheduled_date)}</span>
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full font-medium capitalize',
                      j.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                      j.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                      j.status === 'assigned' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    )}>{j.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
              {(jobCount ?? 0) > 5 && (
                <p className="text-xs text-sage-500 pt-1">Showing 5 of {jobCount}</p>
              )}
            </div>
          )}
        </Section>

        <div className="text-xs text-sage-400 pt-4 border-t border-sage-100">
          Added {fmtDate(contractor.created_at)}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-sage-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}
