// Match an IRD debit on the bank feed to the PAYE ledger.
//
// Pure. PAYE is paid per payday ($94.50 for one, $189.00 for two…), so a bank
// payment is applied to the IRD ledger only when it EXACTLY settles the oldest
// unpaid payday(s) — oldest first, paydays on or before the payment date.
// Anything else (a GST payment, a part payment, a payment for a payday not yet
// on the ledger) is left alone: it stays an IRD-payment expense and nothing on
// the ledger moves. That is what keeps a $3,422.11 GST payment off PAYE.

export interface IrdLedgerLine {
  liabilityId: string
  payday: string
  payable: number
}

export interface IrdAllocation {
  liabilityId: string
  amount: number
}

const cents = (n: number) => Math.round(n * 100)

/**
 * What each line still owes, after the payments already recorded against its
 * period are applied to that period's lines oldest payday first.
 */
export function outstandingLines(lines: IrdLedgerLine[], paidByLiability: Record<string, number>): Array<IrdLedgerLine & { outstanding: number }> {
  const left = new Map(Object.entries(paidByLiability).map(([k, v]) => [k, cents(v)]))
  return [...lines]
    .filter((l) => cents(l.payable) > 0)
    .sort((a, b) => a.payday.localeCompare(b.payday) || a.liabilityId.localeCompare(b.liabilityId))
    .map((l) => {
      const avail = left.get(l.liabilityId) ?? 0
      const used = Math.min(avail, cents(l.payable))
      left.set(l.liabilityId, avail - used)
      return { ...l, outstanding: (cents(l.payable) - used) / 100 }
    })
}

/**
 * Allocate one bank payment. Returns null unless the amount lands exactly on a
 * payday boundary walking the unpaid paydays (≤ payment date) oldest first.
 */
export function allocateIrdBankPayment(args: {
  lines: IrdLedgerLine[]
  paidByLiability: Record<string, number>
  amount: number
  paymentDate: string
}): IrdAllocation[] | null {
  const target = cents(args.amount)
  if (target <= 0) return null
  const open = outstandingLines(args.lines, args.paidByLiability).filter((l) => cents(l.outstanding) > 0)
  let sum = 0
  const by = new Map<string, number>()
  for (const l of open) {
    if (l.payday > args.paymentDate) return null
    const c = cents(l.outstanding)
    sum += c
    by.set(l.liabilityId, (by.get(l.liabilityId) ?? 0) + c)
    if (sum === target) return Array.from(by, ([liabilityId, v]) => ({ liabilityId, amount: v / 100 }))
    if (sum > target) return null
  }
  return null
}
