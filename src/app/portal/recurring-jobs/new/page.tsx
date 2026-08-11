import { createClient } from '@/lib/supabase-server'
import { RecurringJobForm } from '../_components/RecurringJobForm'
import { BackLink } from '../../_components/BackLink'

export default async function NewRecurringJobPage() {
  const supabase = createClient()

  const [{ data: clients }, { data: contractors }] = await Promise.all([
    supabase.from('clients').select('id, name, company_name').eq('is_archived', false).order('name'),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  return (
    <div>
      <BackLink fallbackHref="/portal/recurring-jobs" label="Back to recurring jobs" />
      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Recurring Job</h1>
      <RecurringJobForm clients={clients ?? []} contractors={contractors ?? []} />
    </div>
  )
}
