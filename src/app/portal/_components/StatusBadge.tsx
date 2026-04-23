// Phase 6 — universal status pill for quotes + invoices.
// Reads styling from src/lib/quote-status.ts so labels/colours stay in sync.

import clsx from 'clsx'
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
  JOB_STATUS_LABELS,
  JOB_STATUS_STYLES,
  type QuoteStatus,
  type InvoiceStatus,
  type JobStatus,
} from '@/lib/quote-status'

type Size = 'sm' | 'md'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
}

export function StatusBadge({
  kind,
  status,
  size = 'sm',
  className,
}: {
  kind: 'quote' | 'invoice' | 'job'
  status: string
  size?: Size
  className?: string
}) {
  const base = 'inline-block rounded-full font-medium whitespace-nowrap'

  if (kind === 'quote') {
    const s = (status as QuoteStatus) in QUOTE_STATUS_LABELS
      ? (status as QuoteStatus)
      : 'draft'
    return (
      <span className={clsx(base, SIZE_CLASSES[size], QUOTE_STATUS_STYLES[s], className)}>
        {QUOTE_STATUS_LABELS[s]}
      </span>
    )
  }

  if (kind === 'job') {
    const s = (status as JobStatus) in JOB_STATUS_LABELS
      ? (status as JobStatus)
      : 'draft'
    return (
      <span className={clsx(base, SIZE_CLASSES[size], JOB_STATUS_STYLES[s], className)}>
        {JOB_STATUS_LABELS[s]}
      </span>
    )
  }

  const s = (status as InvoiceStatus) in INVOICE_STATUS_LABELS
    ? (status as InvoiceStatus)
    : 'draft'
  return (
    <span className={clsx(base, SIZE_CLASSES[size], INVOICE_STATUS_STYLES[s], className)}>
      {INVOICE_STATUS_LABELS[s]}
    </span>
  )
}
