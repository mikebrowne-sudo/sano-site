import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { RecurringJobForm } from '../../_components/RecurringJobForm'
import { BackLink } from '../../../_components/BackLink'

export default async function EditRecurringJobPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: rec, error }, { data: clients }, { data: contractors }] = await Promise.all([
    supabase
      .from('recurring_jobs')
      .select('id, client_id, title, description, address, scheduled_time, duration_estimate, contractor_id, contractor_pay_type, assigned_to, contractor_price, frequency, start_date, end_date, status, monthly_value, invoice_auto_send, invoice_send_day, contractor_monthly_pay, billing_mode, per_visit_rate, service_days_of_week, contractor_rate_override')
      .eq('id', params.id)
      .single(),
    supabase.from('clients').select('id, name, company_name').eq('is_archived', false).order('name'),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  if (error || !rec) notFound()

  return (
    <div>
      <BackLink fallbackHref={`/portal/recurring-jobs/${params.id}`} label="Back to recurring job" />
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit Recurring Job</h1>
      <RecurringJobForm recurringJob={rec} clients={clients ?? []} contractors={contractors ?? []} />
    </div>
  )
}
