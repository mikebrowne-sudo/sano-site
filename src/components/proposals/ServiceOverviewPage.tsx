// Proposal Phase 1 — Service Overview inner page.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'

export function ServiceOverviewPage({
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
      headerTitle="Service overview"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        <p className="proposal-eyebrow">How we&apos;ll service your site</p>
        <h2 className="proposal-h2">Service plan at a glance</h2>

        <div className="proposal-meta-grid">
          <MetaCell label="Frequency"   value={payload.serviceFrequency || '—'} />
          <MetaCell label="Days"        value={payload.serviceDays || '—'} />
          <MetaCell label="Times"       value={payload.serviceTimes || '—'} />
          <MetaCell label="Start date"  value={payload.serviceStartDate || '—'} />
        </div>

        <h3 className="proposal-h3" style={{ marginTop: '8mm' }}>Areas covered</h3>
        <ul className="proposal-checklist">
          {payload.areasCovered.map((area, i) => (
            <li key={i}>{area}</li>
          ))}
        </ul>
      </div>
    </ProposalLayout>
  )
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="proposal-meta-cell">
      <div className="proposal-meta-cell__label">{label}</div>
      <div className="proposal-meta-cell__value">{value}</div>
    </div>
  )
}
