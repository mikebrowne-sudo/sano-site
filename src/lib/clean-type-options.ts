// Clean-type labels for the invoice details editor.
//
// `invoices.type_of_clean` stores the HUMAN LABEL ("End of Tenancy Clean"),
// not the slug — it is copied straight off the quote at conversion and shown
// verbatim on the invoice as "Clean type".
//
// It's free text, so live data has already drifted: 17 invoices say
// "End of Tenancy Clean" and one says "End of Tenancy". The editor therefore
// offers the canonical labels as a dropdown AND a "Custom…" escape hatch, so
// an operator can correct a value to the standard wording without losing the
// ability to enter something unusual.

import { SERVICE_TYPES_BY_CATEGORY, type ServiceCategory } from './quote-wording'

/** Sentinel for the "type it yourself" dropdown option. */
export const CUSTOM_CLEAN_TYPE = '__custom__'

/** Category order for the grouped dropdown. */
const CATEGORY_ORDER: ServiceCategory[] = [
  'residential', 'property_management', 'airbnb', 'commercial',
]

/**
 * Every canonical clean-type LABEL, deduped, in category order.
 *
 * Labels repeat across categories (Custom Quote is under both residential and
 * commercial), and the invoice stores only the label — so the dropdown is a
 * flat deduped label list rather than slug-keyed options.
 */
export function cleanTypeLabels(): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const cat of CATEGORY_ORDER) {
    for (const opt of SERVICE_TYPES_BY_CATEGORY[cat] ?? []) {
      if (seen.has(opt.label)) continue
      seen.add(opt.label)
      out.push(opt.label)
    }
  }
  return out
}

/** Is this value one of the canonical labels? */
export function isCanonicalCleanType(value: string | null | undefined): boolean {
  const v = (value ?? '').trim()
  if (!v) return false
  return cleanTypeLabels().includes(v)
}

/**
 * Split a stored value into the dropdown selection + custom text.
 *
 * A non-canonical value (legacy "End of Tenancy", or anything hand-typed)
 * selects "Custom…" and pre-fills the text box, so opening the editor never
 * silently rewrites or discards what's already on the invoice.
 */
export function splitCleanType(stored: string | null | undefined): {
  select: string
  custom: string
} {
  const v = (stored ?? '').trim()
  if (!v) return { select: '', custom: '' }
  if (isCanonicalCleanType(v)) return { select: v, custom: '' }
  return { select: CUSTOM_CLEAN_TYPE, custom: v }
}

/** Resolve the dropdown + custom box back to the value to store. */
export function resolveCleanType(select: string, custom: string): string | null {
  if (select === CUSTOM_CLEAN_TYPE) return custom.trim() || null
  return select.trim() || null
}
