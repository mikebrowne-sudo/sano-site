import { createClient } from '@/lib/supabase-server'
import { RecurringJobForm } from '../_components/RecurringJobForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewRecurringJobPage() {
  const supabase = createClient()

  const [{ data: clients }, { data: contractors }] = await Promise.all([
    supabase.from('clients').select('id, name, company_name').eq('is_archived', false).order('name'),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  return (
    <div>
      <Link href="/portal/recurring-jobs" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} /> Back to recurring jobs
      </Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Recurring Job</h1>
      <RecurringJobForm clients={clients ?? []} contractors={contractors ?? []} />
    </div>
  )
}
