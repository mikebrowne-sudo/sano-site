// Shared loader for the cash-basis P&L inputs. Every surface that builds a
// P&L (statement page, P&L CSV, dashboard series, accountant pack) loads
// through here so they can never disagree on what counts as income or cost.
//
//   • income       — paid, non-deleted, non-test invoices at the GST-inclusive
//                    amount received (computeDocumentTotals, same as the PDF)
//   • expenses     — the Expenses table
//   • remittances  — contractor remittances with a payment date; amount = the
//                    sum of their frozen items (same as the reconcile screen)
//
// Optional window bounds the queries. Expenses + remittances are padded by
// REMITTANCE_MATCH_DAYS so duplicate matching still works across the edge.

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeDocumentTotals } from '@/lib/doc-totals'
import {
  REMITTANCE_MATCH_DAYS,
  type PLExpenseRow,
  type PLIncomeRow,
  type PLRemittanceRow,
} from './profit-loss'

export interface ProfitLossInputs {
  income: PLIncomeRow[]
  expenses: PLExpenseRow[]
  remittances: PLRemittanceRow[]
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** GST-inclusive invoice total from the stored line fields. */
export function invoiceInclusiveTotal(i: {
  base_price?: number | null
  discount?: number | null
  gst_included?: boolean | null
  invoice_items?: Array<{ price: number | null }> | null
}): number {
  const items = (i.invoice_items ?? []).reduce((s, it) => s + Number(it.price ?? 0), 0)
  const lineTotal = Number(i.base_price ?? 0) + items - Number(i.discount ?? 0)
  return Math.round(computeDocumentTotals(lineTotal, !!i.gst_included).total * 100) / 100
}

export async function loadProfitLossInputs(
  supabase: SupabaseClient,
  window?: { from: string; to: string },
): Promise<ProfitLossInputs> {
  let invQ = supabase
    .from('invoices')
    .select('base_price, discount, gst_included, date_paid, invoice_items ( price )')
    .eq('status', 'paid')
    .is('deleted_at', null)
    .not('is_test', 'is', true)
  let expQ = supabase.from('expenses').select('amount, category, expense_date')
  let remQ = supabase
    .from('contractor_remittances')
    .select('payment_date, contractor_remittance_items ( amount )')
    .not('payment_date', 'is', null)

  if (window) {
    const padFrom = shiftDays(window.from, -REMITTANCE_MATCH_DAYS)
    const padTo = shiftDays(window.to, REMITTANCE_MATCH_DAYS)
    invQ = invQ.gte('date_paid', window.from).lte('date_paid', window.to)
    expQ = expQ.gte('expense_date', padFrom).lte('expense_date', padTo)
    remQ = remQ.gte('payment_date', padFrom).lte('payment_date', padTo)
  }

  const [{ data: inv }, { data: exp }, { data: rem }] = await Promise.all([invQ, expQ, remQ])

  const income: PLIncomeRow[] = ((inv ?? []) as Array<Record<string, unknown>>).map((i) => ({
    total: invoiceInclusiveTotal(i as Parameters<typeof invoiceInclusiveTotal>[0]),
    datePaid: (i.date_paid as string | null) ?? null,
  }))
  const expenses: PLExpenseRow[] = ((exp ?? []) as Array<Record<string, unknown>>).map((e) => ({
    amount: Number(e.amount ?? 0),
    category: (e.category as string | null) ?? null,
    expenseDate: (e.expense_date as string | null) ?? null,
  }))
  const remittances: PLRemittanceRow[] = ((rem ?? []) as Array<Record<string, unknown>>).map((r) => {
    const items = (r.contractor_remittance_items ?? []) as Array<{ amount: number | null }>
    return {
      amount: Math.round(items.reduce((s, it) => s + Number(it.amount ?? 0), 0) * 100) / 100,
      paymentDate: (r.payment_date as string | null) ?? null,
    }
  })

  return { income, expenses, remittances }
}
