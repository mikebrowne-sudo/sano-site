import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { RecurringJobForm } from '../../_components/RecurringJobForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditRecurringJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: rec, error }, { data: clients }, { data: contractors }] = await Promise.all([
    supabase
      .from('recurring_jobs')
      .select('id, client_id, title, description, address, scheduled_time, duration_estimate, contractor_id, assigned_to, contractor_price, frequency, start_date, end_date, status')
      .eq('id', params.id)
      .single(),
    supabase.from('clients').select('id, name, company_name').order('name'),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  if (error || !rec) notFound()

  return (
    <div>
      <Link href={`/portal/recurring-jobs/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} /> Back to recurring job
      </Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit Recurring Job</h1>
      <RecurringJobForm recurringJob={rec} clients={clients ?? []} contractors={contractors ?? []} />
    </div>
  )
}
