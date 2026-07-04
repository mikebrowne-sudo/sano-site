import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { LeadForm } from '../../_components/LeadForm'
import type { SalesLead } from '@/lib/campaigns/constants'

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: lead } = await supabase.from('sales_leads').select('*').eq('id', params.id).single()
  if (!lead) notFound()

  return (
    <div>
      <Link
        href={`/portal/leads/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to lead
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Edit Lead</h1>
      <LeadForm lead={lead as SalesLead} />
    </div>
  )
}
