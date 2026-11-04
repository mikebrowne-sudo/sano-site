// Uniform contractor remittance reference + contractor grouping.
//
// Reference format: FIRSTTOKEN + DDMMYY(payment date), uppercase, alphanumeric
// only — e.g. "Alex Smith" + 2026-10-30 → ALEX301026. This is what goes in
// the Reference field on Sano's side of the transfer (Particulars CONTRACTOR,
// Code RA-xxxx). Contractor payments are never "payroll". The name token is cut
// to 6 characters so the whole reference fits the bank's 12-character field;
// the payee name is kept because auto-reconcile matches debits by it.
// The first token of the PAYEE name is used (contractor first name, or the
// company's first word for a combined couple).
//
// Grouping: contractors who share a GST number are one company (a husband-and-
// wife team running through one GST-registered limited company) → one combined
// remittance. Everyone else is their own remittance.

import { normalizeGstNumber } from './shared-gst-number'

/** Build the reference (max 12 chars) from a payee name + a YYYY-MM-DD payment date. */
export function buildRemittanceReference(payeeName: string | null | undefined, paymentDate: string): string {
  const token = (payeeName ?? '').trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '')
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(paymentDate)
  const ddmmyy = m ? `${m[3]}${m[2]}${m[1].slice(2)}` : ''
  return `${token.slice(0, 6)}${ddmmyy}`
}

export interface RemittanceContractor {
  id: string
  full_name: string | null
  company_name: string | null
  gst_number: string | null
}

export interface RemittanceGroup {
  key: string
  contractorIds: string[]
  /** Displayed "Paid to" name — company for a combined couple, else the person. */
  payeeName: string
  /** Name the reference is derived from (same source as payee). */
  referenceName: string
  combined: boolean
}

/**
 * Group selected contractors into remittance units. Same non-empty GST number →
 * one combined company remittance; unique / no GST number → individual.
 */
export function groupContractorsForRemittance(contractors: RemittanceContractor[]): RemittanceGroup[] {
  const byKey = new Map<string, RemittanceContractor[]>()
  for (const c of contractors) {
    const gst = normalizeGstNumber(c.gst_number)
    const key = gst ? `gst:${gst}` : `solo:${c.id}`
    const arr = byKey.get(key)
    if (arr) arr.push(c)
    else byKey.set(key, [c])
  }

  const groups: RemittanceGroup[] = []
  for (const [key, members] of Array.from(byKey.entries())) {
    const combined = members.length > 1
    const company = members.map((m) => m.company_name?.trim()).find((n) => !!n) || null
    const payeeName = combined
      ? (company || members.map((m) => m.full_name?.trim() || '—').join(' & '))
      : (members[0].full_name?.trim() || members[0].company_name?.trim() || '—')
    groups.push({
      key,
      contractorIds: members.map((m) => m.id),
      payeeName,
      referenceName: payeeName,
      combined,
    })
  }
  // Stable order by payee name.
  return groups.sort((a, b) => a.payeeName.localeCompare(b.payeeName))
}
