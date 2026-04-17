import { createClient } from '@/lib/supabase-server'
import { CIForm } from '../_components/CIForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewContractorInvoicePage() {
  const supabase = createClient()
  const [{ data: contractors }, { data: jobs }] = await Promise.all([
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('jobs').select('id, job_number, title').order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <div>
      <Link href="/portal/contractor-invoices" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Contractor Invoice</h1>
      <CIForm contractors={contractors ?? []} jobs={jobs ?? []} />
    </div>
  )
}
