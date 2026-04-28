// Phase 6 — Single source of truth for quote + invoice statuses.
//
// Every place that renders a status badge or branches on quote/invoice
// status should import from here so labels, colours, and rules stay
// in sync. Server actions branch off the canonical sets too — drift
// between UI and DB is the most common bug class in lifecycle code.

// ── Quote ──────────────────────────────────────────────────────────

export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'converted',
] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft:     'Draft',
  sent:      'Sent',
  viewed:    'Viewed',
  accepted:  'Accepted',
  declined:  'Declined',
  converted: 'Converted',
}

export const QUOTE_STATUS_DESCRIPTIONS: Record<QuoteStatus, string> = {
  draft:     'Editing in place. Not sent to anyone.',
  sent:      'Emailed to the client. Awaiting response.',
  viewed:    'Client opened the share link.',
  accepted:  'Client accepted. Ready to convert to invoice.',
  declined:  'Client declined.',
  converted: 'Converted to an invoice. Quote is locked.',
}

// Phase 5.5.14 — palette standardisation. Five tones across the
// system: neutral (gray) for not-yet-acted, blue for in-motion,
// emerald for accepted/done-well, sage for terminal-success
// (converted/invoiced), red for declined/cancelled, amber for
// problem-states (overdue / in_progress).
export const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  viewed:    'bg-sky-50 text-sky-700',
  accepted:  'bg-emerald-50 text-emerald-700',
  declined:  'bg-red-50 text-red-700',
  converted: 'bg-sage-50 text-sage-700',
}

/** Statuses where the quote is fully locked — no edits, no convert,
 *  no version-bump. Restoring a prior version is still allowed
 *  (creates a new draft). */
export function isQuoteLocked(status: string | null | undefined): boolean {
  return status === 'accepted' || status === 'declined' || status === 'converted'
}

/** True when the user can edit the quote in place (no new version). */
export function isQuoteEditableInPlace(status: string | null | undefined): boolean {
  return status === 'draft'
}

/** True when an edit must spawn a new version (sent/viewed). */
export function quoteEditRequiresNewVersion(status: string | null | undefined): boolean {
  return status === 'sent' || status === 'viewed'
}

/** Convertible to invoice — must be accepted AND latest version. */
export function isQuoteConvertible(
  status: string | null | undefined,
  isLatestVersion: boolean,
): boolean {
  return status === 'accepted' && isLatestVersion
}

// ── Invoice ────────────────────────────────────────────────────────

export const INVOICE_STATUSES = [
  'draft',
  'sent',
  'paid',
  'overdue',
  'cancelled',
] as const

export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft:     'Draft',
  sent:      'Sent',
  paid:      'Paid',
  overdue:   'Overdue',
  cancelled: 'Cancelled',
}

export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
}

/** Compute display status — promotes 'sent' to 'overdue' when due_date
 *  has passed. Mirrors the existing logic in the invoice list/detail. */
export function computeInvoiceDisplayStatus(
  dbStatus: string | null | undefined,
  dueDate: string | null | undefined,
): InvoiceStatus {
  const status = (dbStatus ?? 'draft') as InvoiceStatus
  if (status !== 'sent' || !dueDate) return status
  const today = new Date().toISOString().slice(0, 10)
  return dueDate < today ? 'overdue' : status
}

// ── Job ────────────────────────────────────────────────────────────

export const JOB_STATUSES = [
  'draft',
  'assigned',
  'in_progress',
  'completed',
  'invoiced',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft:       'Draft',
  assigned:    'Assigned',
  in_progress: 'In progress',
  completed:   'Completed',
  invoiced:    'Invoiced',
}

export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed:   'bg-gray-100 text-gray-700',
  invoiced:    'bg-sage-50 text-sage-700',
}
