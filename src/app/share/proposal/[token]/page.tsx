import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getProposalByToken,
  recordProposalViewed,
} from '@/lib/proposals/queries'
import { buildProposalViewModel } from '@/lib/proposals/mapProposalData'
import { ProposalPageShell } from '@/components/proposals/ProposalPageShell'
import { ProposalBody } from '@/components/proposals/ProposalBody'

export const metadata: Metadata = { robots: 'noindex, nofollow' }

// Proposal share pages are personalised per token and track first-view,
// so they must never be statically cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PublicProposalPage({
  params,
}: {
  params: { token: string }
}) {
  const input = await getProposalByToken(params.token)
  if (!input) notFound()

  // Fire-and-forget first-view tracking. recordProposalViewed is conditional
  // (only updates when viewed_at IS NULL), so repeated calls are no-ops.
  // We don't await visible errors here — failing to record a view should not
  // break the client's ability to read the proposal.
  if (input.proposal.viewed_at == null) {
    try {
      await recordProposalViewed(input.proposal.id)
    } catch (err) {
      console.error('[share/proposal] failed to record view:', err)
    }
  }

  const proposal = buildProposalViewModel(input)

  return (
    <ProposalPageShell>
      <ProposalBody proposal={proposal} />
    </ProposalPageShell>
  )
}
