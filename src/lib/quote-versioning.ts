// Phase 6 — pure helpers for quote versioning. No DB access.
// Server actions live in src/app/portal/quotes/_actions-versioning.ts.

import {
  isQuoteEditableInPlace,
  quoteEditRequiresNewVersion,
  isQuoteLocked,
} from './quote-status'

export interface QuoteVersionShape {
  id: string
  quote_number: string
  status: string | null
  version_number: number
  parent_quote_id: string | null
  is_latest_version: boolean
  created_at: string
}

/** v1 renders as the bare quote number; v2+ renders with a "-vN" suffix. */
export function displayQuoteNumber(q: {
  quote_number: string
  version_number: number | null | undefined
}): string {
  const v = q.version_number ?? 1
  return v > 1 ? `${q.quote_number}-v${v}` : q.quote_number
}

/** True when "Save changes" should mutate this row in place. */
export function canEditInPlace(q: {
  status: string | null
  is_latest_version: boolean
}): boolean {
  return q.is_latest_version && isQuoteEditableInPlace(q.status)
}

/** True when "Save changes" must spawn a new draft version. */
export function saveCreatesNewVersion(q: {
  status: string | null
  is_latest_version: boolean
}): boolean {
  return q.is_latest_version && quoteEditRequiresNewVersion(q.status)
}

/** True when no edit path is allowed. The only way to mutate the chain
 *  from here is to "Restore from this version" (which clones into a
 *  fresh draft). */
export function isFullyLocked(q: {
  status: string | null
  is_latest_version: boolean
}): boolean {
  if (!q.is_latest_version) return true
  return isQuoteLocked(q.status)
}

/** SQL chain key — for v1 it's the row's own id; for v2+ it's parent_quote_id.
 *  Mirrors the COALESCE in the partial unique index from the migration. */
export function chainRootId(q: { id: string; parent_quote_id: string | null }): string {
  return q.parent_quote_id ?? q.id
}
