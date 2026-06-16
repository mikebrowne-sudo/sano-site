// Concise work-type for a contractor remittance note.
//
// A contractor payable's note becomes the per-line detail on the
// remittance advice. We deliberately keep it to a short work type (e.g.
// "Regular clean", "End of tenancy clean") rather than the full job
// description / cleaning scope, which made the advice cluttered. The work
// type comes from the linked quote's clean type (type_of_clean is the
// human label, e.g. "End of Tenancy Clean"; service_type is the fallback).
//
// If neither is available the note is left blank — better an empty note
// than a wall of scope text on a payment advice.

function sentenceCase(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ')
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

/**
 * Derive a short, payment-advice-friendly work type from a quote's clean
 * type. Returns sentence-cased text ("End of tenancy clean") or null when
 * no usable work type exists.
 */
export function conciseWorkType(fields: {
  type_of_clean?: string | null
  service_type?: string | null
}): string | null {
  const primary = (fields.type_of_clean ?? '').trim() || (fields.service_type ?? '').trim()
  if (!primary) return null
  return sentenceCase(primary) || null
}
