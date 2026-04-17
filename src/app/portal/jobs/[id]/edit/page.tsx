import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { JobForm } from '../../_components/JobForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: job, error }, { data: clients }, { data: quotes }, { data: invoices }] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        id, client_id, quote_id, invoice_id, status, job_number,
        title, description, address,
        scheduled_date, scheduled_time, duration_estimate,
        contractor_id, contractor_price, job_price,
        internal_notes, contractor_notes
      `)
      .eq('id', params.id)
      .single(),
    supabase.from('clients').select('id, name, company_name').order('name'),
    supabase.from('quotes').select('id, quote_number').order('created_at', { ascending: false }),
    supabase.from('invoices').select('id, invoice_number').order('created_at', { ascending: false }),
  ])

  if (error || !job) notFound()

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
        job={job}
        clients={clients ?? []}
        quotes={quotes ?? []}
        invoices={invoices ?? []}
      />
    </div>
  )
}
