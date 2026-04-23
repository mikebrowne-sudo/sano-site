// Proposal Phase 1 — fixture-driven preview.
//
// Fastest QA loop for the new proposal template. Uses the static
// fixture so the page renders identically every time and doesn't
// depend on any quote existing. Staff-only — 404 for non-authed.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProposalDocument } from '@/components/proposals/ProposalDocument'
import { proposalFixture } from '@/lib/proposals/buildProposalPayload'
import { loadProposalSettings } from '@/lib/proposals/proposal-settings'

export const metadata: Metadata = {
  title: 'Proposal preview — Sano',
  robots: 'noindex, nofollow',
}

export const dynamic = 'force-dynamic'

export default async function ProposalPreviewPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const settings = await loadProposalSettings(supabase)
  const payload = proposalFixture(settings)
  return <ProposalDocument payload={payload} />
}
