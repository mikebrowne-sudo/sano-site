// Data access for OUTGOING bank reconciliation (contractor remittances).
//
// The money-out mirror of finance/reconcile/_data.ts. Pulls stored outgoing
// bank debits + all contractor remittances (with their item totals and any live
// allocations) so the matcher can suggest debit ↔ remittance ties. No writes.

import { createClient } from '@/lib/supabase-server'
import type { OutgoingDebit, ReconRemittance } from '@/lib/remittance-reconcile'

/** A live (un-reversed) allocation of outgoing bank money to a remittance. */
export interface RemitAllocationRow {
  id: string
  bankTransactionId: string
  remittanceId: string
  remittanceNumber: string
  amount: number
  method: string
  reconciledAt: string | null
}

export interface OutTxnMeta {
  id: string
  cleared: boolean
  allocations: RemitAllocationRow[]
  allocatedTotal: number
}

export interface ReconcileOutData {
  debits: OutgoingDebit[]
  /** bank txn id → cleared + allocations, for rendering controls. */
  meta: Map<string, OutTxnMeta>
  remittances: ReconRemittance[]
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function getReconcileOutData(): Promise<ReconcileOutData> {
  const supabase = createClient()

  const [{ data: txnData }, { data: remitData }, { data: itemData }, { data: allocData }] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('id, txn_date, tran_type, payee, memo, amount, direction, cleared')
      .eq('direction', 'out')
      .order('txn_date', { ascending: false }),
    supabase
      .from('contractor_remittances')
      .select('id, remittance_number, reference, payee_label, payment_date, paid_at, payment_confirmed')
      .order('payment_date', { ascending: false }),
    // Item amounts → remittance total (the remittance has no stored total column).
    supabase
      .from('contractor_remittance_items')
      .select('remittance_id, amount'),
    // Live (un-reversed) allocations — the durable bank↔remittance link.
    supabase
      .from('remittance_payment_allocations')
      .select('id, bank_transaction_id, remittance_id, amount_allocated, method, reconciled_at, contractor_remittances ( remittance_number )')
      .is('reversed_at', null),
  ])

  // Sum item amounts per remittance.
  const totalByRemit = new Map<string, number>()
  for (const it of (itemData ?? []) as Array<{ remittance_id: string; amount: number | null }>) {
    totalByRemit.set(it.remittance_id, round2((totalByRemit.get(it.remittance_id) ?? 0) + Number(it.amount ?? 0)))
  }

  // Index live allocations by bank txn id and by remittance id.
  const allocByTxn = new Map<string, RemitAllocationRow[]>()
  const allocatedByRemit = new Map<string, number>()
  for (const a of (allocData ?? []) as Array<Record<string, unknown>>) {
    const num = (a.contractor_remittances as { remittance_number?: string } | null)?.remittance_number ?? ''
    const row: RemitAllocationRow = {
      id: a.id as string,
      bankTransactionId: a.bank_transaction_id as string,
      remittanceId: a.remittance_id as string,
      remittanceNumber: num,
      amount: Number(a.amount_allocated ?? 0),
      method: (a.method as string) ?? 'manual',
      reconciledAt: (a.reconciled_at as string | null) ?? null,
    }
    const list = allocByTxn.get(row.bankTransactionId) ?? []
    list.push(row)
    allocByTxn.set(row.bankTransactionId, list)
    allocatedByRemit.set(row.remittanceId, round2((allocatedByRemit.get(row.remittanceId) ?? 0) + row.amount))
  }

  const meta = new Map<string, OutTxnMeta>()
  const debits: OutgoingDebit[] = (txnData ?? []).map((r) => {
    const id = r.id as string
    const allocations = allocByTxn.get(id) ?? []
    const allocatedTotal = round2(allocations.reduce((s, a) => s + a.amount, 0))
    meta.set(id, { id, cleared: !!r.cleared, allocations, allocatedTotal })
    return {
      id,
      date: (r.txn_date as string | null) ?? '',
      payee: (r.payee as string | null) ?? '',
      memo: (r.memo as string | null) ?? '',
      amount: Number(r.amount ?? 0),
      cleared: !!r.cleared,
      allocatedTotal,
    }
  })

  const remittances: ReconRemittance[] = (remitData ?? []).map((r) => ({
    id: r.id as string,
    remittanceNumber: (r.remittance_number as string | null) ?? '',
    reference: (r.reference as string | null) ?? null,
    payeeLabel: (r.payee_label as string | null) ?? null,
    paymentDate: (r.payment_date as string | null) ?? null,
    total: round2(totalByRemit.get(r.id as string) ?? 0),
    paidAt: (r.paid_at as string | null) ?? null,
    paymentConfirmed: !!r.payment_confirmed,
    allocatedTotal: round2(allocatedByRemit.get(r.id as string) ?? 0),
  }))

  return { debits, meta, remittances }
}
