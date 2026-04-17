import { getContractor } from '../../_lib/get-contractor'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ContractorJobActions } from './_components/ContractorJobActions'
import { ContractorNotesForm } from './_components/ContractorNotesForm'
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

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default async function ContractorJobDetailPage({ params }: { params: { id: string } }) {
  const { supabase, contractor } = await getContractor()

  // Only select safe fields — no job_price, contractor_price, internal_notes
  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      id, job_number, title, description, address,
      scheduled_date, scheduled_time, duration_estimate,
      status, contractor_notes, started_at, completed_at
    `)
    .eq('id', params.id)
    .eq('contractor_id', contractor.id)
    .single()

  if (error || !job) notFound()

  return (
    <div>
      <Link
        href="/contractor/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to my jobs
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-sage-800">{job.job_number}</h1>
          {job.title && <p className="text-sage-600 text-sm mt-1">{job.title}</p>}
        </div>
        <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
          {job.status.replace('_', ' ')}
        </span>
      </div>

      <div className="space-y-6">

        {/* Actions */}
        <ContractorJobActions jobId={job.id} status={job.status} />

        {/* Schedule */}
        <Section title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-sage-500">Date</span>
              <p className="text-sage-800 font-medium">{fmtDate(job.scheduled_date)}</p>
            </div>
            <div>
              <span className="text-sage-500">Time</span>
              <p className="text-sage-800 font-medium">{job.scheduled_time ?? '—'}</p>
            </div>
            <div>
              <span className="text-sage-500">Duration</span>
              <p className="text-sage-800 font-medium">{job.duration_estimate ?? '—'}</p>
            </div>
          </div>
        </Section>

        {/* Address */}
        {job.address && (
          <Section title="Address">
            <p className="text-sage-800 text-sm">{job.address}</p>
          </Section>
        )}

        {/* Description */}
        {job.description && (
          <Section title="Description">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{job.description}</p>
          </Section>
        )}

        {/* Tracking */}
        {(job.started_at || job.completed_at) && (
          <Section title="Tracking">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-sage-500">Started</span>
                <p className="text-sage-800 font-medium">{fmtDateTime(job.started_at)}</p>
              </div>
              <div>
                <span className="text-sage-500">Completed</span>
                <p className="text-sage-800 font-medium">{fmtDateTime(job.completed_at)}</p>
              </div>
            </div>
          </Section>
        )}

        {/* Contractor notes */}
        <Section title="Notes">
          <ContractorNotesForm jobId={job.id} currentNotes={job.contractor_notes ?? ''} />
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 p-4">
      <h2 className="text-sm font-semibold text-sage-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}
