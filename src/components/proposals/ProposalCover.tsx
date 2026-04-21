import type { ProposalClient, ProposalMeta } from '@/lib/proposals/types'
import { formatProposalDate } from '@/lib/proposals/format'

type ProposalCoverProps = {
  client: ProposalClient
  proposalMeta: ProposalMeta
}

export function ProposalCover({ client, proposalMeta }: ProposalCoverProps) {
  return (
    <section className="border-b border-sage-100 pb-10 lg:pb-14">
      <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500 mb-5">
        Sano Property Services
      </div>

      <h1 className="font-display font-bold text-sage-800 text-[2rem] sm:text-4xl lg:text-[2.75rem] leading-[1.1] tracking-tight">
        Commercial Cleaning Proposal
      </h1>

      <p className="mt-4 text-sage-600 text-[0.95rem] italic">
        Clean spaces. Healthy living.
      </p>

      <dl className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
        <div>
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-500 mb-1.5">
            Prepared for
          </dt>
          <dd className="text-sage-800 font-medium">{client.companyName}</dd>
          {client.contactName && (
            <dd className="text-sage-600 text-sm mt-0.5">Attn: {client.contactName}</dd>
          )}
        </div>

        <div>
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-500 mb-1.5">
            Site
          </dt>
          {client.siteName && (
            <dd className="text-sage-800 font-medium">{client.siteName}</dd>
          )}
          <dd className="text-sage-600 text-sm mt-0.5">{client.siteAddress}</dd>
        </div>

        <div>
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-500 mb-1.5">
            Proposal date
          </dt>
          <dd className="text-sage-800">{formatProposalDate(proposalMeta.proposalDate)}</dd>
        </div>

        <div>
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-500 mb-1.5">
            Prepared by
          </dt>
          <dd className="text-sage-800">Sano Property Services Limited</dd>
          <dd className="text-sage-600 text-sm mt-0.5">hello@sano.nz &middot; 0800 726 686</dd>
        </div>
      </dl>
    </section>
  )
}
