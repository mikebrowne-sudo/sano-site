// Data access for stored bank transactions (ASB import, phase 2).

import { createClient } from '@/lib/supabase-server'
import { extractInvoiceRefs, extractNumberRefs, type BankTxn } from '@/lib/asb-import'
import type { ReconInvoice, ReconExpense, ReconPaymentRecord } from '@/lib/bank-reconcile'
import { invoicePayableTotal } from './_apply'

/** A live (un-reversed) allocation of bank money to an invoice. */
export interface AllocationRow {
  id: string
  bankTransactionId: string
  invoiceId: string
  invoiceNumber: string
  amount: number
  method: string
  /** "auto: …" when made by auto-reconcile. */
  matchReason: string | null
  reconciledAt: string | null
}

export interface StoredTxnMeta {
  id: string
  cleared: boolean
  /** Live allocations against this bank line (for display + reversal). */
  allocations: AllocationRow[]
  /** Sum of live allocations on this line. */
  allocatedTotal: number
}

export interface ReconcileData {
  transactions: BankTxn[]
  /** uniqueId → stored row id + cleared flag + allocations, for rendering controls. */
  meta: Map<string, StoredTxnMeta>
  invoices: ReconInvoice[]
  expenses: ReconExpense[]
  /**
   * Contractor remittances + employee pay runs. A bank debit matching one of
   * these is already recorded — entering it as an expense would double-count
   * the cost and double-claim its GST.
   */
  paymentRecords: ReconPaymentRecord[]
}

interface TxnRow {
  id: string
  unique_id: string
  txn_date: string | null
  tran_type: string | null
  payee: string | null
  memo: string | null
  amount: number | null
  direction: string | null
  cleared: boolean | null
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export async function getReconcileData(): Promise<ReconcileData> {
  const supabase = createClient()

  const [{ data: txnData }, { data: invoiceData }, { data: expenseData }, { data: allocData }] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('id, unique_id, txn_date, tran_type, payee, memo, amount, direction, cleared')
      .order('txn_date', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, gst_included, date_paid, service_address, clients ( name ), invoice_items ( price )')
      .neq('status', 'cancelled')
      .is('deleted_at', null)
      .not('is_test', 'is', true),
    supabase
      .from('expenses')
      .select('amount, expense_date'),
    // Live (un-reversed) allocations — the durable bank↔invoice link.
    supabase
      .from('invoice_payment_allocations')
      .select('id, bank_transaction_id, invoice_id, amount_allocated, method, match_reason, reconciled_at, invoices ( invoice_number )')
      .is('reversed_at', null),
  ])

  // Index live allocations by bank txn id and by invoice id.
  const allocByTxn = new Map<string, AllocationRow[]>()
  const allocatedByInvoice = new Map<string, number>()
  for (const a of (allocData ?? []) as Array<Record<string, unknown>>) {
    const invNum = (a.invoices as { invoice_number?: string } | null)?.invoice_number ?? ''
    const row: AllocationRow = {
      id: a.id as string,
      bankTransactionId: a.bank_transaction_id as string,
      invoiceId: a.invoice_id as string,
      invoiceNumber: invNum,
      amount: Number(a.amount_allocated ?? 0),
      method: (a.method as string) ?? 'manual',
      matchReason: (a.match_reason as string | null) ?? null,
      reconciledAt: (a.reconciled_at as string | null) ?? null,
    }
    const list = allocByTxn.get(row.bankTransactionId) ?? []
    list.push(row)
    allocByTxn.set(row.bankTransactionId, list)
    allocatedByInvoice.set(row.invoiceId, (allocatedByInvoice.get(row.invoiceId) ?? 0) + row.amount)
  }

  const meta = new Map<string, StoredTxnMeta>()
  const transactions: BankTxn[] = (txnData as TxnRow[] ?? []).map((r) => {
    const payee = r.payee ?? ''
    const memo = r.memo ?? ''
    const allocations = allocByTxn.get(r.id) ?? []
    const allocatedTotal = round2(allocations.reduce((s, a) => s + a.amount, 0))
    meta.set(r.unique_id, { id: r.id, cleared: !!r.cleared, allocations, allocatedTotal })
    return {
      uniqueId: r.unique_id,
      date: r.txn_date ?? '',
      rawDate: r.txn_date ?? '',
      type: r.tran_type ?? '',
      payee,
      memo,
      amount: r.amount ?? 0,
      direction: (r.direction === 'out' ? 'out' : 'in'),
      invoiceRefs: extractInvoiceRefs(`${payee} ${memo}`),
      numberRefs: extractNumberRefs(`${payee} ${memo}`),
    }
  })

  const invoices: ReconInvoice[] = (invoiceData ?? []).map((i) => {
    const client =(i.clients as unknown as { name: string } | null)?.name ?? ''
    return {
      id: i.id as string,
      invoiceNumber: (i.invoice_number as string | null) ?? '',
      status: (i.status as string | null) ?? 'draft',
      // GST-inclusive — what the client actually pays (GST-exclusive invoices add 15%).
      total: invoicePayableTotal(i),
      datePaid: (i.date_paid as string | null) ?? null,
      client,
      address: (i.service_address as string | null) ?? '',
      allocatedTotal: round2(allocatedByInvoice.get(i.id as string) ?? 0),
    }
  })
  const expenses: ReconExpense[] = (expenseData ?? []).map((e) => ({
    amount: (e.amount as number | null) ?? 0,
    expenseDate: (e.expense_date as string | null) ?? null,
  }))

  // Contractor remittances (payee + total from their frozen items) and
  // employee pay runs (net pay actually transferred).
  const [{ data: remitData }, { data: payRunData }] = await Promise.all([
    supabase
      .from('contractor_remittances')
      .select('remittance_number, payee_label, payment_date, contractor_remittance_items ( amount )'),
    supabase
      .from('pay_runs')
      .select('pay_date, status, pay_run_lines ( net_pay )')
      .eq('status', 'paid'),
  ])

  const paymentRecords: ReconPaymentRecord[] = []

  for (const r of remitData ?? []) {
    const items = (r.contractor_remittance_items as { amount: number | null }[] | null) ?? []
    const total = round2(items.reduce((sum, i) => sum + Number(i.amount ?? 0), 0))
    if (total <= 0) continue
    const number = (r.remittance_number as string | null) ?? 'Remittance'
    const payee = (r.payee_label as string | null) ?? ''
    paymentRecords.push({
      kind: 'remittance',
      label: payee ? `${number} · ${payee}` : number,
      amount: total,
      paymentDate: (r.payment_date as string | null) ?? null,
    })
  }

  for (const pr of payRunData ?? []) {
    const lines = (pr.pay_run_lines as { net_pay: number | null }[] | null) ?? []
    const net = round2(lines.reduce((sum, l) => sum + Number(l.net_pay ?? 0), 0))
    if (net <= 0) continue
    const date = (pr.pay_date as string | null) ?? null
    paymentRecords.push({
      kind: 'pay_run',
      label: date ? `Pay run ${date}` : 'Pay run',
      amount: net,
      paymentDate: date,
    })
  }

  return { transactions, meta, invoices, expenses, paymentRecords }
}
