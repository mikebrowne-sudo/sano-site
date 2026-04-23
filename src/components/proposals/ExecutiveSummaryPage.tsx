// Proposal Phase 1 — Executive Summary inner page.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function ExecutiveSummaryPage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  return (
    <ProposalLayout
      headerTitle="Executive summary"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content proposal-content--prose">
        <p className="proposal-eyebrow">Prepared for {payload.clientName}</p>
        <h2 className="proposal-h2">A reliable team for your site</h2>
        <p className="proposal-lead">
          {payload.executiveSummary}
        </p>

        <div className="proposal-callout-grid">
          <Callout label="Service rhythm" value={payload.serviceFrequency || '—'} />
          <Callout label="Site address" value={payload.siteAddress || '—'} />
          <Callout label="Start date" value={payload.serviceStartDate || '—'} />
          <Callout label="Reference" value={payload.referenceNumber} />
        </div>
      </div>
    </ProposalLayout>
  )
}

function Callout({ label, value }: { label: string; value: string }) {
  return (
    <div className="proposal-callout">
      <div className="proposal-callout__label">{label}</div>
      <div className="proposal-callout__value">{value}</div>
    </div>
  )
}
