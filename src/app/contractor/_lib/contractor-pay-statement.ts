// Contractor pay statement aggregation — PURE + testable.
//
// Source of truth is the canonical payable model:
//   • Pending pay = APPROVED, unpaid contractor_invoices.
//   • Paid to date = PAID contractor_invoices, grouped by the
//     contractor_remittance batch that paid them (for the document link),
//     plus any legacy paid pay_run_items (the retired flow, kept for
//     historical totals only).
//
// Double-count safety:
//   • Paid amounts are summed from contractor_invoices ONCE — never from
//     contractor_remittance_items (which merely snapshot the same CI
//     amounts). Remittance rows are used only to group + link.
//   • New CIs and legacy pay_run_items are disjoint by construction: the
//     old pay-run flow never created CIs, and the new remittance flow never
//     creates pay_run_items. So a single payment can't appear in both.
//
// All inputs are already scoped to ONE contractor by the loader, so a
// contractor only ever sees their own totals.

export interface RawContractorInvoice {
  id: string
  amount: number | null
  status: string | null // 'pending' | 'approved' | 'paid'
  date_paid: string | null
  date_submitted: string | null
  jobId: string | null
  jobNumber: string | null
  title: string | null
  jobCompletedAt: string | null
  jobDeletedAt: string | null
}

export interface RawRemittanceLink {
  ciId: string
  remittanceId: string
}

export interface RawRemittance {
  id: string
  token: string | null
  paymentDate: string | null
  /** Set when staff marked the remittance paid; null = pending payment. */
  paidAt: string | null
}

export interface RawLegacyPayItem {
  payRunId: string
  payDate: string | null
  kind: string | null // only 'contractor' runs count
  amount: number | null
}

export interface RawLegacyToken {
  payRunId: string
  token: string
}

export interface PendingLine {
  ciId: string
  jobId: string | null
  jobNumber: string | null
  title: string | null
  date: string | null
  amount: number
}

export interface PaidBatch {
  /** Synthetic stable key (rem:* / manual:* / payrun:*). */
  id: string
  payDate: string | null
  total: number
  jobCount: number
  /** Public document route, or null when there's no remittance document. */
  docHref: string | null
}

export interface ContractorPayData {
  /** Approved, unpaid payables NOT yet on any remittance (loose lines). */
  pending: PendingLine[]
  /** Approved payables that ARE on a remittance which isn't paid yet —
   *  grouped per remittance so the contractor sees one "Pending payment"
   *  row linking to the advice. */
  pendingBatches: PaidBatch[]
  /** pending lines + pendingBatches. */
  pendingTotal: number
  paidBatches: PaidBatch[]
  paidTotal: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function buildContractorPayData(input: {
  cis: RawContractorInvoice[]
  remLinks: RawRemittanceLink[]
  rems: RawRemittance[]
  legacyItems: RawLegacyPayItem[]
  legacyTokens: RawLegacyToken[]
}): ContractorPayData {
  // Archived jobs drop out entirely.
  const cis = input.cis.filter((c) => !c.jobDeletedAt)

  // Remittance lookups (for grouping + the doc link). Links cover BOTH paid
  // and still-approved CIs so we can group an approved payable that's on a
  // not-yet-paid remittance into a "Pending payment" row.
  const remIdByCi = new Map<string, string>()
  for (const l of input.remLinks) remIdByCi.set(l.ciId, l.remittanceId)
  const remById = new Map<string, RawRemittance>()
  for (const r of input.rems) remById.set(r.id, r)

  const pending: PendingLine[] = []
  const paidCis: RawContractorInvoice[] = []
  // Approved payables sitting on an unpaid remittance, grouped by remittance.
  const pendingBatchMap = new Map<string, PaidBatch>()
  for (const c of cis) {
    const isPaid = c.status === 'paid' || !!c.date_paid
    if (isPaid) {
      paidCis.push(c)
      continue
    }
    if (c.status === 'approved') {
      const remId = remIdByCi.get(c.id)
      const rem = remId ? remById.get(remId) : undefined
      // On an unpaid remittance → a pending-payment batch (rem.paidAt is null
      // by construction, since a paid remittance flips its CIs to paid).
      if (rem && !rem.paidAt) {
        const key = `rempend:${rem.id}`
        const b = pendingBatchMap.get(key) ?? {
          id: key,
          payDate: rem.paymentDate ?? null,
          total: 0,
          jobCount: 0,
          docHref: rem.token ? `/remittance-batch/${rem.token}` : null,
        }
        b.total = round2(b.total + (c.amount ?? 0))
        b.jobCount += 1
        pendingBatchMap.set(key, b)
        continue
      }
      // Loose approved line (not on any remittance yet).
      pending.push({
        ciId: c.id,
        jobId: c.jobId,
        jobNumber: c.jobNumber,
        title: c.title,
        date: c.date_submitted ?? c.jobCompletedAt ?? null,
        amount: c.amount ?? 0,
      })
    }
    // status 'pending' (not yet approved) carries no committed amount → omit.
  }
  pending.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const pendingBatches = Array.from(pendingBatchMap.values())
    .sort((a, b) => (b.payDate ?? '').localeCompare(a.payDate ?? ''))
  const pendingTotal = round2(
    pending.reduce((s, l) => s + l.amount, 0) + pendingBatches.reduce((s, b) => s + b.total, 0),
  )

  const batches = new Map<string, PaidBatch>()
  for (const c of paidCis) {
    const remId = remIdByCi.get(c.id)
    const rem = remId ? remById.get(remId) : undefined
    let key: string
    let payDate: string | null
    let docHref: string | null
    if (rem) {
      key = `rem:${rem.id}`
      payDate = rem.paymentDate ?? c.date_paid ?? null
      docHref = rem.token ? `/remittance-batch/${rem.token}` : null
    } else {
      // Marked paid without a remittance document — group by paid date.
      key = `manual:${c.date_paid ?? 'undated'}`
      payDate = c.date_paid ?? null
      docHref = null
    }
    const b = batches.get(key) ?? { id: key, payDate, total: 0, jobCount: 0, docHref }
    b.total = round2(b.total + (c.amount ?? 0))
    b.jobCount += 1
    batches.set(key, b)
  }

  // Legacy paid pay runs (retired flow) — historical totals only.
  const legacyTokenByRun = new Map<string, string>()
  for (const t of input.legacyTokens) legacyTokenByRun.set(t.payRunId, t.token)
  for (const it of input.legacyItems) {
    if (it.kind !== 'contractor') continue
    const key = `payrun:${it.payRunId}`
    const tok = legacyTokenByRun.get(it.payRunId)
    const b = batches.get(key) ?? {
      id: key,
      payDate: it.payDate ?? null,
      total: 0,
      jobCount: 0,
      docHref: tok ? `/remittance/${tok}` : null,
    }
    b.total = round2(b.total + (it.amount ?? 0))
    b.jobCount += 1
    batches.set(key, b)
  }

  const paidBatches = Array.from(batches.values()).sort((a, b) => (b.payDate ?? '').localeCompare(a.payDate ?? ''))
  const paidTotal = round2(paidBatches.reduce((s, b) => s + b.total, 0))

  return { pending, pendingBatches, pendingTotal, paidBatches, paidTotal }
}
