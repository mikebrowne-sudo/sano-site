import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { isAdminUser } from '@/lib/is-admin'
import { HubGrid } from '../_components/HubGrid'
import { Target, Megaphone, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MarketingHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  return (
    <HubGrid
      title="Leads & marketing"
      intro="Growth work — incoming leads, outbound campaigns and customer reviews."
      sections={[
        {
          cards: [
            { href: '/portal/leads', title: 'Leads', desc: 'Incoming enquiries and their status.', icon: Target },
            { href: '/portal/campaigns', title: 'Campaigns', desc: 'Outbound marketing campaigns.', icon: Megaphone },
            { href: '/portal/reviews', title: 'Reviews', desc: 'Request and display customer reviews.', icon: Star },
          ],
        },
      ]}
    />
  )
}
