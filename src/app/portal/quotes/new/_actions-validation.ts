export interface CreateQuoteOverridePayload {
  is_price_overridden: boolean
  override_price: number | null
  override_reason: string | null
  override_confirmed: boolean
}

/**
 * Returns an error string, or null if valid.
 * Server-side mirror of client-side validateOverride. Defence in depth —
 * accountability data shouldn't be trustable from the client alone.
 */
export function validateCreateQuoteOverride(p: CreateQuoteOverridePayload): string | null {
  if (!p.is_price_overridden) return null

  if (p.override_price == null || !Number.isFinite(p.override_price) || p.override_price <= 0) {
    return 'Override price must be greater than 0.'
  }
  if (p.override_price > 99999999.99) {
    return 'Override price must not exceed $99,999,999.99.'
  }
  if (!p.override_reason || !p.override_reason.trim()) {
    return 'Override reason is required.'
  }
  if (!p.override_confirmed) {
    return 'Override confirmation is required.'
  }
  return null
}
