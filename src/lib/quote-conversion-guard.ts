// Phase 5.5.16 — guard against double-conversion of a quote.
//
// Three actions can convert an accepted quote into a downstream
// record (job, invoice, or both). Before 5.5.16, none of them
// checked whether the quote had ALREADY been converted — clicking
// twice produced two children. This helper centralises the check
// so every conversion action behaves identically:
//
//   1. Quote must exist + not be archived.
//   2. Quote.status must NOT be 'converted'.
//   3. No live (non-archived) child of the requested kind may exist.
//
// Returning a single discriminated union keeps the call-sites tidy:
//   const guard = await assertQuoteConvertible(supabase, quoteId, 'job')
//   if ('error' in guard) return { error: guard.error }
//   // guard.quote is fresh, guaranteed convertible

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

export type ConversionKind = 'job' | 'invoice' | 'both'

export interface ConvertibleQuoteSnapshot {
  id: string
  status: string | null
  accepted_at: string | null
  deleted_at: string | null
}

/** When the guard rejects because a downstream record already exists,
 *  it surfaces the existing record's id + number so the caller can
 *  render an "Open job" / "Open invoice" link instead of a dead-end
 *  text error. The error message stays human-readable. */
export interface ExistingRecordRef {
  kind: 'job' | 'invoice'
  id: string
  number: string | null
}

export type GuardError = {
  error: string
  /** Populated when the rejection reason is "a child already exists".
   *  UI uses this to render an Open-existing CTA. */
  existing?: ExistingRecordRef
}

export async function assertQuoteConvertible(
  supabase: SB,
  quoteId: string,
  kind: ConversionKind,
): Promise<{ ok: true; quote: ConvertibleQuoteSnapshot } | GuardError> {
  // 1. Quote must exist and not be archived.
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select('id, status, accepted_at, deleted_at')
    .eq('id', quoteId)
    .maybeSingle()

  if (qErr) return { error: `Quote lookup failed: ${qErr.message}` }
  if (!quote) return { error: 'Quote not found.' }
  if (quote.deleted_at) return { error: 'Cannot convert an archived quote.' }

  // 2. If the quote is already marked converted, look up the
  //    downstream record so the caller can link straight to it.
  //    We try job first, then invoice — the same precedence the
  //    quote-detail UI uses.
  if (quote.status === 'converted') {
    const existing = await findExistingChild(supabase, quoteId)
    return {
      error:
        'This quote has already been converted. Open the linked record from the quote — creating another would duplicate it.',
      ...(existing ? { existing } : {}),
    }
  }

  // 3. Reject if the requested child already exists. Surface its
  //    id + number so the UI can render an Open-existing CTA.
  if (kind === 'job' || kind === 'both') {
    const { data: existingJobs, error: jErr } = await supabase
      .from('jobs')
      .select('id, job_number')
      .eq('quote_id', quoteId)
      .is('deleted_at', null)
      .limit(1)
    if (jErr) return { error: `Job lookup failed: ${jErr.message}` }
    if (existingJobs && existingJobs.length > 0) {
      const j = existingJobs[0] as { id: string; job_number: string | null }
      return {
        error: 'A job already exists for this quote. Open it from the quote rather than creating another.',
        existing: { kind: 'job', id: j.id, number: j.job_number ?? null },
      }
    }
  }

  if (kind === 'invoice' || kind === 'both') {
    const { data: existingInvoices, error: iErr } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('quote_id', quoteId)
      .is('deleted_at', null)
      .limit(1)
    if (iErr) return { error: `Invoice lookup failed: ${iErr.message}` }
    if (existingInvoices && existingInvoices.length > 0) {
      const inv = existingInvoices[0] as { id: string; invoice_number: string | null }
      return {
        error: 'An invoice already exists for this quote. Open it from the quote rather than creating another.',
        existing: { kind: 'invoice', id: inv.id, number: inv.invoice_number ?? null },
      }
    }
  }

  return { ok: true, quote: quote as ConvertibleQuoteSnapshot }
}

/** Lookup helper used by the already-converted branch. Returns the
 *  first downstream record (job preferred, invoice fallback). */
async function findExistingChild(
  supabase: SB,
  quoteId: string,
): Promise<ExistingRecordRef | null> {
  const { data: job } = await supabase
    .from('jobs')
    .select('id, job_number')
    .eq('quote_id', quoteId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (job) {
    return { kind: 'job', id: (job as { id: string }).id, number: (job as { job_number: string | null }).job_number ?? null }
  }
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('quote_id', quoteId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (invoice) {
    return { kind: 'invoice', id: (invoice as { id: string }).id, number: (invoice as { invoice_number: string | null }).invoice_number ?? null }
  }
  return null
}
