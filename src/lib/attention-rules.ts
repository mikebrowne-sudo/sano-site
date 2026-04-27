// Phase 5.5.14 — attention rules.
//
// Pure logic for "what needs an operator's attention right now" across
// quotes / jobs / invoices. Each helper returns:
//   { needsAttention, reasons[], nextStep? }
// - reasons[] are short human-readable tags rendered as chips on the row
// - nextStep is a single forward action to nudge the operator
//
// Rules are intentionally conservative: we only flag rows where the
// operator has something concrete to do next. A "Sent" quote that
// hasn't been viewed yet does NOT need attention until a follow-up
// window passes — see SENT_FOLLOWUP_DAYS.

export const SENT_FOLLOWUP_DAYS = 3

export interface AttentionResult {
  needsAttention: boolean
  reasons: string[]
  nextStep?: string
}

function daysBetween(fromIso: string | null | undefined, nowIso: string): number | null {
  if (!fromIso) return null
  const from = Date.parse(fromIso)
  const now  = Date.parse(nowIso)
  if (Number.isNaN(from) || Number.isNaN(now)) return null
  return Math.floor((now - from) / (24 * 60 * 60 * 1000))
}

// ── Quotes ─────────────────────────────────────────────────────────

export interface QuoteAttentionInput {
  status: string | null | undefined
  created_at: string | null | undefined
  date_issued?: string | null | undefined
  // For accepted quotes: has the conversion to a job/invoice happened yet?
  // The page must populate this from a join; if unknown, leave undefined.
  hasJob?: boolean
  hasInvoice?: boolean
}

export function getQuoteAttention(
  q: QuoteAttentionInput,
  nowIso: string = new Date().toISOString(),
): AttentionResult {
  const reasons: string[] = []
  let nextStep: string | undefined

  const status = q.status ?? 'draft'

  if (status === 'draft') {
    reasons.push('Unsent draft')
    nextStep = 'Next: Send to client'
  } else if (status === 'sent') {
    const sinceSent = daysBetween(q.date_issued ?? q.created_at, nowIso)
    if (sinceSent != null && sinceSent >= SENT_FOLLOWUP_DAYS) {
      reasons.push('Follow up required')
      nextStep = 'Next: Follow up'
    }
  } else if (status === 'accepted') {
    if (!q.hasJob && !q.hasInvoice) {
      reasons.push('Ready for job')
      nextStep = 'Next: Create job'
    }
  }

  return { needsAttention: reasons.length > 0, reasons, nextStep }
}

// ── Jobs ───────────────────────────────────────────────────────────

export interface JobAttentionInput {
  status: string | null | undefined
  scheduled_date: string | null | undefined
  contractor_id: string | null | undefined
  assigned_to?: string | null | undefined
}

export function getJobAttention(
  j: JobAttentionInput,
  nowIso: string = new Date().toISOString(),
): AttentionResult {
  const reasons: string[] = []
  let nextStep: string | undefined

  const status = j.status ?? 'draft'

  // Completed jobs nudge the operator toward invoicing.
  if (status === 'completed') {
    nextStep = 'Next: Create invoice'
    reasons.push('Ready to invoice')
    return { needsAttention: true, reasons, nextStep }
  }

  // Active jobs only — invoiced is "done" and shouldn't yell.
  if (status === 'invoiced') {
    return { needsAttention: false, reasons: [] }
  }

  if (!j.scheduled_date) {
    reasons.push('Needs scheduling')
    nextStep = nextStep ?? 'Next: Schedule'
  }

  const hasContractor = !!j.contractor_id || !!(j.assigned_to && j.assigned_to.trim())
  if (!hasContractor) {
    reasons.push('Unassigned')
    nextStep = nextStep ?? 'Next: Assign contractor'
  }

  // At risk — scheduled within next 24h with no contractor.
  if (j.scheduled_date && !hasContractor) {
    const now = Date.parse(nowIso)
    const sched = Date.parse(j.scheduled_date)
    if (!Number.isNaN(now) && !Number.isNaN(sched)) {
      const hours = (sched - now) / (60 * 60 * 1000)
      if (hours >= 0 && hours <= 24) {
        reasons.push('At risk')
        nextStep = 'Next: Assign contractor'
      }
    }
  }

  return { needsAttention: reasons.length > 0, reasons, nextStep }
}

// ── Invoices ───────────────────────────────────────────────────────

export interface InvoiceAttentionInput {
  status: string | null | undefined   // raw DB status
  due_date: string | null | undefined
  created_at?: string | null | undefined
  date_issued?: string | null | undefined
}

export function getInvoiceAttention(
  inv: InvoiceAttentionInput,
  nowIso: string = new Date().toISOString(),
): AttentionResult {
  const reasons: string[] = []
  let nextStep: string | undefined

  const status = inv.status ?? 'draft'

  if (status === 'paid' || status === 'cancelled') {
    return { needsAttention: false, reasons: [] }
  }

  if (status === 'draft') {
    reasons.push('Not sent')
    nextStep = 'Next: Send invoice'
    return { needsAttention: true, reasons, nextStep }
  }

  if (status === 'sent') {
    const today = nowIso.slice(0, 10)
    if (inv.due_date && inv.due_date < today) {
      reasons.push('Overdue')
      nextStep = 'Next: Follow up'
    } else {
      reasons.push('Outstanding')
    }
    return { needsAttention: true, reasons, nextStep }
  }

  return { needsAttention: false, reasons: [] }
}
