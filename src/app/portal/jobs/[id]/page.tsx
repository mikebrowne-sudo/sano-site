import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { JobInvoiceButton } from './_components/JobInvoiceButton'
import { JobStatusActions } from './_components/JobStatusActions'
import { AssignJobButton } from './_components/AssignJobButton'
import { DuplicateJobButton } from './_components/DuplicateJobButton'
import { CreateRecurringButton } from './_components/CreateRecurringButton'
import { calculateVariance } from '@/lib/labour-calc'
import { ActualHoursEditor } from './_components/ActualHoursEditor'
import { DeleteButton } from '../../_components/DeleteButton'
import { JobWorkflowBar } from './_components/JobWorkflowBar'
import { MarkJobReviewedButton } from './_components/MarkJobReviewedButton'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

// Phase D — payment status pill styling. Operational state only;
// does not gate workflow transitions.
const PAYMENT_STATUS_STYLES: Record<string, string> = {
  not_required:    'bg-gray-100 text-gray-600',
  on_account:      'bg-sage-50 text-sage-700',
  invoice_sent:    'bg-blue-50 text-blue-700',
  payment_pending: 'bg-amber-50 text-amber-700',
  paid:            'bg-emerald-50 text-emerald-700',
}
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  not_required:    'No payment required',
  on_account:      'On account',
  invoice_sent:    'Invoice sent',
  payment_pending: 'Payment pending',
  paid:            'Paid',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function statusLabel(s: string) {
  return s.replace('_', ' ')
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === 'michael@sano.nz'

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      id, job_number, client_id, quote_id, invoice_id, recurring_job_id, status, assigned_to,
      title, description, address,
      scheduled_date, scheduled_time, duration_estimate,
      contractor_id, contractor_price, job_price, allowed_hours,
      started_at, completed_at,
      payment_status, reviewed_at, reviewed_by, access_instructions,
      internal_notes, contractor_notes,
      created_at, updated_at,
      clients ( name, company_name )
    `)
    .eq('id', params.id)
    .single()

  if (error || !job) notFound()

  // Load assigned workers with payroll fields for costing
  const { data: jobWorkers } = await supabase
    .from('job_workers')
    .select('contractor_id, hours_allocated, actual_start_time, actual_end_time, actual_hours, contractors ( full_name, hourly_rate, worker_type, holiday_pay_method, holiday_pay_percent, kiwisaver_enrolled, kiwisaver_employer_rate )')
    .eq('job_id', params.id)

  const client = job.clients as unknown as { name: string; company_name: string | null } | null

  // Load linked quote/invoice numbers if they exist
  let quoteNumber: string | null = null
  let invoiceNumber: string | null = null
  let linkedInvoiceStatus: string | null = null

  if (job.quote_id) {
    const { data } = await supabase.from('quotes').select('quote_number').eq('id', job.quote_id).single()
    quoteNumber = data?.quote_number ?? null
  }
  if (job.invoice_id) {
    const { data } = await supabase.from('invoices').select('invoice_number, status').eq('id', job.invoice_id).single()
    invoiceNumber = data?.invoice_number ?? null
    linkedInvoiceStatus = data?.status ?? null
  }

  // Delete eligibility: draft/assigned only, AND not linked to a sent/paid invoice.
  // Server-side `deleteJob` re-checks these; this controls UI visibility only.
  const canDeleteJob =
    isAdmin &&
    ['draft', 'assigned'].includes(job.status) &&
    (!job.invoice_id || !['sent', 'paid'].includes(linkedInvoiceStatus ?? ''))

  const { data: contractors } = await supabase
    .from('contractors')
    .select('id, full_name')
    .eq('status', 'active')
    .order('full_name')

  return (
    <div>
      <Link
        href="/portal/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to jobs
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl tracking-tight font-bold text-sage-800">{job.job_number}</h1>
            {invoiceNumber && (
              <Link href={`/portal/invoices/${job.invoice_id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-100 text-sage-700 text-xs font-medium hover:bg-sage-200 transition-colors">
                {invoiceNumber}
              </Link>
            )}
            {quoteNumber && (
              <Link href={`/portal/quotes/${job.quote_id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-50 text-sage-500 text-xs font-medium hover:bg-sage-100 transition-colors">
                {quoteNumber}
              </Link>
            )}
            {job.recurring_job_id && (
              <Link href={`/portal/recurring-jobs/${job.recurring_job_id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-medium hover:bg-purple-100 transition-colors">
                Recurring
              </Link>
            )}
          </div>
          {job.title && <p className="text-sage-600 text-sm mt-1">{job.title}</p>}
          <p className="text-sage-500 text-xs mt-1">
            {job.assigned_to ? (
              job.contractor_id ? (
                <Link href={`/portal/contractors/${job.contractor_id}`} className="hover:text-sage-700 transition-colors">
                  Assigned to {job.assigned_to}
                </Link>
              ) : (
                `Assigned to ${job.assigned_to}`
              )
            ) : 'Unassigned'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-end">
          <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
            {statusLabel(job.status)}
          </span>
          {/* Phase D — payment status pill sits alongside the status
              badge so operators see billing state at a glance. */}
          {(() => {
            const ps = (job.payment_status ?? 'on_account') as string
            return (
              <span
                className={clsx(
                  'inline-block px-3 py-1 rounded-full text-xs font-medium',
                  PAYMENT_STATUS_STYLES[ps] ?? PAYMENT_STATUS_STYLES.on_account,
                )}
                title="Payment status — operational only; does not gate job workflow."
              >
                {PAYMENT_STATUS_LABELS[ps] ?? 'On account'}
              </span>
            )
          })()}
          {job.reviewed_at && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-sage-50 text-sage-700">
              Reviewed
            </span>
          )}
          <AssignJobButton
            jobId={job.id}
            currentAssignee={job.assigned_to}
            currentContractorId={job.contractor_id}
            currentScheduledDate={job.scheduled_date}
            currentScheduledTime={job.scheduled_time}
            currentAllowedHours={job.allowed_hours}
            currentAccessInstructions={job.access_instructions}
            currentInternalNotes={job.internal_notes}
            contractors={contractors ?? []}
          />
          <Link
            href={`/portal/jobs/${params.id}/edit`}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
          >
            <Pencil size={14} />
            Edit Job
          </Link>
          <DuplicateJobButton jobId={job.id} />
          {!job.recurring_job_id && <CreateRecurringButton jobId={job.id} />}
          <JobStatusActions jobId={job.id} status={job.status} />
          {/* Phase D — Mark as Reviewed. Visible only when the job
              is completed/invoiced and hasn't been reviewed yet. */}
          {(job.status === 'completed' || job.status === 'invoiced') && !job.reviewed_at && (
            <MarkJobReviewedButton jobId={job.id} />
          )}
          <JobInvoiceButton
            jobId={job.id}
            invoiceId={job.invoice_id}
            hasJobPrice={job.job_price != null && job.job_price > 0}
          />
        </div>
      </div>

      {canDeleteJob && (
        <div className="flex justify-end mb-6">
          <DeleteButton type="job" id={job.id} />
        </div>
      )}

      {/* Phase C — workflow bar. Seven-stage visual spanning
          Draft → Scheduled → Assigned → In Progress → Completed →
          Reviewed → Invoiced. Derived from the existing job.status
          enum plus scheduled_date; no DB changes required. */}
      <JobWorkflowBar
        status={job.status}
        scheduledDate={job.scheduled_date}
        reviewedAt={job.reviewed_at}
      />

      <div className="max-w-2xl space-y-8 mt-6">

        {/* Client */}
        <Section title="Client">
          <p className="font-medium text-sage-800">{client?.name ?? '—'}</p>
          {client?.company_name && <p className="text-sage-600 text-sm">{client.company_name}</p>}
        </Section>

        {/* Linked records */}
        {(quoteNumber || invoiceNumber) && (
          <Section title="Linked Records">
            <div className="flex flex-wrap gap-4 text-sm">
              {quoteNumber && (
                <Link href={`/portal/quotes/${job.quote_id}`} className="text-sage-500 hover:text-sage-700 font-medium">
                  {quoteNumber}
                </Link>
              )}
              {invoiceNumber && (
                <Link href={`/portal/invoices/${job.invoice_id}`} className="text-sage-500 hover:text-sage-700 font-medium">
                  {invoiceNumber}
                </Link>
              )}
            </div>
          </Section>
        )}

        {/* Schedule & Tracking */}
        <Section title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-sage-500">Scheduled date</span>
              <p className="text-sage-800 font-medium">{fmtDate(job.scheduled_date)}</p>
            </div>
            <div>
              <span className="text-sage-500">Scheduled time</span>
              <p className="text-sage-800 font-medium">{job.scheduled_time ?? '—'}</p>
            </div>
            <div>
              <span className="text-sage-500">Duration estimate</span>
              <p className="text-sage-800 font-medium">{job.duration_estimate ?? '—'}</p>
            </div>
          </div>
          {job.address && (
            <div className="mt-3 text-sm">
              <span className="text-sage-500">Address</span>
              <p className="text-sage-800">{job.address}</p>
            </div>
          )}
          {(job.started_at || job.completed_at) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-sage-100">
              <div>
                <span className="text-sage-500">Started</span>
                <p className="text-sage-800 font-medium">{fmtDateTime(job.started_at)}</p>
              </div>
              <div>
                <span className="text-sage-500">Completed</span>
                <p className="text-sage-800 font-medium">{fmtDateTime(job.completed_at)}</p>
              </div>
            </div>
          )}
        </Section>

        {/* Description */}
        {job.description && (
          <Section title="Description">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{job.description}</p>
          </Section>
        )}

        {/* Phase D.1 — access instructions captured during assignment.
            Only rendered when set so jobs without access notes stay
            uncluttered. */}
        {job.access_instructions && (
          <Section title="Access instructions">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{job.access_instructions}</p>
          </Section>
        )}

        {/* Labour & Margin */}
        <Section title="Labour &amp; Margin">
          {(() => {
            const workers = (jobWorkers ?? []).map((w) => {
              const c = w.contractors as unknown as {
                full_name: string; hourly_rate: number | null; worker_type: string | null
                holiday_pay_method: string | null; holiday_pay_percent: number | null
                kiwisaver_enrolled: boolean; kiwisaver_employer_rate: number | null
              } | null
              return {
                contractor_id: w.contractor_id,
                full_name: c?.full_name ?? '—',
                hourly_rate: c?.hourly_rate ?? null,
                hours_allocated: w.hours_allocated,
                actual_hours: w.actual_hours ?? null,
                worker_type: c?.worker_type ?? 'contractor',
                holiday_pay_method: c?.holiday_pay_method ?? null,
                holiday_pay_percent: c?.holiday_pay_percent ?? null,
                kiwisaver_enrolled: c?.kiwisaver_enrolled ?? false,
                kiwisaver_employer_rate: c?.kiwisaver_employer_rate ?? null,
              }
            })
            const v = calculateVariance(job.job_price ?? 0, job.allowed_hours, workers)
            const hasActuals = workers.some((w) => (w.actual_hours ?? 0) > 0)

            return (
              <>
                {/* Estimate vs Actual comparison */}
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-sage-500 border-b border-gray-100">
                        <th className="py-2 pr-4"></th>
                        <th className="py-2 pr-4 text-right">Estimated</th>
                        {hasActuals && <th className="py-2 pr-4 text-right">Actual</th>}
                        {hasActuals && <th className="py-2 text-right">Variance</th>}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Job value</td>
                        <td className="py-2 pr-4 text-right font-bold text-sage-800" colSpan={hasActuals ? 3 : 1}>{fmtCurrency(job.job_price)}</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Hours</td>
                        <td className="py-2 pr-4 text-right text-sage-800">{v.estimated.totalHours.toFixed(1)}h</td>
                        {hasActuals && <td className="py-2 pr-4 text-right text-sage-800">{v.actual.totalHours.toFixed(1)}h</td>}
                        {hasActuals && <td className="py-2 text-right"><VarCell value={v.hoursVariance} suffix="h" /></td>}
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Labour cost</td>
                        <td className="py-2 pr-4 text-right text-sage-800">{fmtCurrency(v.estimated.totalLabourCost)}</td>
                        {hasActuals && <td className="py-2 pr-4 text-right text-sage-800">{fmtCurrency(v.actual.totalLabourCost)}</td>}
                        {hasActuals && <td className="py-2 text-right"><VarCell value={v.costVariance} currency /></td>}
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Employer KS</td>
                        <td className="py-2 pr-4 text-right text-sage-600">{fmtCurrency(v.estimated.totalEmployerKs)}</td>
                        {hasActuals && <td className="py-2 pr-4 text-right text-sage-600">{fmtCurrency(v.actual.totalEmployerKs)}</td>}
                        {hasActuals && <td className="py-2 text-right"></td>}
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">ACC (1.7%)</td>
                        <td className="py-2 pr-4 text-right text-sage-600">{fmtCurrency(v.estimated.totalAccCost)}</td>
                        {hasActuals && <td className="py-2 pr-4 text-right text-sage-600">{fmtCurrency(v.actual.totalAccCost)}</td>}
                        {hasActuals && <td className="py-2 text-right"></td>}
                      </tr>
                      <tr className={clsx(v.estimated.grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50')}>
                        <td className="py-2.5 pr-4 font-semibold text-sage-800">Gross margin</td>
                        <td className="py-2.5 pr-4 text-right font-bold">
                          <span className={v.estimated.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{fmtCurrency(v.estimated.grossProfit)}</span>
                          <span className="text-sage-500 font-normal text-xs ml-1">({v.estimated.marginPercent}%)</span>
                        </td>
                        {hasActuals && (
                          <td className="py-2.5 pr-4 text-right font-bold">
                            <span className={v.actual.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{fmtCurrency(v.actual.grossProfit)}</span>
                            <span className="text-sage-500 font-normal text-xs ml-1">({v.actual.marginPercent}%)</span>
                          </td>
                        )}
                        {hasActuals && <td className="py-2.5 text-right"><VarCell value={v.marginVariance} currency invert /></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Per-worker breakdown */}
                {v.estimated.workers.length > 0 && (
                  <div className="border-t border-sage-100 pt-3">
                    <span className="text-xs text-sage-500 font-semibold uppercase tracking-wide">Worker Breakdown</span>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-sage-500 border-b border-gray-100">
                            <th className="py-2 pr-2">Worker</th>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2 text-right">Est. hrs</th>
                            <th className="py-2 pr-2 text-right">Actual hrs</th>
                            <th className="py-2 pr-2 text-right">Rate</th>
                            <th className="py-2 pr-2 text-right">Est. cost</th>
                            <th className="py-2 pr-2 text-right">Actual cost</th>
                            <th className="py-2 text-right">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {v.estimated.workers.map((ew, i) => {
                            const aw = v.actual.workers[i]
                            const costVar = aw ? aw.totalCost - ew.totalCost : 0
                            return (
                              <tr key={ew.contractorId} className="border-b border-gray-50">
                                <td className="py-2 pr-2 font-medium text-sage-800">{ew.fullName}</td>
                                <td className="py-2 pr-2 text-sage-600 capitalize">{ew.workerType.replace('_', ' ')}</td>
                                <td className="py-2 pr-2 text-right text-sage-700">{ew.hours.toFixed(1)}</td>
                                <td className="py-2 pr-2 text-right">
                                  <ActualHoursEditor jobId={job.id} contractorId={ew.contractorId} currentHours={workers[i]?.actual_hours ?? null} />
                                </td>
                                <td className="py-2 pr-2 text-right text-sage-700">{fmtCurrency(ew.hourlyRate)}</td>
                                <td className="py-2 pr-2 text-right text-sage-800">{fmtCurrency(ew.totalCost)}</td>
                                <td className="py-2 pr-2 text-right text-sage-800">{aw ? fmtCurrency(aw.totalCost) : '—'}</td>
                                <td className="py-2 text-right">{aw && aw.hours > 0 ? <VarCell value={costVar} currency /> : <span className="text-sage-300">—</span>}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </Section>

        {/* Notes */}
        {(job.internal_notes || job.contractor_notes) && (
          <Section title="Notes">
            {job.internal_notes && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-sage-500 uppercase tracking-wide">Internal</span>
                <p className="text-sage-600 text-sm whitespace-pre-wrap mt-1">{job.internal_notes}</p>
              </div>
            )}
            {job.contractor_notes && (
              <div>
                <span className="text-xs font-semibold text-sage-500 uppercase tracking-wide">Contractor</span>
                <p className="text-sage-600 text-sm whitespace-pre-wrap mt-1">{job.contractor_notes}</p>
              </div>
            )}
          </Section>
        )}

        {/* Timestamps */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-sage-400 pt-4 border-t border-sage-100">
          <span>Created {fmtDateTime(job.created_at)}</span>
          <span>Updated {fmtDateTime(job.updated_at)}</span>
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

function VarCell({ value, currency, suffix, invert }: { value: number; currency?: boolean; suffix?: string; invert?: boolean }) {
  const rounded = Math.round(value * 100) / 100
  if (rounded === 0) return <span className="text-sage-400">—</span>
  // For costs: positive = over budget (bad). For margin: positive = better (good, so invert)
  const isGood = invert ? rounded > 0 : rounded < 0
  const color = isGood ? 'text-emerald-700' : 'text-red-600'
  const sign = rounded > 0 ? '+' : ''
  const display = currency
    ? `${sign}${new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(rounded)}`
    : `${sign}${rounded.toFixed(1)}${suffix ?? ''}`
  return <span className={clsx('font-medium', color)}>{display}</span>
}
