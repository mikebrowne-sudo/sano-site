import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getProposalById } from '@/lib/proposals/queries'
import { buildProposalViewModel } from '@/lib/proposals/mapProposalData'
import { ProposalPageShell } from '@/components/proposals/ProposalPageShell'
import { ProposalBody } from '@/components/proposals/ProposalBody'
import { InternalPreviewBar } from '@/components/proposals/InternalPreviewBar'

export const metadata: Metadata = {
  title: 'Proposal — Sano Portal',
  robots: 'noindex, nofollow',
}

export default async function ProposalDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const input = await getProposalById(params.id)
  if (!input) notFound()

  const proposal = buildProposalViewModel(input)

  // Look up the source quote number for the internal preview bar so staff
  // always know which quote a proposal came from.
  const supabase = createClient()
  const { data: quoteMeta } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('id', proposal.quoteId)
    .maybeSingle<{ quote_number: string | null }>()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const shareUrl = proposal.shareToken
    ? `${siteUrl}/share/proposal/${proposal.shareToken}`
    : null

  const sublabelParts = [
    `Proposal v${input.proposal.proposal_version}`,
    quoteMeta?.quote_number ? `from ${quoteMeta.quote_number}` : null,
    proposal.client.companyName,
  ].filter(Boolean)

  return (
    <div className="-m-4 md:-m-8">
      <InternalPreviewBar
        status={proposal.status}
        sublabel={sublabelParts.join(' · ')}
        shareUrl={shareUrl}
        backHref={`/portal/quotes/${proposal.quoteId}`}
        backLabel="Back to quote"
      />
      <ProposalPageShell>
        <ProposalBody proposal={proposal} />
      </ProposalPageShell>
    </div>
  )
}
