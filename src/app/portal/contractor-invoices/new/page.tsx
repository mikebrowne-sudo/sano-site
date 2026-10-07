import { createClient } from '@/lib/supabase-server'
import { CIForm } from '../_components/CIForm'
import { BackLink } from '../../_components/BackLink'

export default async function NewContractorInvoicePage() {
  const supabase = createClient()
  const [{ data: contractors }, { data: jobs }] = await Promise.all([
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
    // Job picker — no row cap. Earlier `.limit(50)` silently dropped any
    // job outside the 50 most-recent by created_at, blocking staff from
    // allocating contractors against older or in-progress jobs once the
    // job count grew past 50. Ordered by `job_number` descending so the
    // dropdown lists jobs in the same JOB-#### sequence staff use when
    // cross-referencing against invoice numbers.
    supabase.from('jobs').select('id, job_number, title').order('job_number', { ascending: false }),
  ])

  return (
    <div>
      <BackLink fallbackHref="/portal/contractor-invoices" />
      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Contractor Invoice</h1>
      <CIForm contractors={contractors ?? []} jobs={jobs ?? []} />
    </div>
  )
}
