// Automatic bank → invoice reconciliation.
//
// Pure: given bank credits, invoices and the payer history learned from past
// allocations, propose the allocations that are safe to make WITHOUT a human.
// Anything ambiguous is left for the reconcile screen. The caller applies the
// proposals through the same validated path as a manual reconcile, so an auto
// match is an ordinary allocation (reversible from the screen).
//
// A credit is auto-allocated only when the money is fully explained:
//   1. Reference  — the payee/memo names invoice number(s) ("INV-0277",
//      "Inv0271", "inv o284", "0331 0329", or a QUO number, which shares the
//      invoice's number) and those invoices' open balances sum EXACTLY to it.
//   2. Known payer — the payer is learned from past allocations (or names the
//      client / branch) and, among that payer's open invoices:
//        a. exactly one has an open balance equal to the payment, or
//        b. several do, all for the same client → the oldest is paid first, or
//        c. exactly one combination (2–6 invoices) sums to the payment.
// Never auto: amount-only matches with no payer link, partial payments,
// overpayments, financing / tax-refund credits, and anything with two
// plausible answers.
//
// Guard against stale paid invoices soaking up new money: an invoice already
// marked PAID but never allocated only matches when it's explicitly referenced
// or was marked paid within PAID_DATE_WINDOW days of the payment (i.e. it was
// marked paid for this payment). Unpaid invoices must be issued no later than
// ISSUE_GRACE_DAYS after the payment.
//
// Credits already CLEARED (by the old cleared-only flow) but never allocated
// are backfilled the same way, restricted to paid invoices — that records the
// durable link and stops those invoices looking "open" to future payments.

import { cleanPayee, matchClientsForPayee } from './payee-match'

export const PAID_DATE_WINDOW = 10
export const ISSUE_GRACE_DAYS = 14
const MAX_BUNDLE_CANDIDATES = 15
const MAX_BUNDLE_SIZE = 6

// Not customer income — never auto-allocated to an invoice.
const NON_INCOME_RE = /director\s*loan|start\s*up|owner|capital|drawings|mb transfer|c\s*j\s*browne|i\.?\s?r\.?\s?d\.?\b|inland\s+revenue/i

export interface ArCredit {
  id: string
  date: string
  amount: number
  payee: string
  memo: string
  cleared: boolean
  /** Live allocations already against this line. */
  allocated: number
}

export interface ArInvoice {
  id: string
  number: string
  status: string
  /** GST-inclusive total the client owes. */
  total: number
  allocated: number
  dateIssued: string | null
  datePaid: string | null
  clientId: string | null
  /** Display label used for name matching: "Barfoot & Thompson Henderson", "Good Oil Films". */
  clientLabel: string
}

/** One past allocation: who paid (normalised payer key) → which client. */
export interface ArHistory {
  payerKey: string
  clientId: string
}

export interface ArAllocation {
  invoiceId: string
  amount: number
}

export interface ArProposal {
  creditId: string
  allocations: ArAllocation[]
  method: 'invoice_ref' | 'amount_match'
  /** Stored in invoice_payment_allocations.match_reason; starts with "auto:". */
  reason: string
  /** Backfill of an already-cleared line (no invoice changes status). */
  backfill: boolean
}

export interface ArResult {
  proposals: ArProposal[]
  /** Credits left for a human, with why. */
  review: Array<{ creditId: string; why: string }>
}

const cents = (n: number) => Math.round(n * 100)

function days(a: string, b: string): number {
  return (Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.slice(0, 10)}T00:00:00Z`)) / 86_400_000
}

/** Normalised payer key used to learn + look up payers ("B&T HENDERSON"). */
export function payerKey(payee: string): string {
  return cleanPayee(payee).replace(/^from\s+/, '').replace(/\s+/g, ' ').trim().toUpperCase()
}

/** Invoice numbers referenced in bank text, normalised to INV-####. */
export function referencedNumbers(text: string): string[] {
  const out = new Set<string>()
  // INV / QUO prefixed, tolerating "CleanInv0271" (no word break), "inv o284"
  // (letter o for zero), "QUO-0437-v2". No leading \b on purpose: a ref only
  // counts if it resolves to a real invoice AND the amount matches exactly.
  const pre = /(?:inv|quo)[-\s.#]*[o0]*(\d{1,6})\b/gi
  let m: RegExpExecArray | null
  while ((m = pre.exec(text)) !== null) out.add(`INV-${m[1].padStart(4, '0')}`)
  // Bare 4–6 digit numbers ("0331 0329", "Sue Bunce 26022"), skipping years.
  const rest = text.replace(pre, ' ')
  const bare = /\b(\d{4,6})\b/g
  while ((m = bare.exec(rest)) !== null) {
    const n = Number(m[1])
    if (m[1].length === 4 && n >= 1900 && n <= 2099) continue
    out.add(`INV-${m[1].padStart(4, '0')}`)
  }
  return Array.from(out)
}

/** Canonical form for comparing invoice numbers ("INV-0284" ≡ "INV-284"). */
function numKey(invoiceNumber: string): string {
  const m = /(\d+)\s*$/.exec(invoiceNumber)
  return m ? String(Number(m[1])) : invoiceNumber.toUpperCase()
}

/** Exactly-one subset of `items` whose values sum to `target` (cents), or null. */
function uniqueSubset<T>(items: Array<{ item: T; value: number }>, target: number): T[] | null {
  let found: T[] | null = null
  let count = 0
  const n = items.length
  const pick: T[] = []
  const walk = (start: number, remaining: number, size: number) => {
    if (count > 1) return
    if (remaining === 0 && size >= 2) {
      count += 1
      found = [...pick]
      return
    }
    if (size >= MAX_BUNDLE_SIZE || remaining <= 0) return
    for (let i = start; i < n; i++) {
      if (items[i].value > remaining) continue
      pick.push(items[i].item)
      walk(i + 1, remaining - items[i].value, size + 1)
      pick.pop()
      if (count > 1) return
    }
  }
  walk(0, target, 0)
  return count === 1 ? found : null
}

export function proposeAutoReconcile(args: {
  credits: ArCredit[]
  invoices: ArInvoice[]
  history: ArHistory[]
}): ArResult {
  const proposals: ArProposal[] = []
  const review: ArResult['review'] = []

  // Mutable open balances, so two credits can't claim the same money.
  const open = new Map<string, number>()
  for (const inv of args.invoices) open.set(inv.id, Math.max(0, cents(inv.total) - cents(inv.allocated)))
  const byNum = new Map<string, ArInvoice>()
  for (const inv of args.invoices) byNum.set(numKey(inv.number), inv)

  // Learned payers: payer key → client ids it has paid before.
  const learned = new Map<string, Set<string>>()
  for (const h of args.history) {
    const set = learned.get(h.payerKey) ?? new Set<string>()
    set.add(h.clientId)
    learned.set(h.payerKey, set)
  }
  const labels = Array.from(new Set(args.invoices.map((i) => i.clientLabel).filter(Boolean)))

  const issuable = (inv: ArInvoice) => !['draft', 'cancelled', 'void'].includes(inv.status)

  const eligible = (inv: ArInvoice, c: ArCredit, referenced: boolean): boolean => {
    if (!issuable(inv) || (open.get(inv.id) ?? 0) <= 0) return false
    if (c.cleared && inv.status !== 'paid') return false // backfill never marks anything paid
    if (referenced) return true
    if (inv.status === 'paid') return !!inv.datePaid && Math.abs(days(inv.datePaid, c.date)) <= PAID_DATE_WINDOW
    return !inv.dateIssued || days(inv.dateIssued, c.date) <= ISSUE_GRACE_DAYS
  }

  const credits = [...args.credits].sort((a, b) => a.date.localeCompare(b.date))
  for (const c of credits) {
    const due = cents(c.amount) - cents(c.allocated)
    if (due <= 0) continue
    const text = `${c.payee} ${c.memo}`
    if (NON_INCOME_RE.test(text)) { review.push({ creditId: c.id, why: 'Not customer income (owner / tax / transfer)' }); continue }

    const commit = (invs: ArInvoice[], method: ArProposal['method'], reason: string) => {
      const allocations = invs.map((inv) => ({ invoiceId: inv.id, amount: (open.get(inv.id) ?? 0) / 100 }))
      for (const inv of invs) open.set(inv.id, 0)
      proposals.push({ creditId: c.id, allocations, method, reason: `auto: ${reason}`, backfill: c.cleared })
    }

    // 1. Reference.
    const refs = referencedNumbers(text)
      .map((r) => byNum.get(numKey(r)))
      .filter((inv): inv is ArInvoice => !!inv && eligible(inv, c, true))
    const uniqueRefs = Array.from(new Map(refs.map((r) => [r.id, r])).values())
    if (uniqueRefs.length > 0) {
      const sum = uniqueRefs.reduce((s, inv) => s + (open.get(inv.id) ?? 0), 0)
      if (sum === due) {
        commit(uniqueRefs, 'invoice_ref', `reference ${uniqueRefs.map((i) => i.number).join(' + ')}`)
        continue
      }
      // A single referenced invoice inside a payment that also covers others is
      // handled by the payer rules below; a lone mismatch goes to review.
    }

    // 2. Known payer.
    const key = payerKey(c.payee)
    const clientIds = new Set<string>(learned.get(key) ?? [])
    const named = new Set([...matchClientsForPayee(c.payee, labels), ...(c.memo ? matchClientsForPayee(c.memo, labels) : [])])
    for (const inv of args.invoices) if (inv.clientId && named.has(inv.clientLabel)) clientIds.add(inv.clientId)
    if (clientIds.size === 0) {
      review.push({ creditId: c.id, why: uniqueRefs.length ? 'Reference found but amount differs' : 'Payer not recognised' })
      continue
    }
    const cands = args.invoices
      .filter((inv) => inv.clientId && clientIds.has(inv.clientId) && eligible(inv, c, false))
      .sort((a, b) => (a.dateIssued ?? '').localeCompare(b.dateIssued ?? '') || a.number.localeCompare(b.number))

    const exact = cands.filter((inv) => open.get(inv.id) === due)
    if (exact.length === 1) { commit(exact, 'amount_match', `known payer, single open invoice ${exact[0].number}`); continue }
    if (exact.length > 1) {
      const sameClient = exact.every((inv) => inv.clientId === exact[0].clientId)
      if (sameClient) { commit([exact[0]], 'amount_match', `known payer, oldest of ${exact.length} equal invoices (${exact[0].number})`); continue }
      review.push({ creditId: c.id, why: `${exact.length} open invoices of this amount across different clients` })
      continue
    }

    const bundleItems = cands.slice(0, MAX_BUNDLE_CANDIDATES).map((inv) => ({ item: inv, value: open.get(inv.id) ?? 0 })).filter((x) => x.value > 0)
    // Prefer invoices that already existed when the money arrived: a bundle
    // using only those wins even if a later-issued invoice could also fit.
    const issuedBefore = bundleItems.filter((x) => !x.item.dateIssued || x.item.dateIssued <= c.date)
    const bundle = uniqueSubset(issuedBefore, due) ?? (issuedBefore.length === bundleItems.length ? null : uniqueSubset(bundleItems, due))
    if (bundle) { commit(bundle, 'amount_match', `known payer, bundle ${bundle.map((i) => i.number).join(' + ')}`); continue }

    review.push({ creditId: c.id, why: cands.length ? 'No unique invoice or combination matches the amount' : 'No open invoices for this payer' })
  }

  return { proposals, review }
}

// ── Suggestions for the reconcile screen ─────────────────────────────────────
//
// For a payment that auto-reconcile left alone, rank what it most likely
// pays — so the screen can offer a one-click Confirm instead of a hunt. Same
// payer learning + reference parsing as the auto path, but returns options
// (best first) rather than only certainties, including part payments.

export interface ArSuggestion {
  kind: 'reference' | 'part_payment' | 'exact' | 'oldest' | 'bundle' | 'amount_only'
  allocations: ArAllocation[]
  /** Short operator-facing reason, e.g. "Royal Heights — 4 invoices". */
  label: string
}

export interface ArCreditSuggestions {
  /** Clients the payer resolves to (scopes the "pick invoices" list). */
  clientIds: string[]
  suggestions: ArSuggestion[]
  /** Warnings worth showing, e.g. a referenced invoice that's already paid in full. */
  notes: string[]
}

/** Do two document numbers refer to the same number? ("QUO-0491" ≡ "JOB-0491" ≡ "INV-491") */
export function sameDocNumber(a: string, b: string): boolean {
  return numKey(a) === numKey(b)
}

/** All subsets (size 2–MAX_BUNDLE_SIZE) summing to target, up to `limit`. */
function subsets<T>(items: Array<{ item: T; value: number }>, target: number, limit: number): T[][] {
  const out: T[][] = []
  const pick: T[] = []
  const walk = (start: number, remaining: number) => {
    if (out.length >= limit) return
    if (remaining === 0 && pick.length >= 2) { out.push([...pick]); return }
    if (pick.length >= MAX_BUNDLE_SIZE || remaining <= 0) return
    for (let i = start; i < items.length; i++) {
      if (items[i].value > remaining) continue
      pick.push(items[i].item)
      walk(i + 1, remaining - items[i].value)
      pick.pop()
    }
  }
  walk(0, target)
  return out
}

export function suggestCreditMatches(args: {
  credit: ArCredit
  invoices: ArInvoice[]
  history: ArHistory[]
  max?: number
}): ArCreditSuggestions {
  const { credit: c } = args
  const max = args.max ?? 3
  const due = cents(c.amount) - cents(c.allocated)
  const text = `${c.payee} ${c.memo}`
  const openOf = (inv: ArInvoice) => Math.max(0, cents(inv.total) - cents(inv.allocated))
  const suggestions: ArSuggestion[] = []
  const seen = new Set<string>()
  const add = (s: ArSuggestion) => {
    const key = s.allocations.map((a) => a.invoiceId).sort().join('+')
    if (seen.has(key) || suggestions.length >= max) return
    seen.add(key)
    suggestions.push(s)
  }
  const alloc = (inv: ArInvoice, amountCents = openOf(inv)) => ({ invoiceId: inv.id, amount: amountCents / 100 })
  const notes: string[] = []
  if (due <= 0) return { clientIds: [], suggestions, notes }
  if (NON_INCOME_RE.test(text)) {
    notes.push(/i\.?\s?r\.?\s?d|inland\s+revenue/i.test(text)
      ? 'From IRD — a tax refund, not customer income. Tick it off.'
      : 'Owner money / transfer — not customer income. Tick it off.')
    return { clientIds: [], suggestions, notes }
  }

  const byNum = new Map(args.invoices.map((i) => [numKey(i.number), i]))
  const usable = (inv: ArInvoice) => !['draft', 'cancelled', 'void'].includes(inv.status) && openOf(inv) > 0

  // 1. Reference(s) in the bank text.
  const refs = Array.from(new Map(referencedNumbers(text)
    .map((r) => byNum.get(numKey(r)))
    .filter((inv): inv is ArInvoice => !!inv && usable(inv))
    .map((inv) => [inv.id, inv])).values())
  if (refs.length > 0) {
    const sum = refs.reduce((s, inv) => s + openOf(inv), 0)
    if (sum === due) add({ kind: 'reference', allocations: refs.map((inv) => alloc(inv)), label: `Reference ${refs.map((i) => i.number).join(' + ')}` })
    else if (refs.length === 1 && due < openOf(refs[0])) {
      add({ kind: 'part_payment', allocations: [alloc(refs[0], due)], label: `Part payment of ${refs[0].number} — $${((openOf(refs[0]) - due) / 100).toFixed(2)} still owing` })
    }
  }

  // 2. The payer's own invoices.
  const learned = new Set(args.history.filter((h) => h.payerKey === payerKey(c.payee)).map((h) => h.clientId))
  const labels = Array.from(new Set(args.invoices.map((i) => i.clientLabel).filter(Boolean)))
  const named = new Set([...matchClientsForPayee(c.payee, labels), ...(c.memo ? matchClientsForPayee(c.memo, labels) : [])])
  for (const inv of refs) if (inv.clientId) learned.add(inv.clientId)
  for (const inv of args.invoices) if (inv.clientId && named.has(inv.clientLabel)) learned.add(inv.clientId)
  const clientIds = Array.from(learned)

  const sameTime = (inv: ArInvoice) => inv.status !== 'paid' || (!!inv.datePaid && Math.abs(days(inv.datePaid, c.date)) <= PAID_DATE_WINDOW)
  const cands = args.invoices
    .filter((inv) => inv.clientId && learned.has(inv.clientId) && usable(inv) && sameTime(inv))
    .sort((a, b) => (a.dateIssued ?? '').localeCompare(b.dateIssued ?? '') || a.number.localeCompare(b.number))
  const who = (inv: ArInvoice) => inv.clientLabel || 'client'

  for (const inv of cands.filter((i) => openOf(i) === due)) {
    add({ kind: 'exact', allocations: [alloc(inv)], label: `${who(inv)} — ${inv.number}` })
  }
  const before = cands.filter((i) => !i.dateIssued || i.dateIssued <= c.date)
  const items = (pool: ArInvoice[]) => pool.slice(0, MAX_BUNDLE_CANDIDATES).map((inv) => ({ item: inv, value: openOf(inv) }))
  for (const set of [...subsets(items(before), due, max), ...subsets(items(cands), due, max)]) {
    add({ kind: 'bundle', allocations: set.map((inv) => alloc(inv)), label: `${who(set[0])} — ${set.length} invoices` })
  }

  // 3. Nothing tied to the payer: same-amount open invoices anywhere (weak).
  if (suggestions.length === 0 && clientIds.length === 0) {
    for (const inv of args.invoices.filter((i) => i.status !== 'paid' && usable(i) && openOf(i) === due).slice(0, max)) {
      add({ kind: 'amount_only', allocations: [alloc(inv)], label: `Same amount: ${inv.number} (${who(inv)}) — check the payer` })
    }
  }

  // A referenced invoice that's already fully paid: likely a double payment,
  // or an earlier payment was matched to the wrong invoice.
  for (const r of referencedNumbers(text)) {
    const inv = byNum.get(numKey(r))
    if (inv && !['draft', 'cancelled', 'void'].includes(inv.status) && openOf(inv) === 0) {
      notes.push(`${inv.number} is already paid in full — a double payment, or an earlier payment was matched to it by mistake.`)
    }
  }
  if (clientIds.length === 0 && suggestions.length === 0) notes.push('Payer not recognised — search by name or address, or create the client + invoice.')

  return { clientIds, suggestions, notes }
}
