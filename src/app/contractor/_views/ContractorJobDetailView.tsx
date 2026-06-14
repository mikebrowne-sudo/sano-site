// Presentational body of the contractor job-detail screen. Shared by
// the live page and the staff preview.
//
// In `readOnly` (preview) mode every interactive control is replaced by
// a static, disabled look-alike so the screen reads faithfully but
// nothing can fire as the contractor.

import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, Clock, Timer, Camera, CheckCircle } from 'lucide-react'
import clsx from 'clsx'
import { ContractorJobActions } from '../jobs/[id]/_components/ContractorJobActions'
import { ContractorNotesForm } from '../jobs/[id]/_components/ContractorNotesForm'
import { OnTheWayButton } from '../jobs/[id]/_components/OnTheWayButton'
import { ContractorPhotos } from '../jobs/[id]/_components/ContractorPhotos'
import { JobPhotoGallery } from '@/components/JobPhotoGallery'
import { contractorJobTitle } from '../_lib/job-title'
import type { ContractorJobDetail } from '../_lib/contractor-job-detail-data'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', invoiced: 'Invoiced',
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

export function ContractorJobDetailView({
  job,
  readOnly = false,
  backHref,
}: {
  job: ContractorJobDetail
  readOnly?: boolean
  backHref: string
}) {
  const scheduledDate = fmtDate(job.scheduled_date)
  const startedAt = fmtDateTime(job.started_at)
  const completedAt = fmtDateTime(job.completed_at)
  const isDone = job.status === 'completed' || job.status === 'invoiced'

  return (
    <div className={readOnly ? 'pb-4' : 'pb-28 md:pb-8'}>
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-sage-500 hover:text-sage-700 transition-colors mb-5">
        <ArrowLeft size={14} />
        My Jobs
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-sage-800 leading-tight">{job.job_number}</h1>
          <span className={clsx('shrink-0 inline-block px-3 py-1 rounded-full text-xs font-semibold', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
            {STATUS_LABELS[job.status] ?? job.status}
          </span>
        </div>
        {contractorJobTitle(job.title) && <p className="text-sage-600 text-sm mt-1">{contractorJobTitle(job.title)}</p>}
      </div>

      {/* Primary action */}
      <div>
        {readOnly ? (
          isDone ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-700 font-medium">This job is complete</span>
            </div>
          ) : (
            <button type="button" disabled className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-4 rounded-2xl text-base opacity-50 cursor-not-allowed min-h-[52px]">
              <CheckCircle size={20} />
              Mark complete
            </button>
          )
        ) : (
          <div
            className="md:static fixed inset-x-0 z-30 px-4 pt-3 pb-3 bg-white/95 backdrop-blur border-t border-sage-100 md:bg-transparent md:border-0 md:px-0 md:pt-0 md:pb-0"
            style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
          >
            <ContractorJobActions jobId={job.id} status={job.status} />
          </div>
        )}
      </div>

      {!readOnly && (job.status === 'draft' || job.status === 'assigned') && (
        <OnTheWayButton jobId={job.id} />
      )}

      {/* Schedule card */}
      <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-5 space-y-4">
        {scheduledDate && <Row icon={Calendar} label="Date" value={scheduledDate} />}
        {job.scheduled_time && <Row icon={Clock} label="Time" value={job.scheduled_time} />}
        {job.duration_estimate && <Row icon={Timer} label="Duration" value={job.duration_estimate} />}
        {job.allowed_hours != null && <Row icon={Timer} label="Allowed hours" value={`${job.allowed_hours} hr${job.allowed_hours === 1 ? '' : 's'}`} />}
        {job.address && <Row icon={MapPin} label="Address" value={job.address} />}
      </div>

      {job.description && (
        <Card heading="Description">
          <p className="text-sage-700 text-sm whitespace-pre-wrap leading-relaxed">{job.description}</p>
        </Card>
      )}

      {job.access_instructions && (
        <Card heading="Access instructions">
          <p className="text-sage-700 text-sm whitespace-pre-wrap leading-relaxed">{job.access_instructions}</p>
        </Card>
      )}

      {(startedAt || completedAt) && (
        <Card heading="Tracking">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {startedAt && <div><p className="text-xs text-sage-500">Started</p><p className="text-sage-800 font-medium">{startedAt}</p></div>}
            {completedAt && <div><p className="text-xs text-sage-500">Completed</p><p className="text-sage-800 font-medium">{completedAt}</p></div>}
          </div>
        </Card>
      )}

      {/* Pay for this job */}
      {job.payableHours != null && job.payRate != null && (
        <Card heading="Your pay for this job">
          <p className="text-sage-800 text-2xl font-bold tabular-nums">{fmtCurrency(job.jobPay)}</p>
          <p className="text-xs text-sage-500 mt-1 tabular-nums">
            {job.payableHours} hr{job.payableHours === 1 ? '' : 's'} × {fmtCurrency(job.payRate)}/hr
            {job.approvedExtra !== 0 && <span className="text-sage-400"> · incl. {job.approvedExtra > 0 ? '+' : ''}{job.approvedExtra}h adjustment</span>}
          </p>
        </Card>
      )}

      {/* Notes */}
      <Card heading="Your Notes">
        {readOnly ? (
          <div className="space-y-3">
            <div className="w-full rounded-xl border border-sage-200 px-4 py-3 text-sm min-h-[6rem] whitespace-pre-wrap text-sage-700">
              {job.contractor_notes || <span className="text-sage-300">No notes added.</span>}
            </div>
            <button type="button" disabled className="bg-sage-500 text-white font-semibold px-5 py-3 rounded-xl text-sm opacity-40 cursor-not-allowed">Save Notes</button>
          </div>
        ) : (
          <ContractorNotesForm jobId={job.id} currentNotes={job.contractor_notes ?? ''} />
        )}
      </Card>

      {/* Photos */}
      <Card heading="Photos">
        {readOnly ? (
          <div className="space-y-3">
            {job.photos.length > 0
              ? <JobPhotoGallery photos={job.photos} />
              : <p className="text-sm text-sage-400">No photos yet — add a few of the finished job.</p>}
            <button type="button" disabled className="w-full inline-flex items-center justify-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-3 rounded-xl text-sm opacity-50 cursor-not-allowed">
              <Camera size={16} /> Add photos
            </button>
          </div>
        ) : (
          <ContractorPhotos jobId={job.id} photos={job.photos} />
        )}
      </Card>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="text-sage-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-sage-500 font-medium">{label}</p>
        <p className="text-sage-800 font-medium">{value}</p>
      </div>
    </div>
  )
}

function Card({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-sage-100 p-5 mt-4">
      <h2 className="text-xs text-sage-500 font-semibold uppercase tracking-wide mb-3">{heading}</h2>
      {children}
    </div>
  )
}
