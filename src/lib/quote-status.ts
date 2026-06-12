// Phase 6 — Single source of truth for quote + invoice statuses.
//
// Every place that renders a status badge or branches on quote/invoice
// status should import from here so labels, colours, and rules stay
// in sync. Server actions branch off the canonical sets too — drift
// between UI and DB is the most common bug class in lifecycle code.

// Phase 4D — operational threshold lives in attention-rules; import
// so getQuoteListStatus stays in sync with the attention-chip logic.
import { SENT_FOLLOWUP_DAYS } from './attention-rules'

// ── Quote ──────────────────────────────────────────────────────────

export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'converted',
  // Phase 4D — derived display-only states. Never stored in
  // quotes.status; surfaced by getQuoteListStatus() for the list view
  // so the status pill carries the operator's next-step semantics.
  'follow_up',
  'expired',
] as const

export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft:     'Draft',
  sent:      'Sent',
  viewed:    'Viewed',
  accepted:  'Accepted',
  declined:  'Declined',
  converted: 'Converted',
  follow_up: 'Follow up',
  expired:   'Expired',
}

export const QUOTE_STATUS_DESCRIPTIONS: Record<QuoteStatus, string> = {
  draft:     'Editing in place. Not sent to anyone.',
  sent:      'Emailed to the client. Awaiting response.',
  viewed:    'Client opened the share link.',
  accepted:  'Client accepted. Ready to convert to invoice.',
  declined:  'Client declined.',
  converted: 'Converted to an invoice. Quote is locked.',
  follow_up: 'Sent N days ago with no reply. Time to follow up.',
  expired:   'Valid-until date has passed without acceptance.',
}

// Phase 4A — palette conformance to design system §1.11. Sage replaces
// sky (out-of-palette) for `viewed`. `converted` keeps a softer sage
// (50/600) so the terminal-success state reads quieter than the
// in-motion / locked states above it.
// Phase 4D — follow_up + expired use the amber attention family.
export const QUOTE_STATUS_STYLES: Record<QuoteStatus, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  viewed:    'bg-sage-100 text-sage-700',
  accepted:  'bg-emerald-50 text-emerald-700',
  declined:  'bg-red-50 text-red-700',
  converted: 'bg-sage-50 text-sage-600',
  follow_up: 'bg-amber-50 text-amber-700',
  expired:   'bg-amber-50 text-amber-700',
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

// Phase 4D — list-facing display status. Mirrors getJobStatus()'s
// shape: takes the raw DB status + a few side-inputs, returns a
// QuoteStatus suitable for <StatusBadge kind="quote">. Stored
// quotes.status never changes; this is purely the list-view label.
//
// Order of precedence:
//   declined / converted → unchanged (terminal)
//   accepted             → unchanged (operator's next move is "convert")
//   sent | viewed + past valid_until → 'expired'
//   sent + > SENT_FOLLOWUP_DAYS since issue/create → 'follow_up'
//   else → the raw status

export interface QuoteListStatusInput {
  status: string | null | undefined
  date_issued?: string | null | undefined
  valid_until?: string | null | undefined
  created_at?: string | null | undefined
}

export function getQuoteListStatus(
  q: QuoteListStatusInput,
  nowIso: string = new Date().toISOString(),
): QuoteStatus {
  const raw = (q.status ?? 'draft') as string
  if (raw === 'declined' || raw === 'converted' || raw === 'accepted') {
    return raw as QuoteStatus
  }

  const today = nowIso.slice(0, 10)

  if ((raw === 'sent' || raw === 'viewed') && q.valid_until && q.valid_until < today) {
    return 'expired'
  }

  if (raw === 'sent') {
    const sinceSentIso = q.date_issued ?? q.created_at
    if (sinceSentIso) {
      const since = Date.parse(sinceSentIso)
      const now = Date.parse(nowIso)
      if (!Number.isNaN(since) && !Number.isNaN(now)) {
        const days = Math.floor((now - since) / (24 * 60 * 60 * 1000))
        if (days >= SENT_FOLLOWUP_DAYS) return 'follow_up'
      }
    }
    return 'sent'
  }

  if (raw === 'draft' || raw === 'viewed') return raw as QuoteStatus
  return 'draft'
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

// Phase 4A — cancelled drops to a muted gray-50/500 per spec §1.11.
// Red is reserved for destructive actions and hard fails; a cancelled
// invoice is an archived state, not an error.
export const INVOICE_STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-amber-50 text-amber-700',
  cancelled: 'bg-gray-50 text-gray-500',
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
  // Phase list-view-uxp-2 PR-B: friendly derived statuses returned
  // by getJobStatus() for list-view rendering. Stored DB values
  // remain unchanged ('draft' / 'assigned' / 'in_progress' /
  // 'completed' / 'invoiced'); these extras exist purely for
  // display via StatusBadge in derived-status surfaces.
  'needs_scheduling',
  'scheduled',
  // Phase 4D — two more display-only derivations:
  //   ready_to_invoice = completed && !invoice_id (operator's next step)
  //   follow_up        = scheduled past date, not yet started
  'ready_to_invoice',
  'follow_up',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft:            'Draft',
  assigned:         'Assigned',
  in_progress:      'In progress',
  completed:        'Completed',
  invoiced:         'Invoiced',
  needs_scheduling: 'Needs scheduling',
  scheduled:        'Scheduled',
  ready_to_invoice: 'Ready to invoice',
  follow_up:        'Follow up',
}

// Phase 4A — conformance to spec §1.11. in_progress becomes amber
// (active-with-attention), completed becomes emerald (done-well),
// invoiced moves to the stronger sage-100 (terminal-locked).
// needs_scheduling and scheduled are derived statuses for the list
// view and stay at amber-attention / blue-in-motion respectively.
// Phase 4D — ready_to_invoice surfaces an emerald-attention nudge
// (it's a positive next-step), follow_up uses amber (warning).
export const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  draft:            'bg-gray-100 text-gray-700',
  assigned:         'bg-blue-50 text-blue-700',
  in_progress:      'bg-amber-50 text-amber-700',
  completed:        'bg-emerald-50 text-emerald-700',
  invoiced:         'bg-sage-100 text-sage-700',
  needs_scheduling: 'bg-amber-50 text-amber-800',
  scheduled:        'bg-blue-50 text-blue-700',
  ready_to_invoice: 'bg-emerald-50 text-emerald-700',
  follow_up:        'bg-amber-50 text-amber-700',
}

// ── Contractor pay status ──────────────────────────────────────────
// job_workers.pay_status — the gate that moves a worker's labour into
// a pay run. Canonical home so the job detail page, payroll surfaces,
// and the contractor pay statement all render one consistent pill via
// <StatusBadge kind="pay" />. Mirrors the family palette: pending =
// neutral, approved = blue (in motion), in pay run = amber (active),
// paid = emerald (done).
export const PAY_STATUSES = [
  'pending',
  'approved',
  'included_in_pay_run',
  'paid',
] as const

export type PayStatus = (typeof PAY_STATUSES)[number]

export const PAY_STATUS_LABELS: Record<PayStatus, string> = {
  pending:             'Pending',
  approved:            'Approved',
  included_in_pay_run: 'In pay run',
  paid:                'Paid',
}

export const PAY_STATUS_STYLES: Record<PayStatus, string> = {
  pending:             'bg-gray-100 text-gray-600',
  approved:            'bg-blue-50 text-blue-700',
  included_in_pay_run: 'bg-amber-50 text-amber-700',
  paid:                'bg-emerald-50 text-emerald-700',
}
