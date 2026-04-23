// Phase 2 — Display settings (admin-only).
// Gated identically to the pricing-engine page: 404 for non-admin so
// the route is effectively invisible.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { loadDisplaySettings } from '@/lib/portal-display-settings'
import { DisplaySettingsForm } from './_components/DisplaySettingsForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export const metadata: Metadata = {
  title: 'Display settings — Sano Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function DisplaySettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) notFound()

  const settings = await loadDisplaySettings(supabase)

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
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Display settings</h1>
        <p className="text-sm text-sage-600 mt-1.5 max-w-2xl">
          Controls how Jobs and Quotes are <strong>displayed</strong> across the portal —
          which fields are visible, the default sort, and the primary/secondary emphasis.
          These settings affect presentation only; the underlying data and workflows
          are unchanged.
        </p>
      </div>

      <DisplaySettingsForm initialSettings={settings} />
    </div>
  )
}
