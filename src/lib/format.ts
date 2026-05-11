// Phase 2 cleanups (2026-05-12) — shared format helpers.
//
// Replaces the small per-page `formatCurrency` / `formatDate` /
// `fmtCurrency` / `fmtDate` / `fmtDateTime` definitions that had
// drifted between pages. Initial migration covers the obvious
// duplicates (quotes list page + job detail page); inline
// `new Intl.NumberFormat` / `toLocaleDateString` call sites elsewhere
// can migrate opportunistically in later passes.
//
// Locale + currency are NZ-fixed by design — matches the previous
// per-page behaviour. If a non-NZ locale is ever needed, pass an
// explicit options arg rather than introducing a global override.

const NZD_FORMATTER = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
})

const NZ_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

const NZ_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
}

/**
 * Format a NZD amount. Returns the placeholder `—` when the value is
 * null/undefined, matching the existing per-page helpers.
 */
export function formatCurrency(dollars: number | null | undefined): string {
  if (dollars == null) return '—'
  return NZD_FORMATTER.format(dollars)
}

/**
 * Format an ISO date string as `1 Jan 2026`. Returns `—` for null/
 * empty input, matching the existing per-page helpers.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', NZ_DATE_OPTIONS)
}

/**
 * Format an ISO timestamp as `1 Jan 2026, 9:30 am`. Used for
 * timestamps where the time-of-day matters (e.g. job started_at).
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', NZ_DATETIME_OPTIONS)
}
