import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { JobForm } from '../../_components/JobForm'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { isAdminUser } from '@/lib/is-admin'
import { LockBanner } from '../../../_components/LockBanner'
import { AmendmentOverrideButton } from '../../../_components/AmendmentOverrideButton'

export default async function EditJobPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { override?: string }
}) {
  const supabase = createClient()

  const [{ data: job, error }, { data: clients }, { data: contractors }, { data: quotes }, { data: invoices }, { data: existingWorkers }] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        id, client_id, quote_id, invoice_id, status, job_number,
        title, description, address,
        scheduled_date, scheduled_time, duration_estimate,
        assigned_to, contractor_id, contractor_price, job_price, allowed_hours,
        internal_notes, contractor_notes
      `)
      .eq('id', params.id)
      .single(),
    supabase.from('clients').select('id, name, company_name').eq('is_archived', false).order('name'),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('quotes').select('id, quote_number').order('created_at', { ascending: false }),
    supabase.from('invoices').select('id, invoice_number').order('created_at', { ascending: false }),
    supabase.from('job_workers').select('contractor_id').eq('job_id', params.id),
  ])

  if (error || !job) notFound()

  // Phase 5B — invoice-existence lock + admin override (server-side re-verify).
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isAdminUser(user)
  const lockedByInvoice = !!job.invoice_id
  const overrideActive = lockedByInvoice && isAdmin && searchParams?.override === '1'
  const invoiceNumber = lockedByInvoice
    ? (invoices ?? []).find((i) => i.id === job.invoice_id)?.invoice_number ?? null
    : null

  return (
    <div>
      <Link
        href={`/portal/jobs/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to job
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit {job.job_number}</h1>

      {/* Invoice-lock: on a locked job the material fields (client price,
          contractor hours, description, address) stay disabled until an admin
          unlocks the form here with a reason. Clicking "Edit anyway" reloads
          this page in override mode, which enables every field. */}
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

      {overrideActive && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-6">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Override active — all fields are editable.</p>
              <p className="text-xs text-emerald-800 mt-0.5">
                This job is invoiced{invoiceNumber ? ` (${invoiceNumber})` : ''}. Your changes are logged and saved to the
                job&apos;s edit history so they can be reverted. Editing does not change the invoice itself.
              </p>
            </div>
          </div>
        </section>
      )}

      <JobForm
        job={{ ...job, worker_ids: (existingWorkers ?? []).map((w) => w.contractor_id) }}
        clients={clients ?? []}
        contractors={contractors ?? []}
        quotes={quotes ?? []}
        invoices={invoices ?? []}
        lockedByInvoice={lockedByInvoice}
        overrideActive={overrideActive}
      />
    </div>
  )
}
