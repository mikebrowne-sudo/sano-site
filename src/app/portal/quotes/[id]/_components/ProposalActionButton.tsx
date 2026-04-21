'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import { createProposalFromQuote } from '../_actions-proposal'
import { ProposalStatusBadge } from '@/components/proposals/ProposalStatusBadge'
import type { ProposalStatus } from '@/lib/proposals/types'

type ProposalActionButtonProps = {
  quoteId: string
  existingProposal: {
    id: string
    status: ProposalStatus
  } | null
}

export function ProposalActionButton({
  quoteId,
  existingProposal,
}: ProposalActionButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (existingProposal) {
    return (
      <div className="flex items-center gap-2">
        <ProposalStatusBadge status={existingProposal.status} />
        <Link
          href={`/portal/proposals/${existingProposal.id}`}
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
        >
          <ExternalLink size={16} />
          View Proposal
        </Link>
      </div>
    )
  }

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await createProposalFromQuote(quoteId)
      // Success path uses redirect() and never returns, so anything we
      // receive here is an error result.
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors disabled:opacity-50"
      >
        <FileText size={16} />
        {isPending ? 'Creating…' : 'Create Proposal'}
      </button>
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  )
}
