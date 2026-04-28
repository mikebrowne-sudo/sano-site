// Pricing engine settings — admin-only page.
//
// Phase 3B.2 + residential-pricing-engine: page now hosts two tabs
//   - Commercial (existing — margin tiers, sector, traffic)
//   - Residential (new — time-based engine knobs)
//
// Gate: user.email === 'michael@sano.nz'. Non-admin requests see a
// standard 404 (via notFound()) — no "access denied" page, keeps the
// route effectively invisible.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { loadPricingSettings } from '@/lib/pricingSettings'
import { loadResidentialPricingSettings } from '@/lib/residentialPricingSettings'
import { PricingEngineForm } from './_components/PricingEngineForm'
import { PricingEngineTabs } from './_components/PricingEngineTabs'
import { ResidentialPricingForm } from './_components/ResidentialPricingForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export const metadata: Metadata = {
  title: 'Pricing engine — Sano Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function PricingEnginePage({
  searchParams,
}: {
  searchParams?: { tab?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) notFound()

  const tab: 'commercial' | 'residential' =
    searchParams?.tab === 'residential' ? 'residential' : 'commercial'

  const [commercial, residential] = await Promise.all([
    loadPricingSettings(supabase),
    loadResidentialPricingSettings(supabase),
  ])

  return (
    <div>
      <Link
        href="/portal/settings"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to settings
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Pricing engine</h1>
        <p className="text-sm text-sage-600 mt-1">
          Admin-only. Controls the multipliers, rates, and time policy used by the
          residential and commercial pricing previews.
        </p>
      </div>

      <PricingEngineTabs activeTab={tab} />

      <div className="mt-6">
        {tab === 'residential' ? (
          <ResidentialPricingForm settings={residential} />
        ) : (
          <PricingEngineForm settings={commercial} />
        )}
      </div>
    </div>
  )
}
