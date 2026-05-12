// Phase 4D — small status dot rendered at the start of each list row.
//
// Matches the reference image: a 6px filled circle whose colour
// reflects the same status family as the row's <StatusBadge>. It's
// a quick scan aid, not a replacement for the pill — both render.
//
// Server component, pure presentational, deterministic from props.

import clsx from 'clsx'
import {
  QUOTE_STATUS_STYLES,
  INVOICE_STATUS_STYLES,
  JOB_STATUS_STYLES,
  type QuoteStatus,
  type InvoiceStatus,
  type JobStatus,
} from '@/lib/quote-status'

// Lift the dot fill from the same `bg-*-50` pair the status pill
// uses, but bump to the *-500 shade so the dot reads at 6px. Centralised
// here so the dot tone matches the pill family one-for-one without
// duplicating the lookup logic. Map covers every status known to the
// three style tables; anything missing falls through to gray.
const DOT_BG_BY_KEY: Record<string, string> = {
  // Sage family — sage-300 reads a touch greener than sage-500 at 6px.
  'bg-sage-50':     'bg-sage-300',
  'bg-sage-100':    'bg-sage-500',
  // Status families.
  'bg-blue-50':     'bg-blue-400',
  'bg-amber-50':    'bg-amber-400',
  'bg-emerald-50':  'bg-emerald-400',
  'bg-red-50':      'bg-red-400',
  // Neutral.
  'bg-gray-50':     'bg-gray-300',
  'bg-gray-100':    'bg-gray-400',
}

function pillBgClass(kind: 'quote' | 'invoice' | 'job', status: string): string {
  if (kind === 'quote') {
    const s = status in QUOTE_STATUS_STYLES ? (status as QuoteStatus) : 'draft'
    return QUOTE_STATUS_STYLES[s].split(' ')[0]  // first class is the bg-*
  }
  if (kind === 'job') {
    const s = status in JOB_STATUS_STYLES ? (status as JobStatus) : 'draft'
    return JOB_STATUS_STYLES[s].split(' ')[0]
  }
  const s = status in INVOICE_STATUS_STYLES ? (status as InvoiceStatus) : 'draft'
  return INVOICE_STATUS_STYLES[s].split(' ')[0]
}

export function StatusDot({
  kind,
  status,
  className,
}: {
  kind: 'quote' | 'invoice' | 'job'
  status: string
  className?: string
}) {
  const pillBg = pillBgClass(kind, status)
  const dotBg = DOT_BG_BY_KEY[pillBg] ?? 'bg-gray-300'
  return (
    <span
      aria-hidden="true"
      className={clsx('inline-block h-1.5 w-1.5 rounded-full', dotBg, className)}
    />
  )
}
