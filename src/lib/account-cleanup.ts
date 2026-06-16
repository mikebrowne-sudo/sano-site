// Stage 5 — pure analysis helpers for the account cleanup review list.
//
// Read-only assistance for Carol: detect messy account/contact records,
// propose a tidier account name, and suggest a manual action. Nothing
// here mutates data — the page links out to the existing client
// edit / merge / archive screens for any actual change.
//
// Reuses the Stage 1 person-name guard so "company-named contact" and
// "name may be in the wrong field" stay consistent with the greeting
// logic.

import { isPersonName } from './email-greeting'

export interface CleanupContact {
  full_name: string | null
  email: string | null
  contact_type: string | null
}

export interface AccountAnalysisInput {
  name: string | null
  companyName: string | null
  email: string | null
  contacts: CleanupContact[]
  isPossibleDuplicate?: boolean
}

export type RiskLevel = 'high' | 'medium' | 'low'

export interface AccountAnalysis {
  proposedName: string | null
  flags: {
    branchSplit: boolean
    noContacts: boolean
    noRealContact: boolean
    companyNamedContact: boolean
    personMaybeWrongField: boolean
    possibleTest: boolean
    possibleDuplicate: boolean
  }
  companyNamedContacts: string[]
  hasAnyFlag: boolean
  riskLevel: RiskLevel
  suggestedAction: string
}

const JUNK = /\b(test|testing|junk|wife|husband|asdf|demo|sample|xxx)\b/i

/**
 * A tidier account name when the record is a company-led account split
 * across name + company_name (e.g. "Barfoot & Thompson" + "Greenlane"
 * → "Barfoot & Thompson - Greenlane"). Returns null — i.e. no automatic
 * proposal — when:
 *  - there's no company_name to combine,
 *  - the name already contains the company_name,
 *  - the name already reads "Company - Branch", or
 *  - the name looks like a PERSON (person-led record → review, don't rename).
 */
export function proposedAccountName(name?: string | null, companyName?: string | null): string | null {
  const n = (name ?? '').trim()
  const co = (companyName ?? '').trim()
  if (!n || !co) return null
  if (n.toLowerCase().includes(co.toLowerCase())) return null
  if (/\s[-–—]\s/.test(n)) return null
  if (isPersonName(n)) return null // person-led — flag for review, never auto-propose
  return `${n} - ${co}`
}

/**
 * Structured remap for a company-led branch record. Splits name +
 * company_name into parent brand + branch and a clean display name:
 *   name="Barfoot & Thompson", company_name="Greenlane"  →
 *   { company: "Barfoot & Thompson", branch: "Greenlane",
 *     display: "Barfoot & Thompson - Greenlane" }
 * Returns null when there's no safe structured proposal (no company,
 * already combined, or a person-led record). Preserves company + branch
 * separately rather than flattening.
 */
export function structuredBranchFields(
  name?: string | null,
  companyName?: string | null,
): { company: string; branch: string; display: string } | null {
  const display = proposedAccountName(name, companyName)
  if (!display) return null
  return { company: (name ?? '').trim(), branch: (companyName ?? '').trim(), display }
}

/** A contact whose name reads like a company/branch, not a person. */
export function isCompanyNamedContact(fullName?: string | null, accountName?: string | null): boolean {
  const n = (fullName ?? '').trim()
  if (!n) return false
  return !isPersonName(n, accountName)
}

/** Heuristic flag for obvious test / junk records (flag only — never delete). */
export function looksLikeTestRecord(name?: string | null, companyName?: string | null, email?: string | null): boolean {
  const n = (name ?? '').trim().toLowerCase()
  const co = (companyName ?? '').trim().toLowerCase()
  if (n === 'test' || n === 'demo' || co === 'test' || co === 'demo') return true
  if (JUNK.test(name ?? '') || JUNK.test(companyName ?? '')) return true
  if (/(@example\.|^test@|@test\.)/i.test((email ?? '').trim())) return true
  return false
}

/**
 * Accounts that are LIKELY true duplicates: they share an email, or share
 * the same name AND the same branch (company_name). Same-name-only with a
 * different branch is treated as a separate branch of one parent brand
 * (e.g. Barfoot & Thompson / Ellerslie vs / Ponsonby) — NOT a duplicate.
 */
export function duplicateClientIds(
  clients: Array<{ id: string; name: string | null; email: string | null; company_name?: string | null }>,
): Set<string> {
  const byEmail = new Map<string, string[]>()
  const byNameBranch = new Map<string, string[]>()
  for (const c of clients) {
    const e = (c.email ?? '').trim().toLowerCase()
    const n = (c.name ?? '').trim().toLowerCase()
    const co = (c.company_name ?? '').trim().toLowerCase()
    if (e) byEmail.set(e, [...(byEmail.get(e) ?? []), c.id])
    if (n) {
      const key = `${n}||${co}` // name + branch — different branches don't collide
      byNameBranch.set(key, [...(byNameBranch.get(key) ?? []), c.id])
    }
  }
  const dups = new Set<string>()
  for (const group of [...Array.from(byEmail.values()), ...Array.from(byNameBranch.values())]) {
    if (group.length > 1) group.forEach((id) => dups.add(id))
  }
  return dups
}

export function analyzeAccount(input: AccountAnalysisInput): AccountAnalysis {
  const name = (input.name ?? '').trim()
  const co = (input.companyName ?? '').trim()
  const contacts = input.contacts ?? []

  const proposedName = proposedAccountName(name, co)
  const companyNamedContacts = contacts
    .map((c) => (c.full_name ?? '').trim())
    .filter((n) => n && isCompanyNamedContact(n, name))

  const noContacts = contacts.length === 0
  const hasRealPerson = contacts.some((c) => isPersonName(c.full_name, name))
  const noRealContact = !noContacts && !hasRealPerson
  const companyNamedContact = companyNamedContacts.length > 0
  // Person in the name but a company/branch in company_name → likely swapped.
  const personMaybeWrongField = !!name && !!co && isPersonName(name) && !isPersonName(co)
  const possibleTest = looksLikeTestRecord(name, co, input.email)
  const possibleDuplicate = !!input.isPossibleDuplicate
  const branchSplit = proposedName != null

  const flags = {
    branchSplit, noContacts, noRealContact, companyNamedContact,
    personMaybeWrongField, possibleTest, possibleDuplicate,
  }
  const hasAnyFlag = Object.values(flags).some(Boolean)

  const riskLevel: RiskLevel =
    (noContacts || noRealContact) ? 'high'
    : (branchSplit || personMaybeWrongField || possibleTest || possibleDuplicate) ? 'medium'
    : 'low'

  // Single most useful next step (most consequential first).
  let suggestedAction = 'No action needed'
  if (possibleDuplicate) suggestedAction = 'Review possible duplicate (merge via the client screen)'
  else if (possibleTest) suggestedAction = 'Review — looks like a test/junk record (archive if so)'
  else if (noContacts) suggestedAction = 'Add a real contact person'
  else if (noRealContact) suggestedAction = 'Add a real contact person (current contacts look company-named)'
  else if (branchSplit) suggestedAction = `Rename account to “${proposedName}”`
  else if (personMaybeWrongField) suggestedAction = 'Review — person and company may be in the wrong fields'

  return { proposedName, flags, companyNamedContacts, hasAnyFlag, riskLevel, suggestedAction }
}
