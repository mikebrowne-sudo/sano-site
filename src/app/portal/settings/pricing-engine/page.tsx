// Pricing engine settings — admin-only page (Phase 3B.2).
//
// Gate: user.email === 'michael@sano.nz'. Non-admin requests see a
// standard 404 (via notFound()) — no "access denied" page, keeps the
// route effectively invisible.
//
// force-dynamic so the settings always reflect the latest DB values;
// avoids any stale-cache confusion when an admin comes back to check
// what's saved.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { loadPricingSettings } from '@/lib/pricingSettings'
import { PricingEngineForm } from './_components/PricingEngineForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export const metadata: Metadata = {
  title: 'Pricing engine — Sano Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function PricingEnginePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) notFound()

  const settings = await loadPricingSettings(supabase)

  return (
    <div>
      <Link
        href="/portal/settings"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to settings
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-sage-800">Pricing engine</h1>
        <p className="text-sm text-sage-600 mt-1">
          Admin-only. Controls the multipliers and margin tiers used by the commercial pricing preview.
        </p>
      </div>

      <PricingEngineForm settings={settings} />
    </div>
  )
}
