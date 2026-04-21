import type { Metadata } from 'next'
import { mockProposal } from '@/lib/proposals/mockProposal'
import { ProposalPageShell } from '@/components/proposals/ProposalPageShell'
import { ProposalBody } from '@/components/proposals/ProposalBody'
import { InternalPreviewBar } from '@/components/proposals/InternalPreviewBar'

export const metadata: Metadata = {
  title: 'Proposal preview — Sano Portal',
  robots: 'noindex, nofollow',
}

export default function MockProposalPage() {
  const proposal = mockProposal

  return (
    <div className="-m-4 md:-m-8">
      <InternalPreviewBar
        status={proposal.status}
        sublabel="Mock data · not wired to live pricing"
      />
      <ProposalPageShell>
        <ProposalBody proposal={proposal} />
      </ProposalPageShell>
    </div>
  )
}
