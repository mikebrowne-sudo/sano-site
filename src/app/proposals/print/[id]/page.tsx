// Proposal print route — used by the PDF endpoint and any direct
// human "print this proposal" link.
//
// Lives OUTSIDE /portal/ so it doesn't inherit the portal layout
// (sidebar + topbar). The root layout still wraps it but that only
// adds <html><body> + brand font variables — no chrome — which is
// exactly what we want for PDF capture.
//
// Auth: same Supabase staff gate as the in-portal preview route.
// Puppeteer reaches this route over HTTP from inside the same
// Next.js server, with the user's auth cookies forwarded by the
// PDF API endpoint, so getUser() returns the same session.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProposalDocument } from '@/components/proposals/ProposalDocument'
import { loadProposalForQuote } from '@/lib/proposals/loadProposalForQuote'

export const metadata: Metadata = { robots: 'noindex, nofollow' }
export const dynamic = 'force-dynamic'

export default async function ProposalPrintPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const result = await loadProposalForQuote(supabase, params.id)
  if (!result) notFound()

  return <ProposalDocument payload={result.payload} />
}
