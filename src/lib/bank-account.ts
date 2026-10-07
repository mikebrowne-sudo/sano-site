// NZ bank account normalisation + shared-payee conflict detection.
//
// PURPOSE: stop FORMATTING differences being mistaken for different accounts.
// This does NOT validate that an account exists, and never invents or alters
// digits — an unparseable value is flagged for review, not corrected.
//
// The problem this solves: VMK LTD's account was stored two ways —
//   Kritika  06-0878-0765722-00
//   Anishal  06-0878-0765-722-00
// Identical account, different punctuation. Comparing the raw strings makes a
// shared payee look like it has two accounts.
//
// NZ format is bank(2) · branch(4) · account(7) · suffix(2 or 3) = 15 or 16
// digits. Both suffix lengths are legitimate; a 2-digit suffix is conventionally
// displayed zero-padded to 3, but we do NOT rewrite the stored value.

/** Digits only — the canonical comparison form. Empty when nothing usable. */
export function normalizeBankAccount(raw: string | null | undefined): string {
  return (raw ?? '').replace(/[^0-9]/g, '')
}

/**
 * True when two account strings refer to the same account.
 * Blank values are never "equal" — an unknown account must not silently pass a
 * conflict check.
 */
export function sameBankAccount(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeBankAccount(a)
  const nb = normalizeBankAccount(b)
  if (!na || !nb) return false
  return na === nb
}

/**
 * Can this be read as a well-formed NZ account number?
 * 15 digits = 2-digit suffix, 16 = 3-digit suffix. Anything else is flagged for
 * a human rather than "fixed".
 */
export function isPlausibleBankAccount(raw: string | null | undefined): boolean {
  const n = normalizeBankAccount(raw)
  return n.length === 15 || n.length === 16
}

/**
 * Display form: BB-BBBB-AAAAAAA-SS(S). Returns the ORIGINAL string unchanged
 * when it can't be parsed — never guess at a malformed number.
 */
export function formatBankAccount(raw: string | null | undefined): string {
  const original = (raw ?? '').trim()
  const n = normalizeBankAccount(raw)
  if (n.length !== 15 && n.length !== 16) return original
  return `${n.slice(0, 2)}-${n.slice(2, 6)}-${n.slice(6, 13)}-${n.slice(13)}`
}

export interface PayeeBankSource {
  contractorId: string
  contractorName: string | null
  accountName: string | null
  accountNumber: string | null
}

export type BankResolutionStatus =
  /** One usable account agreed across everyone in the group. */
  | 'ok'
  /** Group members hold genuinely different accounts — must not guess. */
  | 'conflict'
  /** Nobody in the group has an account on file. */
  | 'missing'
  /** An account is present but not a readable NZ number. */
  | 'unreadable'

export interface PayeeBankResolution {
  status: BankResolutionStatus
  /** Canonical digits when status is 'ok'. */
  normalized: string | null
  /** Display form when status is 'ok'. */
  formatted: string | null
  /** Account NAME to pay — may legitimately differ from the worker's own name. */
  accountName: string | null
  /** Every distinct normalised account found, for a conflict message. */
  variants: Array<{ normalized: string; formatted: string; holders: string[] }>
  /** True when the account name differs from every contributing worker name.
   *  NOT an error — a company account (e.g. "Export and Import Trades Ltd" for
   *  Upasni Devi) is legitimate — but worth showing so staff can verify. */
  accountNameDiffersFromWorker: boolean
  message: string | null
}

/**
 * Resolve the ONE account a grouped payee should be paid on.
 *
 * Deliberately does NOT fall back to "the first worker's account" when members
 * disagree: silently picking one is how money reaches the wrong place. A
 * genuine disagreement returns 'conflict' for a human to resolve.
 */
export function resolvePayeeBankAccount(sources: PayeeBankSource[]): PayeeBankResolution {
  const withAccounts = sources.filter((s) => normalizeBankAccount(s.accountNumber).length > 0)

  if (withAccounts.length === 0) {
    return {
      status: 'missing', normalized: null, formatted: null, accountName: null,
      variants: [], accountNameDiffersFromWorker: false,
      message: 'No bank account on file for this payee.',
    }
  }

  const byNormalized = new Map<string, { formatted: string; holders: string[] }>()
  for (const s of withAccounts) {
    const n = normalizeBankAccount(s.accountNumber)
    const cur = byNormalized.get(n) ?? { formatted: formatBankAccount(s.accountNumber), holders: [] }
    cur.holders.push(s.contractorName ?? 'Unknown')
    byNormalized.set(n, cur)
  }

  const variants = Array.from(byNormalized.entries()).map(([normalized, v]) => ({
    normalized, formatted: v.formatted, holders: v.holders,
  }))

  if (variants.length > 1) {
    const detail = variants.map((v) => `${v.holders.join(' & ')}: ${v.formatted}`).join(' · ')
    return {
      status: 'conflict', normalized: null, formatted: null, accountName: null,
      variants, accountNameDiffersFromWorker: false,
      message: `Bank details need review — grouped for one payment but different accounts are on file. ${detail}`,
    }
  }

  const only = variants[0]
  // Account name: prefer a non-empty one from a worker actually holding this
  // account, so the name shown belongs to the number being paid.
  const accountName = withAccounts.map((s) => s.accountName?.trim()).find((n) => !!n) ?? null

  if (!isPlausibleBankAccount(only.normalized)) {
    return {
      status: 'unreadable', normalized: only.normalized, formatted: only.formatted, accountName,
      variants, accountNameDiffersFromWorker: false,
      message: `Bank account "${only.formatted}" is not a recognisable NZ account number (${only.normalized.length} digits). Check it before paying.`,
    }
  }

  const workerNames = sources.map((s) => (s.contractorName ?? '').trim().toLowerCase()).filter(Boolean)
  const nameDiffers = !!accountName && !workerNames.includes(accountName.trim().toLowerCase())

  return {
    status: 'ok',
    normalized: only.normalized,
    formatted: only.formatted,
    accountName,
    variants,
    accountNameDiffersFromWorker: nameDiffers,
    message: null,
  }
}
