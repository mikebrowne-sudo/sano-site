// Automatic reconciliation of OUTGOING bank debits.
//
// Pure: given uncleared debits and the records money goes out against, propose
// the links that are safe without a human. The runner applies them; anything
// ambiguous stays on the reconcile screen.
//
// Order matters — the system of record wins over a duplicate expense row:
//   1. Contractor remittance(s) — reference stem in the bank text naming one
//      open remittance of the same amount; else exactly one open remittance of
//      the same amount within 7 days; else exactly one combination (2–4) of
//      open remittances paid within 3 days that sums to the debit.
//   2. Employee pay run — exactly one paid pay run whose payout (net pay +
//      mileage reimbursement) equals the debit, paid within 6 days. Two pay
//      runs paid in one transfer are flagged for review (one link per debit).
//   3. Own-account transfer — the bank text names Sano's own account number
//      with a different suffix (e.g. -51 tax savings). Not an expense.
//   4. Existing expense — exactly one unlinked expense of the same amount
//      within 6 days (closest date wins only when it's the sole closest).
//   5. Well-known payee with no record yet — IRD payments (recorded as an
//      `ird_payment` expense: below the line, no GST) and IRD card conversion
//      fees (`bank_fees`). Created and linked by the runner.
//   6. Recurring bill — the same payee has been paid the SAME amount before
//      against a recorded expense (Google Workspace, insurance premiums): a
//      copy of that expense (category, vendor, GST flag) is created + linked.
// Never auto: anything else, or any step with two plausible answers.

export const REMIT_DATE_WINDOW = 7
export const BUNDLE_DATE_WINDOW = 3
export const RECORD_DATE_WINDOW = 6

export interface OutDebit {
  id: string
  date: string
  /** Positive amount of money out. */
  amount: number
  payee: string
  memo: string
  /** Live remittance allocations already on this debit. */
  allocated: number
}

export interface OutRemittance {
  id: string
  number: string
  reference: string | null
  payeeLabel: string | null
  paymentDate: string | null
  total: number
  allocated: number
}

export interface OutPayRun {
  id: string
  payDate: string | null
  /** What was transferred: net pay + mileage reimbursement. */
  net: number
  reference: string | null
  linked: boolean
}

export interface OutExpense {
  id: string
  date: string | null
  amount: number
  category: string | null
  vendor: string | null
  reference: string | null
  gstInclusive?: boolean | null
  linked: boolean
}

/** A past debit → expense link: lets a repeat bill be recorded automatically. */
export interface OutKnownBill {
  payeeKey: string
  amount: number
  category: string
  vendor: string | null
  gstInclusive: boolean
}

export type OutProposal =
  | { kind: 'remittance'; debitId: string; allocations: Array<{ remittanceId: string; amount: number }>; method: 'reference' | 'amount_match'; reason: string }
  | { kind: 'pay_run'; debitId: string; payRunId: string; amount: number; reason: string }
  | { kind: 'internal_transfer'; debitId: string; amount: number; reason: string }
  | { kind: 'expense'; debitId: string; expenseId: string; amount: number; reason: string }
  | { kind: 'created_expense'; debitId: string; amount: number; category: string; vendor: string; description: string; gstInclusive: boolean; reason: string }

export interface OutResult {
  proposals: OutProposal[]
  review: Array<{ debitId: string; why: string }>
}

const cents = (n: number) => Math.round(n * 100)
const absDays = (a: string, b: string) =>
  Math.abs(Date.parse(`${a.slice(0, 10)}T00:00:00Z`) - Date.parse(`${b.slice(0, 10)}T00:00:00Z`)) / 86_400_000
const norm = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()

/** "BILL PAYMENT TO PAYROLL MARINA 220726" names remittance ref "MARINA PAYROLL 220726". */
function namesReference(text: string, ref: string | null): boolean {
  if (!ref) return false
  const hay = norm(text)
  const tokens = norm(ref).split(' ').filter((t) => t.length >= 3)
  return tokens.length > 0 && tokens.every((t) => hay.includes(t))
}

/**
 * Sano's own account, any suffix other than the main one: "12-3627-0005597-00"
 * → matches "12-3627- 0005597-51" (spacing varies in ASB text).
 */
export function ownAccountTransfer(text: string, ownAccount: string): boolean {
  const m = /^(\d{2})-(\d{4})-(\d{7})-(\d{2,3})$/.exec(ownAccount)
  if (!m) return false
  const [, bank, branch, base, suffix] = m
  const re = new RegExp(`${bank}\\s*-?\\s*${branch}\\s*-?\\s*${base}\\s*-?\\s*(\\d{2,3})`)
  const hit = re.exec(text)
  return !!hit && hit[1] !== suffix
}

/** Stable key for a payee ("Google Workspace_sano.nz Auckland" → "GOOGLE WORKSPACE SANO NZ AUCKLAND"). */
export function payeeKeyOut(payee: string): string {
  return norm(payee).replace(/\b\d+\b/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Does the bank text name the remittance's payee ("PAYROLL Nasrin 300926" ↔ "Nasrin Maleki")? */
function namesPayee(text: string, label: string | null): boolean {
  if (!label) return false
  const hay = norm(text)
  const words = new Set(hay.split(' '))
  return norm(label).split(' ').filter((t) => t.length >= 3 && !['LTD', 'LIMITED', 'AND'].includes(t)).some((t) => words.has(t))
}

const IRD_FEE_RE = /\bIRD\s+CONV(ENIENCE)?\s+FEE/i
const IRD_RE = /INLAND\s+REVENUE|\bI\.?R\.?D\.?\b/i

function uniqueSubset<T>(items: Array<{ item: T; value: number }>, target: number, maxSize: number): T[] | null {
  let found: T[] | null = null
  let count = 0
  const pick: T[] = []
  const walk = (start: number, remaining: number) => {
    if (count > 1) return
    if (remaining === 0 && pick.length >= 2) { count += 1; found = [...pick]; return }
    if (pick.length >= maxSize || remaining <= 0) return
    for (let i = start; i < items.length; i++) {
      if (items[i].value > remaining) continue
      pick.push(items[i].item)
      walk(i + 1, remaining - items[i].value)
      pick.pop()
      if (count > 1) return
    }
  }
  walk(0, target)
  return count === 1 ? found : null
}

export function proposeDebitReconcile(args: {
  debits: OutDebit[]
  remittances: OutRemittance[]
  payRuns: OutPayRun[]
  expenses: OutExpense[]
  ownAccount: string
  /** Bills already linked to an expense in earlier runs. */
  knownBills?: OutKnownBill[]
}): OutResult {
  const proposals: OutProposal[] = []
  const review: OutResult['review'] = []

  const remitOpen = new Map(args.remittances.map((r) => [r.id, Math.max(0, cents(r.total) - cents(r.allocated))]))
  const payRunTaken = new Set(args.payRuns.filter((p) => p.linked).map((p) => p.id))
  const expenseTaken = new Set(args.expenses.filter((e) => e.linked).map((e) => e.id))
  const bills = new Map<string, OutKnownBill>()
  for (const b of args.knownBills ?? []) bills.set(`${b.payeeKey}|${cents(b.amount)}`, b)

  const debits = [...args.debits].sort((a, b) => a.date.localeCompare(b.date))
  for (const d of debits) {
    const due = cents(d.amount) - cents(d.allocated)
    if (due <= 0) continue
    const text = `${d.payee} ${d.memo}`
    const amount = due / 100

    // 1. Remittances.
    const open = args.remittances.filter((r) => (remitOpen.get(r.id) ?? 0) > 0)
    const sameAmt = open.filter((r) => remitOpen.get(r.id) === due)
    const byRef = sameAmt.filter((r) => namesReference(text, r.reference))
    const byDate = sameAmt.filter((r) => r.paymentDate && absDays(r.paymentDate, d.date) <= REMIT_DATE_WINDOW)
    // Same amount + date but several candidates: the payee named in the bank text decides.
    const byName = byDate.length > 1 ? byDate.filter((r) => namesPayee(text, r.payeeLabel)) : []
    const remitPick = byRef.length === 1 ? { r: byRef[0], method: 'reference' as const }
      : byRef.length === 0 && byDate.length === 1 ? { r: byDate[0], method: 'amount_match' as const }
      : byRef.length === 0 && byName.length === 1 ? { r: byName[0], method: 'reference' as const }
      : null
    if (remitPick) {
      remitOpen.set(remitPick.r.id, 0)
      proposals.push({
        kind: 'remittance', debitId: d.id, method: remitPick.method,
        allocations: [{ remittanceId: remitPick.r.id, amount }],
        reason: `auto: remittance ${remitPick.r.number} (${remitPick.method === 'reference' ? 'reference' : 'amount + date'})`,
      })
      continue
    }
    if (byRef.length > 1 || byDate.length > 1) {
      review.push({ debitId: d.id, why: 'Several remittances of this amount' })
      continue
    }
    const near = open
      .filter((r) => r.paymentDate && absDays(r.paymentDate, d.date) <= BUNDLE_DATE_WINDOW)
      .map((r) => ({ item: r, value: remitOpen.get(r.id) ?? 0 }))
    const bundle = near.length >= 2 ? uniqueSubset(near, due, 4) : null
    if (bundle) {
      for (const r of bundle) remitOpen.set(r.id, 0)
      proposals.push({
        kind: 'remittance', debitId: d.id, method: 'amount_match',
        allocations: bundle.map((r) => ({ remittanceId: r.id, amount: (near.find((n) => n.item.id === r.id)?.value ?? 0) / 100 })),
        reason: `auto: remittances ${bundle.map((r) => r.number).join(' + ')} paid together`,
      })
      continue
    }

    // 2. Employee pay run (net pay).
    const runs = args.payRuns
      .filter((p) => !payRunTaken.has(p.id) && cents(p.net) === due && p.payDate && absDays(p.payDate, d.date) <= RECORD_DATE_WINDOW)
      .sort((a, b) => absDays(a.payDate as string, d.date) - absDays(b.payDate as string, d.date))
    if (runs.length > 1 && absDays(runs[0].payDate as string, d.date) < absDays(runs[1].payDate as string, d.date)) runs.splice(1)
    if (runs.length === 1) {
      payRunTaken.add(runs[0].id)
      proposals.push({ kind: 'pay_run', debitId: d.id, payRunId: runs[0].id, amount, reason: `auto: pay run ${runs[0].payDate} (net pay)` })
      continue
    }
    if (runs.length > 1) { review.push({ debitId: d.id, why: 'Several pay runs of this amount' }); continue }
    const nearRuns = args.payRuns
      .filter((p) => !payRunTaken.has(p.id) && p.payDate && absDays(p.payDate, d.date) <= RECORD_DATE_WINDOW)
      .map((p) => ({ item: p, value: cents(p.net) }))
    const runPair = nearRuns.length >= 2 ? uniqueSubset(nearRuns, due, 3) : null
    if (runPair) {
      review.push({ debitId: d.id, why: `Pays ${runPair.length} pay runs together (${runPair.map((p) => p.payDate).join(', ')}) — tick it off once checked` })
      continue
    }

    // 3. Transfer to Sano's own account (tax savings).
    if (ownAccountTransfer(text, args.ownAccount)) {
      proposals.push({ kind: 'internal_transfer', debitId: d.id, amount, reason: 'auto: transfer to Sano tax-savings account' })
      continue
    }

    // 4. Existing expense.
    const exp = args.expenses
      .filter((e) => !expenseTaken.has(e.id) && e.date && cents(e.amount) === due && absDays(e.date, d.date) <= RECORD_DATE_WINDOW)
      .map((e) => ({ e, gap: absDays(e.date as string, d.date) }))
      .sort((a, b) => a.gap - b.gap)
    if (exp.length === 1 || (exp.length > 1 && exp[0].gap < exp[1].gap)) {
      const e = exp[0].e
      expenseTaken.add(e.id)
      if (e.category) bills.set(`${payeeKeyOut(d.payee)}|${due}`, { payeeKey: payeeKeyOut(d.payee), amount, category: e.category, vendor: e.vendor, gstInclusive: e.gstInclusive !== false })
      proposals.push({ kind: 'expense', debitId: d.id, expenseId: e.id, amount, reason: `auto: expense ${e.date} ${e.vendor ?? ''}`.trim() })
      continue
    }
    if (exp.length > 1) { review.push({ debitId: d.id, why: 'Several expenses of this amount on the same day' }); continue }

    // 5. Well-known payees with nothing recorded yet.
    if (IRD_FEE_RE.test(text)) {
      proposals.push({ kind: 'created_expense', debitId: d.id, amount, category: 'bank_fees', vendor: 'Inland Revenue (card fee)', description: 'IRD card payment convenience fee', gstInclusive: false, reason: 'auto: IRD card fee recorded as bank fee' })
      continue
    }
    if (IRD_RE.test(text)) {
      proposals.push({ kind: 'created_expense', debitId: d.id, amount, category: 'ird_payment', vendor: 'Inland Revenue', description: `IRD payment — ${d.memo || d.payee}`.trim(), gstInclusive: false, reason: 'auto: IRD payment recorded (PAYE / GST — not an expense)' })
      continue
    }

    // 6. Repeat of a known bill (same payee, same amount).
    const bill = bills.get(`${payeeKeyOut(d.payee)}|${due}`)
    if (bill) {
      proposals.push({ kind: 'created_expense', debitId: d.id, amount, category: bill.category, vendor: bill.vendor ?? d.payee, description: `${bill.vendor ?? d.payee} (recurring — recorded from bank)`, gstInclusive: bill.gstInclusive, reason: `auto: repeat bill — same payee and amount as before (${bill.category})` })
      continue
    }

    review.push({ debitId: d.id, why: 'Nothing recorded for this payment' })
  }

  return { proposals, review }
}
