import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { NewCampaignForm } from '../_components/NewCampaignForm'

export default async function NewCampaignPage() {
  const supabase = createClient()

  // Eligible = has an email, hasn't opted out, isn't lost/won already.
  const { data: leads } = await supabase
    .from('sales_leads')
    .select('id, company, contact_name, contact_role, email, quality_rank, status, industry')
    .not('email', 'is', null)
    .is('unsubscribed_at', null)
    .not('status', 'in', '(do_not_contact,lost,won)')
    .order('quality_rank')
    .order('company')

  return (
    <div>
      <Link
        href="/portal/campaigns"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to campaigns
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">New Campaign</h1>
      <NewCampaignForm leads={leads ?? []} />
    </div>
  )
}
