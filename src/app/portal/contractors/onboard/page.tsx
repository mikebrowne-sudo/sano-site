import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { SendOnboardingPackForm } from './SendOnboardingPackForm'

export const dynamic = 'force-dynamic'

export default async function OnboardContractorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  return (
    <div className="max-w-3xl">
      <Link
        href="/portal/contractors"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to workforce
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-1">Onboard a contractor</h1>
      <p className="text-sm text-sage-500 mb-6">
        Sends the contractor a secure link to fill in their business, bank, insurance and team details, upload documents and e-sign their
        agreement online. The signed PDF is emailed to them and to you. They stay as Onboarding until you&rsquo;ve checked their ID and
        insurance and set them active.
      </p>

      <SendOnboardingPackForm />
    </div>
  )
}
