'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { parseAsbCsv } from '@/lib/asb-import'
import { reconcile, type ReconInvoice, type ReconExpense, type ReconResult } from '@/lib/bank-reconcile'

export interface ReconcileResponse {
  ok: boolean
  error?: string
  account?: string | null
  fromDate?: string | null
  toDate?: string | null
  skipped?: number
  result?: ReconResult
}

export async function reconcileUpload(csvText: string): Promise<ReconcileResponse> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { ok: false, error: 'Not authorised.' }

  if (!csvText || csvText.trim().length === 0) return { ok: false, error: 'The file was empty.' }

  const parsed = parseAsbCsv(csvText)
  if (parsed.transactions.length === 0) {
    return { ok: false, error: 'No transactions found — is this an ASB CSV export?' }
  }

  // Live invoices only (exclude archived + test), all non-cancelled statuses so
  // we can both reconcile paid ones and surface unpaid amount matches.
  const [{ data: invoiceData }, { data: expenseData }] = await Promise.all([
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

  const result = reconcile({ transactions: parsed.transactions, invoices, expenses })

  return {
    ok: true,
    account: parsed.account,
    fromDate: parsed.fromDate,
    toDate: parsed.toDate,
    skipped: parsed.skipped,
    result,
  }
}
