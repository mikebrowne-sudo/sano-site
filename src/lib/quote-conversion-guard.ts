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

export async function assertQuoteConvertible(
  supabase: SB,
  quoteId: string,
  kind: ConversionKind,
): Promise<{ ok: true; quote: ConvertibleQuoteSnapshot } | { error: string }> {
  // 1. Quote must exist and not be archived.
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select('id, status, accepted_at, deleted_at')
    .eq('id', quoteId)
    .maybeSingle()

  if (qErr) return { error: `Quote lookup failed: ${qErr.message}` }
  if (!quote) return { error: 'Quote not found.' }
  if (quote.deleted_at) return { error: 'Cannot convert an archived quote.' }

  // 2. Reject if the quote is already converted.
  if (quote.status === 'converted') {
    return {
      error:
        'This quote has already been converted. Open the linked job or invoice from the quote — creating another would duplicate the record.',
    }
  }

  // 3. Reject if the requested child already exists.
  if (kind === 'job' || kind === 'both') {
    const { data: existingJobs, error: jErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('quote_id', quoteId)
      .is('deleted_at', null)
      .limit(1)
    if (jErr) return { error: `Job lookup failed: ${jErr.message}` }
    if (existingJobs && existingJobs.length > 0) {
      return { error: 'A job already exists for this quote. Open it from the quote rather than creating another.' }
    }
  }

  if (kind === 'invoice' || kind === 'both') {
    const { data: existingInvoices, error: iErr } = await supabase
      .from('invoices')
      .select('id')
      .eq('quote_id', quoteId)
      .is('deleted_at', null)
      .limit(1)
    if (iErr) return { error: `Invoice lookup failed: ${iErr.message}` }
    if (existingInvoices && existingInvoices.length > 0) {
      return { error: 'An invoice already exists for this quote. Open it from the quote rather than creating another.' }
    }
  }

  return { ok: true, quote: quote as ConvertibleQuoteSnapshot }
}
