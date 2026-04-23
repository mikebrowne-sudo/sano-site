// Service Overview — 2-column labelled cell grid. Each cell pairs a
// small green icon tile with a green uppercase label + black body
// value. Matches the approved mockup exactly; all icon tiles use
// the same fixed dimensions.

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
        <div className="proposal-meta-grid">
          <MetaCell icon="location" label="Site address"       value={payload.siteAddress || '—'} />
          <MetaCell icon="calendar" label="Service frequency"  value={payload.serviceFrequency || '—'} />
          <MetaCell icon="check"    label="Service days"       value={payload.serviceDays || '—'} />
          <MetaCell icon="building" label="Areas covered"      value={payload.areasCovered.join(', ') || '—'} />
          <MetaCell icon="clock"    label="Service times"      value={payload.serviceTimes || '—'} />
          <MetaCell icon="calendar" label="Service start date" value={payload.serviceStartDate || '—'} />
        </div>
      </div>
    </ProposalLayout>
  )
}

function MetaCell({
  icon, label, value,
}: {
  icon: 'location' | 'calendar' | 'clock' | 'check' | 'building'
  label: string
  value: string
}) {
  return (
    <div className="proposal-meta-cell">
      <span className="proposal-icon-tile" aria-hidden>
        <MetaIcon name={icon} />
      </span>
      <div className="proposal-meta-cell__body">
        <div className="proposal-meta-cell__label">{label}</div>
        <div className="proposal-meta-cell__value">{value}</div>
      </div>
    </div>
  )
}

function MetaIcon({ name }: { name: 'location' | 'calendar' | 'clock' | 'check' | 'building' }) {
  switch (name) {
    case 'location':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21s-7-7.58-7-12a7 7 0 0 1 14 0c0 4.42-7 12-7 12z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M3.5 10h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'building':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 20V6l8-2 8 2v14" />
          <path d="M4 20h16" strokeLinecap="round" />
          <path d="M9 11h2M9 15h2M13 11h2M13 15h2M9 7h2M13 7h2" strokeLinecap="round" />
        </svg>
      )
  }
}
