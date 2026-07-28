// Data access for stored bank transactions (ASB import, phase 2).

import { createClient } from '@/lib/supabase-server'
import { extractInvoiceRefs, extractNumberRefs, type BankTxn } from '@/lib/asb-import'
import type { ReconInvoice, ReconExpense } from '@/lib/bank-reconcile'

/** A live (un-reversed) allocation of bank money to an invoice. */
export interface AllocationRow {
  id: string
  bankTransactionId: string
  invoiceId: string
  invoiceNumber: string
  amount: number
  method: string
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
      .select('id, invoice_number, status, base_price, discount, date_paid, service_address, clients ( name ), invoice_items ( price )')
      .neq('status', 'cancelled')
      .is('deleted_at', null)
      .not('is_test', 'is', true),
    supabase
      .from('expenses')
      .select('amount, expense_date'),
    // Live (un-reversed) allocations — the durable bank↔invoice link.
    supabase
      .from('invoice_payment_allocations')
      .select('id, bank_transaction_id, invoice_id, amount_allocated, method, reconciled_at, invoices ( invoice_number )')
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
    const items = (i.invoice_items ?? []) as { price: number }[]
    const addons = items.reduce((s, it) => s + (it.price ?? 0), 0)
    const client = (i.clients as unknown as { name: string } | null)?.name ?? ''
    return {
      id: i.id as string,
      invoiceNumber: (i.invoice_number as string | null) ?? '',
      status: (i.status as string | null) ?? 'draft',
      total: (i.base_price ?? 0) + addons - (i.discount ?? 0),
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

  return { transactions, meta, invoices, expenses }
}
