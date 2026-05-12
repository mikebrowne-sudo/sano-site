import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { JobForm } from '../../_components/JobForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { isAdminUser } from '@/lib/is-admin'

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
