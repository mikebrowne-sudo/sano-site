import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { JobInvoiceButton } from './_components/JobInvoiceButton'
import { JobStatusActions } from './_components/JobStatusActions'
import { AssignJobButton } from './_components/AssignJobButton'
import { DuplicateJobButton } from './_components/DuplicateJobButton'
import { CreateRecurringButton } from './_components/CreateRecurringButton'
import { calculateLabour } from '@/lib/labour-calc'
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

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function statusLabel(s: string) {
  return s.replace('_', ' ')
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      id, job_number, client_id, quote_id, invoice_id, recurring_job_id, status, assigned_to,
      title, description, address,
      scheduled_date, scheduled_time, duration_estimate,
      contractor_id, contractor_price, job_price, allowed_hours,
      started_at, completed_at,
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
    .select('contractor_id, hours_allocated, contractors ( full_name, hourly_rate, worker_type, holiday_pay_method, holiday_pay_percent, kiwisaver_enrolled, kiwisaver_employer_rate )')
    .eq('job_id', params.id)

  const client = job.clients as unknown as { name: string; company_name: string | null } | null

  // Load linked quote/invoice numbers if they exist
  let quoteNumber: string | null = null
  let invoiceNumber: string | null = null

  if (job.quote_id) {
    const { data } = await supabase.from('quotes').select('quote_number').eq('id', job.quote_id).single()
    quoteNumber = data?.quote_number ?? null
  }
  if (job.invoice_id) {
    const { data } = await supabase.from('invoices').select('invoice_number').eq('id', job.invoice_id).single()
    invoiceNumber = data?.invoice_number ?? null
  }

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
            <h1 className="text-2xl font-bold text-sage-800">{job.job_number}</h1>
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
        <div className="flex items-center gap-3">
          <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', STATUS_STYLES[job.status] ?? STATUS_STYLES.draft)}>
            {statusLabel(job.status)}
          </span>
          <AssignJobButton jobId={job.id} currentAssignee={job.assigned_to} currentContractorId={job.contractor_id} contractors={contractors ?? []} />
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
          <JobInvoiceButton
            jobId={job.id}
            invoiceId={job.invoice_id}
            hasJobPrice={job.job_price != null && job.job_price > 0}
          />
        </div>
      </div>

      <div className="max-w-2xl space-y-8">

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

        {/* Pricing & Contractor */}
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
                worker_type: c?.worker_type ?? 'contractor',
                holiday_pay_method: c?.holiday_pay_method ?? null,
                holiday_pay_percent: c?.holiday_pay_percent ?? null,
                kiwisaver_enrolled: c?.kiwisaver_enrolled ?? false,
                kiwisaver_employer_rate: c?.kiwisaver_employer_rate ?? null,
              }
            })
            const labour = calculateLabour(job.job_price ?? 0, job.allowed_hours, workers)

            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-sage-50 rounded-lg p-3">
                    <p className="text-xs text-sage-500">Job value</p>
                    <p className="text-lg font-bold text-sage-800">{fmtCurrency(job.job_price)}</p>
                  </div>
                  <div className="bg-sage-50 rounded-lg p-3">
                    <p className="text-xs text-sage-500">Labour cost</p>
                    <p className="text-lg font-bold text-sage-800">{fmtCurrency(labour.totalLabourCost)}</p>
                  </div>
                  <div className={clsx('rounded-lg p-3', labour.grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50')}>
                    <p className={clsx('text-xs', labour.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>Gross margin</p>
                    <p className={clsx('text-lg font-bold', labour.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                      {fmtCurrency(labour.grossProfit)}
                    </p>
                  </div>
                  <div className={clsx('rounded-lg p-3', labour.marginPercent >= 0 ? 'bg-emerald-50' : 'bg-red-50')}>
                    <p className={clsx('text-xs', labour.marginPercent >= 0 ? 'text-emerald-600' : 'text-red-600')}>Margin %</p>
                    <p className={clsx('text-lg font-bold', labour.marginPercent >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                      {labour.marginPercent}%
                    </p>
                  </div>
                </div>

                {/* Cost breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
                  <div><span className="text-sage-500">Total hours</span><p className="text-sage-800 font-medium">{labour.totalHours.toFixed(1)}h</p></div>
                  <div><span className="text-sage-500">Allowed hours</span><p className="text-sage-800 font-medium">{job.allowed_hours ?? '—'}</p></div>
                  <div><span className="text-sage-500">Employer KiwiSaver</span><p className="text-sage-800 font-medium">{fmtCurrency(labour.totalEmployerKs)}</p></div>
                  <div><span className="text-sage-500">ACC levy (1.7%)</span><p className="text-sage-800 font-medium">{fmtCurrency(labour.totalAccCost)}</p></div>
                </div>

                {/* Per-worker table */}
                {labour.workers.length > 0 && (
                  <div className="border-t border-sage-100 pt-3 mt-3">
                    <span className="text-xs text-sage-500 font-semibold uppercase tracking-wide">Worker Breakdown</span>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-sage-500 border-b border-sage-100">
                            <th className="py-2 pr-3">Worker</th>
                            <th className="py-2 pr-3">Type</th>
                            <th className="py-2 pr-3 text-right">Hours</th>
                            <th className="py-2 pr-3 text-right">Rate</th>
                            <th className="py-2 pr-3 text-right">Hol. Pay</th>
                            <th className="py-2 pr-3 text-right">KS (er)</th>
                            <th className="py-2 pr-3 text-right">ACC</th>
                            <th className="py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {labour.workers.map((w) => (
                            <tr key={w.contractorId} className="border-b border-sage-50">
                              <td className="py-2 pr-3 font-medium text-sage-800">{w.fullName}</td>
                              <td className="py-2 pr-3 text-sage-600 capitalize">{w.workerType.replace('_', ' ')}</td>
                              <td className="py-2 pr-3 text-right text-sage-700">{w.hoursAllocated.toFixed(1)}</td>
                              <td className="py-2 pr-3 text-right text-sage-700">{fmtCurrency(w.hourlyRate)}</td>
                              <td className="py-2 pr-3 text-right text-sage-600">{w.holidayPay > 0 ? fmtCurrency(w.holidayPay) : '—'}</td>
                              <td className="py-2 pr-3 text-right text-sage-600">{w.employerKiwisaver > 0 ? fmtCurrency(w.employerKiwisaver) : '—'}</td>
                              <td className="py-2 pr-3 text-right text-sage-600">{w.accCost > 0 ? fmtCurrency(w.accCost) : '—'}</td>
                              <td className="py-2 text-right font-bold text-sage-800">{fmtCurrency(w.totalCost)}</td>
                            </tr>
                          ))}
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
