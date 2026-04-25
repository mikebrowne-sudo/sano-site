import { getContractor } from '../../_lib/get-contractor'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, Timer } from 'lucide-react'
import { ContractorJobActions } from './_components/ContractorJobActions'
import { ContractorNotesForm } from './_components/ContractorNotesForm'
import { OnTheWayButton } from './_components/OnTheWayButton'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

const STATUS_LABELS: Record<string, string> = {
  draft:       'Draft',
  assigned:    'Assigned',
  in_progress: 'In Progress',
  completed:   'Completed',
  invoiced:    'Invoiced',
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return null
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export default async function ContractorJobDetailPage({ params }: { params: { id: string } }) {
  const { supabase, contractor } = await getContractor()

  // Safe fields only — no job_price, internal_notes, quote/invoice data.
  // Phase D.1 adds allowed_hours + access_instructions; both are safe
  // for the contractor to see (not margin / not client pricing).
  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      id, job_number, title, description, address,
      scheduled_date, scheduled_time, duration_estimate,
      allowed_hours, access_instructions,
      status, contractor_notes, contractor_price,
      started_at, completed_at
    `)
    .eq('id', params.id)
    .eq('contractor_id', contractor.id)
    .single()

  // Job doesn't exist or doesn't belong to this contractor → back to list
  if (error || !job) {
    redirect('/contractor/jobs')
  }

  const scheduledDate = fmtDate(job.scheduled_date)
  const startedAt = fmtDateTime(job.started_at)
  const completedAt = fmtDateTime(job.completed_at)
  const price = fmtCurrency(job.contractor_price)

  return (
    <div className="pb-8">

      {/* Back link */}
      <Link
        href="/contractor/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-sage-500 hover:text-sage-700 transition-colors mb-5"
      >
        <ArrowLeft size={14} />
        My Jobs
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-sage-800 leading-tight">{job.job_number}</h1>
          <span className={clsx(
            'shrink-0 inline-block px-3 py-1 rounded-full text-xs font-semibold',
            STATUS_STYLES[job.status] ?? STATUS_STYLES.draft,
          )}>
            {STATUS_LABELS[job.status] ?? job.status}
          </span>
        </div>
        {job.title && (
          <p className="text-sage-600 text-sm mt-1">{job.title}</p>
        )}
      </div>

      {/* Primary action — large, prominent, mobile-friendly */}
      <ContractorJobActions jobId={job.id} status={job.status} />

      {/* Phase H.3 — informational SMS to the customer; only meaningful
          before the contractor has started the job on site. */}
      {(job.status === 'draft' || job.status === 'assigned') && (
        <OnTheWayButton jobId={job.id} />
      )}

      {/* Schedule card */}
      <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-5 space-y-4">
        {scheduledDate && (
          <div className="flex items-start gap-3">
            <Calendar size={18} className="text-sage-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-sage-500 font-medium">Date</p>
              <p className="text-sage-800 font-medium">{scheduledDate}</p>
            </div>
          </div>
        )}
        {job.scheduled_time && (
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-sage-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-sage-500 font-medium">Time</p>
              <p className="text-sage-800 font-medium">{job.scheduled_time}</p>
            </div>
          </div>
        )}
        {job.duration_estimate && (
          <div className="flex items-start gap-3">
            <Timer size={18} className="text-sage-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-sage-500 font-medium">Duration</p>
              <p className="text-sage-800 font-medium">{job.duration_estimate}</p>
            </div>
          </div>
        )}
        {job.allowed_hours != null && (
          <div className="flex items-start gap-3">
            <Timer size={18} className="text-sage-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-sage-500 font-medium">Allowed hours</p>
              <p className="text-sage-800 font-medium">{job.allowed_hours} hr{job.allowed_hours === 1 ? '' : 's'}</p>
            </div>
          </div>
        )}
        {job.address && (
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-sage-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-sage-500 font-medium">Address</p>
              <p className="text-sage-800 font-medium">{job.address}</p>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-2">Description</h2>
          <p className="text-sage-700 text-sm whitespace-pre-wrap leading-relaxed">{job.description}</p>
        </div>
      )}

      {/* Phase D.1 — access instructions. Captured during assignment;
          surfaced here so the contractor has keys / alarm / parking
          info at the top of their own page before starting the job. */}
      {job.access_instructions && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-2">Access instructions</h2>
          <p className="text-sage-700 text-sm whitespace-pre-wrap leading-relaxed">{job.access_instructions}</p>
        </div>
      )}

      {/* Tracking */}
      {(startedAt || completedAt) && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-3">Tracking</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {startedAt && (
              <div>
                <p className="text-xs text-sage-500">Started</p>
                <p className="text-sage-800 font-medium">{startedAt}</p>
              </div>
            )}
            {completedAt && (
              <div>
                <p className="text-xs text-sage-500">Completed</p>
                <p className="text-sage-800 font-medium">{completedAt}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pay */}
      {price && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-2">Your Rate</h2>
          <p className="text-sage-800 text-lg font-bold">{price}</p>
        </div>
      )}

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
        <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-3">Your Notes</h2>
        <ContractorNotesForm jobId={job.id} currentNotes={job.contractor_notes ?? ''} />
      </div>

    </div>
  )
}
