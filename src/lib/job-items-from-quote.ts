// Copy a quote's add-on lines onto the job created from it, as job_items.
//
// WHY, when the add-ons already reach the invoice as invoice_items:
//
// Scenario A — a carpet clean that WAS quoted up front. It is billed correctly
// today, but there has never been a way to pay a contractor a set amount for it,
// because the job only knows its total price. Copying the quote's add-ons onto
// the job gives each one somewhere to hang a contractor and a cost.
//
// These rows are written with source = 'quote', which means: this charge is
// ALREADY inside jobs.job_price (computeQuoteTotal folds the add-ons in), so it
// must NOT be added to the invoice again. sumJobItemCharges and
// createInvoiceFromJob both filter on it. They contribute COST only.
//
// Best-effort by design: a failure here must never fail the conversion. The job
// and its invoice are the operator's actual goal; a missing pay-side row is a
// nuisance they can fix by re-adding the extra by hand, whereas a failed
// conversion loses real work. Errors are returned for logging, not thrown.

export interface QuoteAddonRow {
  label?: string | null
  description?: string | null
  price?: number | null
  sort_order?: number | null
}

/** Minimal shape of the Supabase client this needs — keeps the module testable. */
interface InsertableClient {
  from(table: string): {
    insert(rows: Record<string, unknown>[]): Promise<{ error: { message: string } | null }>
  }
}

/**
 * Build the job_items rows for a quote's add-ons. Pure, so the mapping (and the
 * blank-label filter) can be unit-tested without a database.
 */
export function buildQuoteSourcedItems(
  jobId: string,
  addons: QuoteAddonRow[] | null | undefined,
  createdBy: string | null,
): Record<string, unknown>[] {
  if (!Array.isArray(addons)) return []
  return addons
    // A blank label would violate job_items_label_chk and is meaningless to an
    // operator anyway.
    .filter((a) => (a?.label ?? '').trim().length > 0)
    .map((a, i) => ({
      job_id: jobId,
      label: (a.label ?? '').trim(),
      description: (a.description ?? '')?.trim() || null,
      price: Number(a.price ?? 0),
      // Nobody is assigned yet — the operator picks who did the carpet clean on
      // the job page, and it is often not one of the assigned cleaners.
      contractor_id: null,
      cost_amount: null,
      cost_basis: 'fixed',
      cost_hours: null,
      source: 'quote',
      sort_order: a.sort_order ?? i,
      created_by: createdBy,
    }))
}

/**
 * Insert a quote's add-ons onto the new job. Returns an error string for the
 * caller to log; never throws, and never blocks the conversion.
 */
export async function copyQuoteItemsToJob(
  supabase: InsertableClient,
  jobId: string,
  addons: QuoteAddonRow[] | null | undefined,
  createdBy: string | null,
): Promise<{ inserted: number; error?: string }> {
  const rows = buildQuoteSourcedItems(jobId, addons, createdBy)
  if (rows.length === 0) return { inserted: 0 }
  try {
    const { error } = await supabase.from('job_items').insert(rows)
    if (error) return { inserted: 0, error: error.message }
    return { inserted: rows.length }
  } catch (e) {
    return { inserted: 0, error: e instanceof Error ? e.message : String(e) }
  }
}
