// Phase quote-flow-clarity: single source of truth for invoice
// service-date and due-date logic.
//
// Five surfaces previously inlined parts of this calculation: the
// quote→invoice action, the job→invoice action, the invoice send
// action, the share/PDF render, and the Stripe checkout amount.
// Behaviour was inconsistent (job-created invoices skipped the
// due-date formula entirely; the on-account branch hardcoded 14
// days; cash-sale relied on `scheduled_clean_date`). This helper
// normalises both calculations so every surface produces the same
// answer.
//
// Pure functions — no Supabase / React / formatting deps.

export type InvoicePaymentType = 'cash_sale' | 'on_account' | string | null | undefined

/** Normalised payment-terms key. Mirrors `clients.payment_terms`
 *  enum + the legacy quotes/invoices.payment_type axis. Accepts any
 *  string at the type level so callers can forward DB values without
 *  a cast — unknown keys fall through to the payment_type fallback. */
export type InvoicePaymentTerms =
  | 'due_immediately'
  | 'due_on_completion'
  | '7_days'
  | '14_days'
  | '20_of_month'
  | 'custom'
  | string
  | null
  | undefined

export interface DueDateInput {
  payment_type: InvoicePaymentType
  payment_terms: InvoicePaymentTerms
  date_issued?: string | null   // ISO 'YYYY-MM-DD' — when the invoice goes out
  service_date?: string | null  // ISO 'YYYY-MM-DD' — completed_at ?? scheduled_date
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function nextTwentiethISO(fromIso: string): string {
  // Returns the next 20th of a month on/after `fromIso`. If `fromIso`
  // is already past the 20th, returns the 20th of the FOLLOWING month.
  // Conservative — keeps the operator from accidentally setting a due
  // date that's already overdue.
  const d = new Date(fromIso + 'T00:00:00Z')
  const day = d.getUTCDate()
  const month = d.getUTCMonth()
  const year = d.getUTCFullYear()
  if (day <= 20) {
    return new Date(Date.UTC(year, month, 20)).toISOString().slice(0, 10)
  }
  return new Date(Date.UTC(year, month + 1, 20)).toISOString().slice(0, 10)
}

/** Compute the invoice's due_date. Returns null when there isn't
 *  enough information to produce a meaningful due date — callers
 *  should leave the column null in that case rather than guess. */
export function computeInvoiceDueDate(input: DueDateInput): string | null {
  const issued = input.date_issued ?? null
  const service = input.service_date ?? null
  const pt = input.payment_terms

  // Explicit terms keys win over the broader payment_type axis.
  if (pt === '7_days')      return issued ? addDaysISO(issued, 7)  : null
  if (pt === '14_days')     return issued ? addDaysISO(issued, 14) : null
  if (pt === '20_of_month') return nextTwentiethISO(issued ?? new Date().toISOString().slice(0, 10))
  if (pt === 'due_immediately') return issued ?? service ?? null
  if (pt === 'due_on_completion') return service ?? issued ?? null
  // 'custom' or null falls through to the payment_type axis.

  // Fallback — payment_type axis (quote/invoice columns).
  // - cash_sale: due the day before the service so payment lands
  //   pre-clean. Falls back to issued when no service date exists.
  // - on_account: due 14 days after the issued date — the prior
  //   default is preserved here when no `payment_terms` is set.
  if (input.payment_type === 'cash_sale') {
    if (service) {
      const d = new Date(service + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - 1)
      return d.toISOString().slice(0, 10)
    }
    return issued ?? null
  }
  if (input.payment_type === 'on_account') {
    return issued ? addDaysISO(issued, 14) : null
  }

  return null
}

export interface ServiceDateInput {
  /** Job-side dates win when a job exists. */
  job_completed_at?: string | null
  job_scheduled_date?: string | null
  /** Quote-side fallback when invoicing a quote directly. */
  quote_scheduled_clean_date?: string | null
}

/** Resolve the canonical service date for an invoice — the day the
 *  work was (or will be) done. Job-side dates always win when
 *  available, ensuring a re-scheduled job's invoice reflects the
 *  current schedule rather than the original quoted date. */
export function resolveServiceDate(input: ServiceDateInput): string | null {
  // completed_at is a timestamp; trim to date.
  if (input.job_completed_at) return input.job_completed_at.slice(0, 10)
  if (input.job_scheduled_date) return input.job_scheduled_date.slice(0, 10)
  if (input.quote_scheduled_clean_date) return input.quote_scheduled_clean_date.slice(0, 10)
  return null
}
