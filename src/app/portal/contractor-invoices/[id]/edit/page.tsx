import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { CIForm } from '../../_components/CIForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditContractorInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: ci, error }, { data: contractors }, { data: jobs }] = await Promise.all([
    supabase.from('contractor_invoices').select('id, contractor_id, job_id, amount, date_submitted, notes, status').eq('id', params.id).single(),
    supabase.from('contractors').select('id, full_name').eq('status', 'active').order('full_name'),
    supabase.from('jobs').select('id, job_number, title').order('created_at', { ascending: false }).limit(50),
  ])

  if (error || !ci) notFound()

  return (
    <div>
      <Link href={`/portal/contractor-invoices/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>
      <h1 className="text-2xl font-bold text-sage-800 mb-8">Edit Contractor Invoice</h1>
      <CIForm ci={ci} contractors={contractors ?? []} jobs={jobs ?? []} />
    </div>
  )
}
