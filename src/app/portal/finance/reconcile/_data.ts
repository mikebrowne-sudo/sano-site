// Data access for stored bank transactions (ASB import, phase 2).

import { createClient } from '@/lib/supabase-server'
import { extractInvoiceRefs, type BankTxn } from '@/lib/asb-import'
import type { ReconInvoice, ReconExpense } from '@/lib/bank-reconcile'

export interface StoredTxnMeta {
  id: string
  cleared: boolean
}

export interface ReconcileData {
  transactions: BankTxn[]
  /** uniqueId → stored row id + cleared flag, for rendering controls. */
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

export async function getReconcileData(): Promise<ReconcileData> {
  const supabase = createClient()

  const [{ data: txnData }, { data: invoiceData }, { data: expenseData }] = await Promise.all([
    supabase
      .from('bank_transactions')
      .select('id, unique_id, txn_date, tran_type, payee, memo, amount, direction, cleared')
      .order('txn_date', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, base_price, discount, date_paid, invoice_items ( price )')
      .neq('status', 'cancelled')
      .is('deleted_at', null)
      .not('is_test', 'is', true),
    supabase
      .from('expenses')
      .select('amount, expense_date'),
  ])

  const meta = new Map<string, StoredTxnMeta>()
  const transactions: BankTxn[] = (txnData as TxnRow[] ?? []).map((r) => {
    const payee = r.payee ?? ''
    const memo = r.memo ?? ''
    meta.set(r.unique_id, { id: r.id, cleared: !!r.cleared })
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
    }
  })

  const invoices: ReconInvoice[] = (invoiceData ?? []).map((i) => {
    const items = (i.invoice_items ?? []) as { price: number }[]
    const addons = items.reduce((s, it) => s + (it.price ?? 0), 0)
    return {
      id: i.id as string,
      invoiceNumber: (i.invoice_number as string | null) ?? '',
      status: (i.status as string | null) ?? 'draft',
      total: (i.base_price ?? 0) + addons - (i.discount ?? 0),
      datePaid: (i.date_paid as string | null) ?? null,
    }
  })
  const expenses: ReconExpense[] = (expenseData ?? []).map((e) => ({
    amount: (e.amount as number | null) ?? 0,
    expenseDate: (e.expense_date as string | null) ?? null,
  }))

  return { transactions, meta, invoices, expenses }
}
