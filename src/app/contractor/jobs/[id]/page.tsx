import { getContractor } from '../../_lib/get-contractor'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, Timer } from 'lucide-react'
import { ContractorJobActions } from './_components/ContractorJobActions'
import { ContractorNotesForm } from './_components/ContractorNotesForm'
import { OnTheWayButton } from './_components/OnTheWayButton'
import { getWorkerPayableHours, getWorkerLabourCost, getWorkerRate } from '@/lib/job-cost'
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
  // The worker row is read alongside so we can show the contractor
  // their pay for this job on the SAME basis as the pay statement
  // (allowed hours + admin-approved extra × snapshotted rate), instead
  // of the stale denormalised jobs.contractor_price.
  const [{ data: job, error }, { data: worker }] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        id, job_number, title, description, address,
        scheduled_date, scheduled_time, duration_estimate,
        allowed_hours, access_instructions,
        status, contractor_notes,
        started_at, completed_at
      `)
      .eq('id', params.id)
      .eq('contractor_id', contractor.id)
      .single(),
    supabase
      .from('job_workers')
      .select('hours_allocated, pay_rate, extra_hours, extra_hours_status')
      .eq('job_id', params.id)
      .eq('contractor_id', contractor.id)
      .maybeSingle(),
  ])

  // Job doesn't exist or doesn't belong to this contractor → back to list
  if (error || !job) {
    redirect('/contractor/jobs')
  }

  const scheduledDate = fmtDate(job.scheduled_date)
  const startedAt = fmtDateTime(job.started_at)
  const completedAt = fmtDateTime(job.completed_at)

  // Pay for this job — canonical helpers, same basis as the statement.
  const costInput = {
    pay_rate: (worker?.pay_rate as number | null) ?? null,
    contractor_hourly_rate: contractor.hourly_rate ?? null,
    approved_hours: null,
    actual_hours: null,
    hours_allocated: (worker?.hours_allocated as number | null) ?? job.allowed_hours ?? null,
    extra_hours: (worker?.extra_hours as number | null) ?? 0,
    extra_hours_status: (worker?.extra_hours_status as string | null) ?? 'none',
  }
  const payableHours = getWorkerPayableHours(costInput)
  const jobPay = getWorkerLabourCost(costInput)
  const payRate = getWorkerRate(costInput, contractor.hourly_rate)
  const approvedExtra = costInput.extra_hours_status === 'approved' ? (costInput.extra_hours ?? 0) : 0

  return (
    // Phase 5.5.4 — extra mobile bottom padding so the sticky action bar
    // doesn't cover the last card. Desktop returns to pb-8.
    <div className="pb-28 md:pb-8">

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

      {/* Primary action — Phase 5.5.4: inline on desktop, sticky bottom
          (above the mobile bottom nav) on mobile so it's always within
          thumb reach while the user scrolls the job detail. The
          mobile bar reserves space via the safe-area inset so it sits
          above the home indicator on iOS. */}
      <div
        className="md:static fixed inset-x-0 z-30 px-4 pt-3 pb-3 bg-white/95 backdrop-blur border-t border-sage-100 md:bg-transparent md:border-0 md:px-0 md:pt-0 md:pb-0"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
      >
        <ContractorJobActions jobId={job.id} status={job.status} />
      </div>

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

      {/* Pay for this job — allowed hours × rate (+ approved extra),
          the same basis as the contractor pay statement. */}
      {payableHours != null && payRate != null && (
        <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
          <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-2">Your pay for this job</h2>
          <p className="text-sage-800 text-2xl font-bold tabular-nums">{fmtCurrency(jobPay)}</p>
          <p className="text-xs text-sage-500 mt-1 tabular-nums">
            {payableHours} hr{payableHours === 1 ? '' : 's'} × {fmtCurrency(payRate)}/hr
            {approvedExtra > 0 && <span className="text-sage-400"> · incl. {approvedExtra} approved extra</span>}
          </p>
          <p className="text-[11px] text-sage-400 mt-2">
            See all your jobs and pay-run totals in{' '}
            <Link href="/contractor/payroll" className="text-sage-600 underline">Pay</Link>.
          </p>
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
