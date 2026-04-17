import { createClient } from '@/lib/supabase-server'
import { JobForm } from '../_components/JobForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewJobPage() {
  const supabase = createClient()

  const [{ data: clients }, { data: quotes }, { data: invoices }] = await Promise.all([
    supabase.from('clients').select('id, name, company_name').order('name'),
    supabase.from('quotes').select('id, quote_number').order('created_at', { ascending: false }),
    supabase.from('invoices').select('id, invoice_number').order('created_at', { ascending: false }),
  ])

  return (
    <div>
      <Link
        href="/portal/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to jobs
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Job</h1>

      <JobForm
        clients={clients ?? []}
        quotes={quotes ?? []}
        invoices={invoices ?? []}
      />
    </div>
  )
}
