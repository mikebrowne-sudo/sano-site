// Service Overview — 2-column labelled cell grid. Each cell pairs a
// small green-tinted icon tile with a green uppercase label + black
// body value. Icon set is shared with Scope of Works (see ScopeIcon
// switch in ScopeOfWorksPage.tsx) — same line weight, same tile
// dimensions, same green tint.
//
// Glyphs are deliberately simple line drawings at 1.4px stroke to
// match the example-layout reference.

import { ProposalLayout } from './ProposalLayout'
import type { ProposalTemplatePayload } from '@/lib/proposals/buildProposalPayload'
import {
  buildServiceOverviewText,
  formatServiceDays,
  formatServiceWindowRange,
  countDaysPerWeek,
  visitsPerWeekLabel,
} from '@/lib/proposals/content-builders'

export function ServiceOverviewPage({
  payload,
  pageNumber,
  totalPages,
}: {
  payload: ProposalTemplatePayload
  pageNumber: number
  totalPages: number
}) {
  const summaryParagraphs = buildServiceOverviewText(payload)

  // Phase 4 — cleaned meta grid. Each cell is now fed by a formatter
  // so the client-facing value is always prose, never raw machine
  // strings like "tue, thu, sat, 1600-2200". Fall back to "Agreed …"
  // when upstream data is missing.
  const scheduleValue  = formatServiceDays(payload.serviceDays || '') || 'Agreed schedule'
  const windowValue    = formatServiceWindowRange(payload.serviceTimes || '') || 'Agreed service window'
  const daysPerWeek    = countDaysPerWeek(payload.serviceDays || '')
  const frequencyValue = visitsPerWeekLabel(daysPerWeek) || 'Agreed frequency'

  return (
    <ProposalLayout
      headerTitle="Service overview"
      pageNumber={pageNumber}
      totalPages={totalPages}
      contact={payload.contact}
    >
      <div className="proposal-content">
        {summaryParagraphs.map((para, i) => (
          <p key={i} className="proposal-service-summary">{para}</p>
        ))}

        <div className="proposal-meta-grid">
          <MetaCell icon="location"  label="Site address"       value={payload.siteAddress || '—'} />
          <MetaCell icon="check-cal" label="Service schedule"   value={scheduleValue} />
          <MetaCell icon="clock"     label="Service window"     value={windowValue} />
          <MetaCell icon="calendar"  label="Service frequency"  value={frequencyValue} />
          <MetaCell icon="building"  label="Areas covered"      value={payload.areasCovered.join(', ') || '—'} />
          <MetaCell icon="cal-start" label="Service start date" value={payload.serviceStartDate || '—'} />
        </div>
      </div>
    </ProposalLayout>
  )
}

function MetaCell({
  icon, label, value,
}: {
  icon: ProposalIconName
  label: string
  value: string
}) {
  return (
    <div className="proposal-meta-cell">
      <span className="proposal-icon-tile" aria-hidden>
        <ProposalIcon name={icon} />
      </span>
      <div className="proposal-meta-cell__body">
        <div className="proposal-meta-cell__label">{label}</div>
        <div className="proposal-meta-cell__value">{value}</div>
      </div>
    </div>
  )
}

// ── Shared icon system ────────────────────────────────────────────
// Exported so ScopeOfWorksPage uses identical glyphs. Stroke 1.4 px,
// 24px viewBox, no fills, rounded line caps. Matches example-layout.

export type ProposalIconName =
  | 'location' | 'calendar' | 'clock' | 'check' | 'check-cal' | 'cal-start'
  | 'building' | 'doorway' | 'clipboard' | 'spray' | 'utensils'

export function ProposalIcon({ name }: { name: ProposalIconName }) {
  switch (name) {
    case 'location':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z" strokeLinejoin="round" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      )
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M3.5 10h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
        </svg>
      )
    case 'check-cal':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M3.5 10h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
          <path d="m9 15.5 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'cal-start':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="3.5" y="5" width="17" height="16" rx="2" />
          <path d="M3.5 10h17M8 3.5v3M16 3.5v3" strokeLinecap="round" />
          <circle cx="12" cy="15.5" r="1.6" />
        </svg>
      )
    case 'clock':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'check':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.5 12.5l4.5 4.5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'building':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 21V6.5L12 4l7 2.5V21" strokeLinejoin="round" />
          <path d="M3.5 21h17" strokeLinecap="round" />
          <path d="M9 10h2M13 10h2M9 14h2M13 14h2M9 18h2M13 18h2" strokeLinecap="round" />
        </svg>
      )
    case 'doorway':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 21V4.5h12V21" strokeLinejoin="round" />
          <path d="M3.5 21h17" strokeLinecap="round" />
          <circle cx="14.5" cy="13" r="0.9" />
        </svg>
      )
    case 'clipboard':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="6" y="5" width="12" height="16" rx="1.5" />
          <rect x="9" y="3" width="6" height="3.5" rx="0.5" />
          <path d="M9 11h6M9 14.5h6M9 18h4" strokeLinecap="round" />
        </svg>
      )
    case 'spray':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="8" height="11" rx="1" />
          <path d="M10 10V6h4v4" strokeLinejoin="round" />
          <path d="M15.5 4.5h2M17 6.5h2M15.5 8.5h2" strokeLinecap="round" />
        </svg>
      )
    case 'utensils':
      return (
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 3v18M6 3v6c0 1.1.9 2 2 2s2-.9 2-2V3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 21v-9c-2 0-3-1.5-3-3.5S14 4 16 4v17z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}
