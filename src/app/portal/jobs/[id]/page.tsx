import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { JobInvoiceButton } from './_components/JobInvoiceButton'
import { JobStatusActions } from './_components/JobStatusActions'
import { AssignJobSlot } from './_components/AssignJobSlot'
import { DuplicateJobButton } from './_components/DuplicateJobButton'
import { CreateRecurringButton } from './_components/CreateRecurringButton'
import { calculateVariance } from '@/lib/labour-calc'
import { ExtraHoursControl } from './_components/ExtraHoursControl'
import { RemoveWorkerButton, AddWorkerControl } from './_components/ManageWorkers'
import { ArchiveJobButton } from './_components/ArchiveJobButton'
import { JobWorkflowBar } from './_components/JobWorkflowBar'
import { MarkJobReviewedButton } from './_components/MarkJobReviewedButton'
import { RequestReviewButton } from './_components/RequestReviewButton'
import { JobApprovePayButton } from './_components/JobApprovePayButton'
import { classifyApprovalRow } from '@/lib/pending-approvals'
import { JobReadyToInvoice } from './_components/JobReadyToInvoice'
import { reconcileJob, type ReconciliationInput } from '@/lib/job-reconciliation'
import { JobNotificationsPanel } from './_components/JobNotificationsPanel'
import { JobMismatchBanner } from './_components/JobMismatchBanner'
import { LifecycleActions } from '../../_components/LifecycleActions'
import { getCleanupAccess } from '@/lib/cleanup-mode'
import { JobNextStepCard } from './_components/JobNextStepCard'
import { ScopeSnapshotPanel } from './_components/ScopeSnapshotPanel'
import { isAdminUser } from '@/lib/is-admin'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Panel } from '../../_components/Panel'
import { LockBanner } from '../../_components/LockBanner'
import { AmendmentOverrideButton } from '../../_components/AmendmentOverrideButton'
import { AuditTimelinePanel } from '../../_components/AuditTimelinePanel'
import { StatusBadge } from '../../_components/StatusBadge'
import { getJobPhotos } from '@/lib/job-photos'
import { JobPhotoGallery } from '@/components/JobPhotoGallery'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-sage-100 text-sage-700',
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

function statusLabel(s: string) {
  return s.replace('_', ' ')
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { override?: string }
}) {
  const supabase = createClient()

  // Perf — auth, the cleanup gate, the job row, and its workers are all
  // independent (each keyed by params.id, not by another's result), so run
  // them concurrently instead of in a 4-deep sequential waterfall. This
  // also speeds up job *saves*, since saving re-renders this page.
  const [
    { data: { user } },
    cleanup,
    { data: job, error },
    { data: jobWorkers },
    jobPhotos,
  ] = await Promise.all([
    supabase.auth.getUser(),
    getCleanupAccess(supabase),
    supabase
      .from('jobs')
      .select(`
        id, job_number, client_id, quote_id, invoice_id, recurring_job_id, status, assigned_to,
        title, description, address,
        scheduled_date, scheduled_time, duration_estimate,
        contractor_id, contractor_price, job_price, allowed_hours,
        started_at, completed_at,
        payment_status, reviewed_at, reviewed_by, access_instructions,
        internal_notes, contractor_notes,
        deleted_at, deleted_by, is_test,
        scope_snapshot,
        created_at, updated_at,
        clients ( name, company_name )
      `)
      .eq('id', params.id)
      .single(),
    // Assigned workers with payroll fields for costing (Phase E pay
    // snapshot columns included for the ApproveHours read-only summary).
    supabase
      .from('job_workers')
      .select('contractor_id, hours_allocated, actual_start_time, actual_end_time, actual_hours, pay_rate, pay_type, approved_hours, approved_at, approved_by, pay_status, extra_hours, extra_hours_status, extra_hours_reason, contractors ( full_name, hourly_rate, worker_type, holiday_pay_method, holiday_pay_percent, kiwisaver_enrolled, kiwisaver_employer_rate )')
      .eq('job_id', params.id),
    // Contractor proof-of-completion photos (read-only for staff).
    getJobPhotos(params.id),
  ])
  const isAdmin = isAdminUser(user)
  const canCleanup = cleanup.canCleanup

  if (error || !job) notFound()

  const client = job.clients as unknown as { name: string; company_name: string | null } | null

  // Phase D.2 — archive (soft-delete) is admin-only. No status/linked
  // guards since the row can always be restored from
  // /portal/settings/archive, and the server action is idempotent
  // when the row is already archived.
  const isArchived = job.deleted_at != null
  const canArchiveJob = isAdmin && !isArchived
  const needsRecipientPhones = isAdmin && !isArchived

  // Phase 3 perf — fan out the four conditional lookups in parallel.
  // The original code awaited each in sequence (quote → invoice →
  // contractor phone → client phone) even though every one is
  // independent once the main `job` row is in hand. Folding them into
  // one Promise.all roughly halves the wall time on this page.
  // Each branch resolves to its own narrow row (or null) so the
  // post-batch destructuring stays straightforward.
  const [
    linkedQuoteRes,
    linkedInvoiceRes,
    contractorPhoneRes,
    clientPhoneRes,
    // Phase G.2 step 3 — supplementary fetches used by the
    // Ready-to-invoice panel. The linked-invoice query is extended to
    // also pull the totals fields so reconcileJob's
    // flagInvoiceTotalDiffersFromPrice has data to compare against.
    contractorInvoiceRes,
    payRunItemRes,
  ] = await Promise.all([
    job.quote_id
      ? supabase.from('quotes').select('quote_number, client_id').eq('id', job.quote_id).single()
      : Promise.resolve({ data: null as { quote_number: string | null; client_id: string | null } | null }),
    job.invoice_id
      ? supabase
          .from('invoices')
          .select('invoice_number, status, base_price, discount, invoice_items ( price )')
          .eq('id', job.invoice_id)
          .single()
      : Promise.resolve({
          data: null as {
            invoice_number: string | null
            status: string | null
            base_price: number | null
            discount: number | null
            invoice_items: { price: number | null }[] | null
          } | null,
        }),
    needsRecipientPhones && job.contractor_id
      ? supabase.from('contractors').select('phone').eq('id', job.contractor_id).single()
      : Promise.resolve({ data: null as { phone: string | null } | null }),
    needsRecipientPhones && job.client_id
      ? supabase.from('clients').select('phone').eq('id', job.client_id).single()
      : Promise.resolve({ data: null as { phone: string | null } | null }),
    supabase
      .from('contractor_invoices')
      .select('id, invoice_number, amount, status, job_id, contractor_id')
      .eq('job_id', params.id),
    supabase
      .from('pay_run_items')
      .select('job_id, contractor_id')
      .eq('job_id', params.id),
  ])

  // Stage C — existing payables for this job, keyed by contractor, so the
  // pay-approval panel and the cost-table badge reflect the canonical CI.
  const ciByContractor = new Map<string, { id: string; invoice_number: string | null; amount: number | null; status: string | null }>()
  for (const ci of (contractorInvoiceRes.data ?? []) as Array<{ id: string; invoice_number: string | null; amount: number | null; status: string | null; contractor_id: string | null }>) {
    if (ci.contractor_id) ciByContractor.set(ci.contractor_id, { id: ci.id, invoice_number: ci.invoice_number, amount: ci.amount, status: ci.status })
  }

  // Active contractors NOT yet assigned — feeds the inline "Add contractor"
  // control on the Labour & Margin breakdown (admin only).
  const assignedContractorIds = new Set((jobWorkers ?? []).map((w) => w.contractor_id as string))
  const { data: activeContractors } = isAdmin
    ? await supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name')
    : { data: null as { id: string; full_name: string }[] | null }
  const unassignedContractors = (activeContractors ?? []).filter((c) => !assignedContractorIds.has(c.id))

  const quoteNumber  = linkedQuoteRes.data?.quote_number ?? null
  const quoteClientId = (linkedQuoteRes.data as { client_id?: string } | null)?.client_id ?? null
  const invoiceNumber = linkedInvoiceRes.data?.invoice_number ?? null
  const linkedInvoiceStatus = linkedInvoiceRes.data?.status ?? null
  const hasContractorPhone = !!(contractorPhoneRes.data?.phone && String(contractorPhoneRes.data.phone).trim())
  const hasCustomerPhone   = !!(clientPhoneRes.data?.phone     && String(clientPhoneRes.data.phone).trim())

  // Phase G.2 step 3 — compute reconciliation flags for the Ready-to-invoice
  // panel. Mirrors the data-shape contract used by /portal/finance's
  // attention widget (see src/lib/finance-attention-data.ts).
  const linkedInvoiceRow = linkedInvoiceRes.data
  const linkedInvoiceTotal = (() => {
    if (!linkedInvoiceRow) return null
    const items = (linkedInvoiceRow.invoice_items ?? []) as { price: number | null }[]
    const addons = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    return (linkedInvoiceRow.base_price ?? 0) + addons - (linkedInvoiceRow.discount ?? 0)
  })()

  const reconcileInput: ReconciliationInput = {
    job: {
      id: job.id as string,
      job_number: (job.job_number as string | null) ?? null,
      status: job.status as string,
      client_id: (job.client_id as string | null) ?? null,
      job_price: (job.job_price as number | null) ?? null,
      allowed_hours: (job.allowed_hours as number | null) ?? null,
      description: (job.description as string | null) ?? null,
      scope_snapshot: (job.scope_snapshot as unknown) ?? null,
      invoice_id: (job.invoice_id as string | null) ?? null,
      completed_at: (job.completed_at as string | null) ?? null,
    },
    workers: (jobWorkers ?? []).map((w) => {
      const c = w.contractors as unknown as { hourly_rate: number | null } | null
      return {
        contractor_id: w.contractor_id as string,
        pay_rate: (w.pay_rate as number | null) ?? null,
        contractor_hourly_rate: c?.hourly_rate ?? null,
        approved_hours: (w.approved_hours as number | null) ?? null,
        actual_hours: (w.actual_hours as number | null) ?? null,
        hours_allocated: (w.hours_allocated as number | null) ?? null,
        pay_status: (w.pay_status as string | null) ?? null,
        approved_at: (w.approved_at as string | null) ?? null,
      }
    }),
    invoice: linkedInvoiceTotal != null ? { total: linkedInvoiceTotal } : null,
    contractorInvoices: (contractorInvoiceRes.data ?? []) as Array<{ job_id: string; contractor_id: string }>,
    payRunItems: (payRunItemRes.data ?? []) as Array<{ job_id: string; contractor_id: string }>,
  }

  const readyToInvoiceFlags = reconcileJob(reconcileInput)
  const readyToInvoiceSeverityCounts = { hard: 0, warning: 0, info: 0 }
  for (const f of readyToInvoiceFlags) readyToInvoiceSeverityCounts[f.severity] += 1

  // Phase 5.5.10 — flag jobs whose linked quote belongs to a different client.
  const hasClientMismatch = !!quoteClientId && quoteClientId !== job.client_id

  // Silence lint — retained temporarily for downstream references
  // once we reintroduce hard-delete UI behind an admin override.
  void linkedInvoiceStatus

  // Phase 5B — invoice-existence lock + admin override.
  const lockedByInvoice = !!job.invoice_id
  const overrideRequested = searchParams?.override === '1'
  const overrideActive = lockedByInvoice && isAdmin && overrideRequested

  return (
    <div>
      <Link
        href="/portal/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to jobs
      </Link>

      {isAdmin && hasClientMismatch && (
        <JobMismatchBanner jobId={job.id as string} quoteNumber={quoteNumber} />
      )}

      {isAdmin && canCleanup && (
        <div className="mb-4">
          <LifecycleActions
            entity="job"
            id={job.id as string}
            isArchived={isArchived}
            isTest={!!(job as { is_test?: boolean }).is_test}
          />
        </div>
      )}

      <JobNextStepCard
        jobId={job.id as string}
        jobPrice={(job.job_price as number | null) ?? null}
        invoiceId={(job.invoice_id as string | null) ?? null}
        isCompleted={job.status === 'completed' || !!job.completed_at}
        isArchived={isArchived}
      />

      {lockedByInvoice && !overrideActive && invoiceNumber && (
        <LockBanner
          invoiceNumber={invoiceNumber}
          invoiceHref={`/portal/invoices/${job.invoice_id}`}
          override={
            isAdmin ? (
              <AmendmentOverrideButton invoiceNumber={invoiceNumber} entity="job" entityId={params.id} />
            ) : undefined
          }
        />
      )}

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
              <Link href={`/portal/recurring-jobs/${job.recurring_job_id}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sage-50 text-sage-600 text-xs font-medium hover:bg-sage-100 transition-colors">
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
          <AssignJobSlot
            jobId={job.id}
            currentAssignee={job.assigned_to}
            currentContractorId={job.contractor_id}
            currentScheduledDate={job.scheduled_date}
            currentScheduledTime={job.scheduled_time}
            currentAllowedHours={job.allowed_hours}
            currentAccessInstructions={job.access_instructions}
            currentInternalNotes={job.internal_notes}
          />
          <Link
            href={`/portal/jobs/${params.id}/edit${overrideActive ? '?override=1' : ''}`}
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
          {/* Post-job Google review request — completed/invoiced jobs. */}
          {(job.status === 'completed' || job.status === 'invoiced') && (
            <RequestReviewButton jobId={job.id} />
          )}
          <JobInvoiceButton
            jobId={job.id}
            invoiceId={job.invoice_id}
            hasJobPrice={job.job_price != null && job.job_price > 0}
          />
        </div>
      </div>

      {/* Phase H — manual SMS panel. Admin-only, hidden on archived
          jobs. Renders only when a phone number actually exists for
          the contractor or client. */}
      {isAdmin && !isArchived && (hasContractorPhone || hasCustomerPhone) && (
        <div className="flex justify-end mb-3">
          <JobNotificationsPanel
            jobId={job.id}
            hasContractorPhone={hasContractorPhone}
            hasCustomerPhone={hasCustomerPhone}
          />
        </div>
      )}

      {canArchiveJob && (
        <div className="flex justify-end mb-6">
          <ArchiveJobButton jobId={job.id} jobNumber={job.job_number} />
        </div>
      )}
      {isArchived && (
        <Panel variant="warning" className="text-amber-800 text-sm mb-6">
          This job is archived. Restore it from{' '}
          <Link href="/portal/settings/archive" className="underline hover:text-amber-900">Settings → Archive</Link>{' '}
          to make changes.
        </Panel>
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
              <p className="text-sage-800 font-medium">{formatDate(job.scheduled_date)}</p>
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
                <p className="text-sage-800 font-medium">{formatDateTime(job.started_at)}</p>
              </div>
              <div>
                <span className="text-sage-500">Completed</span>
                <p className="text-sage-800 font-medium">{formatDateTime(job.completed_at)}</p>
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

        {/* Phase 2 cleanup — point-in-time scope captured at job
            creation. Read-only; falls back to an empty-state message
            when the column is null. */}
        <ScopeSnapshotPanel snapshot={(job as { scope_snapshot?: unknown }).scope_snapshot ?? null} />

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
            // Phase G.1 — pass the snapshotted job-specific pay_rate
            // through to the calculator so cost figures reflect the
            // rate captured on this job, not the live contractor rate.
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
                pay_rate: (w.pay_rate as number | null) ?? null,
                pay_type: (w.pay_type as string | null) ?? null,
                hours_allocated: w.hours_allocated,
                actual_hours: w.actual_hours ?? null,
                extra_hours: (w.extra_hours as number | null) ?? 0,
                extra_hours_status: (w.extra_hours_status as string | null) ?? 'none',
                extra_hours_reason: (w.extra_hours_reason as string | null) ?? null,
                worker_type: c?.worker_type ?? 'contractor',
                holiday_pay_method: c?.holiday_pay_method ?? null,
                holiday_pay_percent: c?.holiday_pay_percent ?? null,
                kiwisaver_enrolled: c?.kiwisaver_enrolled ?? false,
                kiwisaver_employer_rate: c?.kiwisaver_employer_rate ?? null,
              }
            })
            const v = calculateVariance(job.job_price ?? 0, job.allowed_hours, workers)
            // Allowed-hours model: the "Actual" column only appears when
            // there are admin-APPROVED extra hours (the job ran over and
            // was signed off). Allowed hours alone are the default basis.
            const hasExtra = workers.some((w) => w.extra_hours_status === 'approved' && (w.extra_hours ?? 0) !== 0)

            return (
              <>
                {/* Estimate vs Actual comparison */}
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm tnum">
                    <thead>
                      <tr className="text-left text-sage-500 border-b border-gray-100">
                        <th className="py-2 pr-4"></th>
                        <th className="py-2 pr-4 text-right">Estimated</th>
                        {hasExtra && <th className="py-2 pr-4 text-right">With adjustment</th>}
                        {hasExtra && <th className="py-2 text-right">Variance</th>}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Job value</td>
                        <td className="py-2 pr-4 text-right font-bold text-sage-800" colSpan={hasExtra ? 3 : 1}>{formatCurrency(job.job_price)}</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Hours</td>
                        <td className="py-2 pr-4 text-right text-sage-800">{v.estimated.totalHours.toFixed(1)}h</td>
                        {hasExtra && <td className="py-2 pr-4 text-right text-sage-800">{v.actual.totalHours.toFixed(1)}h</td>}
                        {hasExtra && <td className="py-2 text-right"><VarCell value={v.hoursVariance} suffix="h" /></td>}
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Labour cost</td>
                        <td className="py-2 pr-4 text-right text-sage-800">{formatCurrency(v.estimated.totalLabourCost)}</td>
                        {hasExtra && <td className="py-2 pr-4 text-right text-sage-800">{formatCurrency(v.actual.totalLabourCost)}</td>}
                        {hasExtra && <td className="py-2 text-right"><VarCell value={v.costVariance} currency /></td>}
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">Employer KS</td>
                        <td className="py-2 pr-4 text-right text-sage-600">{formatCurrency(v.estimated.totalEmployerKs)}</td>
                        {hasExtra && <td className="py-2 pr-4 text-right text-sage-600">{formatCurrency(v.actual.totalEmployerKs)}</td>}
                        {hasExtra && <td className="py-2 text-right"></td>}
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td className="py-2 pr-4 text-sage-600">ACC (1.7%)</td>
                        <td className="py-2 pr-4 text-right text-sage-600">{formatCurrency(v.estimated.totalAccCost)}</td>
                        {hasExtra && <td className="py-2 pr-4 text-right text-sage-600">{formatCurrency(v.actual.totalAccCost)}</td>}
                        {hasExtra && <td className="py-2 text-right"></td>}
                      </tr>
                      <tr className={clsx(v.estimated.grossProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50')}>
                        <td className="py-2.5 pr-4 font-semibold text-sage-800">Gross margin</td>
                        <td className="py-2.5 pr-4 text-right font-bold">
                          <span className={v.estimated.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{formatCurrency(v.estimated.grossProfit)}</span>
                          <span className="text-sage-500 font-normal text-xs ml-1">({v.estimated.marginPercent}%)</span>
                        </td>
                        {hasExtra && (
                          <td className="py-2.5 pr-4 text-right font-bold">
                            <span className={v.actual.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}>{formatCurrency(v.actual.grossProfit)}</span>
                            <span className="text-sage-500 font-normal text-xs ml-1">({v.actual.marginPercent}%)</span>
                          </td>
                        )}
                        {hasExtra && <td className="py-2.5 text-right"><VarCell value={v.marginVariance} currency invert /></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Per-worker breakdown — Phase G.1.
                    Columns prioritise the financial story for the job:
                    allowed vs actual vs approved hours, snapshotted job
                    pay rate, the final approved payable amount (bold),
                    hours+cost variance, and the current pay status. */}
                {v.estimated.workers.length > 0 && (
                  <div className="border-t border-sage-100 pt-3">
                    <span className="text-xs text-sage-500 font-semibold uppercase tracking-wide">Worker Breakdown</span>
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full text-xs tnum">
                        <thead>
                          <tr className="text-left text-sage-500 border-b border-gray-100">
                            <th className="py-2 pr-2">Worker</th>
                            <th className="py-2 pr-2">Type</th>
                            <th className="py-2 pr-2 text-right">Allowed</th>
                            <th className="py-2 pr-2 text-right">Adjustment</th>
                            <th className="py-2 pr-2 text-right">Rate</th>
                            <th className="py-2 pr-2 text-right">Pay</th>
                            <th className="py-2 pr-2 text-right">Status</th>
                            {isAdmin && <th className="py-2 text-right"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {v.estimated.workers.map((ew, i) => {
                            const w = workers[i]
                            const raw = jobWorkers?.[i]
                            // Prefer snapshotted pay_rate; fall back to
                            // live hourly_rate for rows that pre-date
                            // the assignment-time snapshot. The badge
                            // below labels which source is in use.
                            const snapshotPayRate = (w?.pay_rate as number | null) ?? null
                            const fallbackRate = w?.hourly_rate ?? null
                            const payRate = snapshotPayRate ?? fallbackRate ?? 0
                            const rateSource: 'snapshot' | 'estimate' | 'missing' =
                              snapshotPayRate != null
                                ? 'snapshot'
                                : fallbackRate != null
                                  ? 'estimate'
                                  : 'missing'
                            const payStatus = (raw?.pay_status as string | null) ?? 'pending'
                            // Stage C — the badge reflects the canonical payable (the
                            // contractor_invoice) when one exists; otherwise the legacy
                            // job_workers pay_status. `locked` stays on pay_status so the
                            // extra-hours control behaviour is unchanged.
                            const ciForWorker = ciByContractor.get(ew.contractorId)
                            const payBadgeStatus = ciForWorker ? (ciForWorker.status ?? 'approved') : payStatus
                            // Allowed-hours model: payable = allowed +
                            // admin-APPROVED extra. Pending / rejected
                            // extra never counts toward pay.
                            const allowedHrs = w?.hours_allocated ?? null
                            const extraStatus = (w?.extra_hours_status as string | null) ?? 'none'
                            const extraHrs = (w?.extra_hours as number | null) ?? 0
                            const approvedExtra = extraStatus === 'approved' ? extraHrs : 0
                            const payableHrs = allowedHrs != null ? allowedHrs + approvedExtra : null
                            const pay = payableHrs != null ? payableHrs * payRate : null
                            const locked = payStatus === 'included_in_pay_run' || payStatus === 'paid'
                            return (
                              <tr key={ew.contractorId} className="border-b border-gray-50">
                                <td className="py-2 pr-2 font-medium text-sage-800">{ew.fullName}</td>
                                <td className="py-2 pr-2 text-sage-600 capitalize">{ew.workerType.replace('_', ' ')}</td>
                                <td className="py-2 pr-2 text-right text-sage-700">{allowedHrs != null ? `${allowedHrs.toFixed(1)}h` : '—'}</td>
                                <td className="py-2 pr-2 text-right">
                                  <ExtraHoursControl
                                    jobId={job.id}
                                    contractorId={ew.contractorId}
                                    contractorName={ew.fullName}
                                    allowedHours={allowedHrs}
                                    extraHours={extraHrs}
                                    extraStatus={extraStatus}
                                    extraReason={(w?.extra_hours_reason as string | null) ?? null}
                                    isAdmin={isAdmin}
                                    locked={locked}
                                  />
                                </td>
                                <td className="py-2 pr-2 text-right text-sage-700">
                                  <span className="inline-flex items-center gap-1 justify-end">
                                    <span>{formatCurrency(payRate)}</span>
                                    {rateSource === 'estimate' && (
                                      <span
                                        className="text-[9px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded"
                                        title="Rate not snapshotted on this job. Estimated from the contractor's current profile rate; approving the worker for pay snapshots a permanent pay_rate."
                                      >
                                        est.
                                      </span>
                                    )}
                                    {rateSource === 'missing' && (
                                      <span
                                        className="text-[9px] font-semibold uppercase tracking-wide text-red-700 bg-red-50 px-1.5 py-0.5 rounded"
                                        title="No pay rate on this job and no hourly rate on the contractor profile. Set the contractor's hourly rate to compute labour cost."
                                      >
                                        missing
                                      </span>
                                    )}
                                  </span>
                                </td>
                                <td className="py-2 pr-2 text-right">
                                  {pay != null
                                    ? (
                                      <span className="inline-flex flex-col items-end">
                                        <span className="font-bold text-sage-800">{formatCurrency(pay)}</span>
                                        {approvedExtra !== 0 && (
                                          <span className="text-[10px] text-sage-400">{(payableHrs ?? 0).toFixed(1)}h</span>
                                        )}
                                      </span>
                                    )
                                    : <span className="text-sage-300">—</span>}
                                </td>
                                <td className="py-2 pr-2 text-right"><StatusBadge kind="pay" status={payBadgeStatus} /></td>
                                {isAdmin && (
                                  <td className="py-2 text-right">
                                    <RemoveWorkerButton
                                      jobId={job.id}
                                      contractorId={ew.contractorId}
                                      contractorName={ew.fullName}
                                      blockedReason={
                                        locked
                                          ? 'In a pay run / paid — can’t remove'
                                          : ciForWorker
                                            ? `Has a payable (${ciForWorker.invoice_number ?? 'contractor invoice'}) — can’t remove`
                                            : null
                                      }
                                    />
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {isAdmin && <AddWorkerControl jobId={job.id} options={unassignedContractors} />}
                  </div>
                )}

                {/* Empty state — no workers assigned yet, but admins can
                    still add one (the breakdown table above is hidden when
                    there are zero workers). */}
                {isAdmin && v.estimated.workers.length === 0 && (
                  <div className="border-t border-sage-100 pt-3">
                    <span className="text-xs text-sage-500 font-semibold uppercase tracking-wide">Worker Breakdown</span>
                    <p className="text-[11px] text-sage-400 mt-1">No contractors assigned yet.</p>
                    <AddWorkerControl jobId={job.id} options={unassignedContractors} />
                  </div>
                )}

                {/* Phase E — Approve Hours for Pay. Admin only. Only
                    renders for completed / invoiced jobs. Each worker
                    gets its own approval control using the snapshot
                    fields we loaded above. */}
                {isAdmin && (job.status === 'completed' || job.status === 'invoiced') && workers.length > 0 && (
                  <div className="border-t border-sage-100 pt-3 mt-4">
                    <span className="text-xs text-sage-500 font-semibold uppercase tracking-wide">Pay approvals</span>
                    <p className="text-[11px] text-sage-400 mt-0.5">Approving creates an approved contractor invoice that flows into a remittance. Same as the Pending approvals worklist.</p>
                    <div className="mt-2 space-y-2">
                      {workers.map((w) => {
                        const allowed = w.hours_allocated ?? job.allowed_hours ?? null
                        const approvedExtra = w.extra_hours_status === 'approved' ? (w.extra_hours ?? 0) : 0
                        const payableHours = allowed != null ? Math.round((allowed + approvedExtra) * 100) / 100 : null
                        const rate = (w.pay_rate as number | null) ?? w.hourly_rate ?? null
                        const existingCI = ciByContractor.get(w.contractor_id) ?? null
                        const computed = classifyApprovalRow({
                          payType: (w.pay_type as string | null) ?? null,
                          rate,
                          allowedHours: allowed,
                          submittedHours: (w.actual_hours as number | null) ?? null,
                          payableHours,
                          hasExistingCI: !!existingCI,
                          workersOnJob: workers.length,
                        })
                        return (
                          <div key={w.contractor_id} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-sage-700 font-medium">{w.full_name}</span>
                            <JobApprovePayButton
                              jobId={job.id}
                              contractorId={w.contractor_id}
                              contractorName={w.full_name}
                              mode={computed.mode}
                              defaultApprovedHours={payableHours}
                              rate={rate}
                              computedAmount={computed.computedAmount}
                              existingCI={existingCI}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </Section>

        {/* Phase G.2 step 3 — Ready-to-invoice panel. Signal-not-gate:
            surfaces cleanup issues that may affect invoicing, contractor
            pay, or reporting; does not block any conversion flow. */}
        <JobReadyToInvoice
          flags={readyToInvoiceFlags}
          severityCounts={readyToInvoiceSeverityCounts}
        />

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

        {/* Contractor photos — proof of completion (read-only for staff). */}
        {jobPhotos.length > 0 && (
          <Section title={`Photos (${jobPhotos.length})`}>
            <JobPhotoGallery photos={jobPhotos.map((p) => ({ id: p.id, url: p.url, createdAt: p.createdAt }))} />
            <p className="text-[11px] text-sage-400 mt-3">Uploaded by the contractor as proof of completion.</p>
          </Section>
        )}

        {/* Timestamps */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-sage-400 pt-4 border-t border-sage-100">
          <span>Created {formatDateTime(job.created_at)}</span>
          <span>Updated {formatDateTime(job.updated_at)}</span>
        </div>

        {/* Phase 5B — read-only audit timeline (includes amendment events). */}
        <AuditTimelinePanel
          supabase={supabase}
          entityTable="jobs"
          entityId={job.id as string}
          className="mt-2"
        />
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

// (Pay-status pill consolidated into <StatusBadge kind="pay" /> — the
// canonical labels/styles now live in src/lib/quote-status.ts.)
