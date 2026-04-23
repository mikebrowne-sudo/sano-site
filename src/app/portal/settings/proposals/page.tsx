// Proposal settings — admin-only page (Phase 2).
// Gated identically to the pricing-engine + display-settings pages:
// 404 for non-admin so the route is effectively invisible.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { loadProposalSettings } from '@/lib/proposals/proposal-settings'
import { ProposalSettingsForm } from './_components/ProposalSettingsForm'

const ADMIN_EMAIL = 'michael@sano.nz'

export const metadata: Metadata = {
  title: 'Proposal settings — Sano Portal',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function ProposalSettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) notFound()

  const settings = await loadProposalSettings(supabase)

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
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Proposal settings</h1>
        <p className="text-sm text-sage-600 mt-1.5 max-w-2xl">
          Edit the content and commercial defaults used in commercial proposals
          (executive summary, terms, footer contact, section toggles).
          Layout, typography, colours, and component structure are locked in
          code — only the values below are editable.
        </p>
      </div>

      <ProposalSettingsForm initialSettings={settings} />
    </div>
  )
}
