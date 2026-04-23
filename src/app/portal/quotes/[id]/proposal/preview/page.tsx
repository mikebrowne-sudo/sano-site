// Proposal Phase 2 — live commercial-quote preview using the new
// reusable proposal template.
//
// Reads the same data the existing /proposal route does (quote +
// client + commercial details + scope items + addons + settings),
// runs it through the existing buildProposalPayload, then maps it
// into the new template payload. All of this is now centralised in
// loadProposalForQuote so the /api/proposals/[id]/pdf endpoint
// uses the exact same data path.
//
// Sits next to the existing /proposal route — does NOT replace it.
// The existing CommercialProposalTemplate is unchanged.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProposalDocument } from '@/components/proposals/ProposalDocument'
import { loadProposalForQuote } from '@/lib/proposals/loadProposalForQuote'

export const metadata: Metadata = { robots: 'noindex, nofollow' }
export const dynamic = 'force-dynamic'

export default async function CommercialProposalPreviewPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  // Auth: staff only.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const result = await loadProposalForQuote(supabase, params.id)
  if (!result) notFound()

  return <ProposalDocument payload={result.payload} />
}
