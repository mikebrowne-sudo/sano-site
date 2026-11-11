// Loading invoices for a statement, with live balances (total less payments
// already allocated). Works with either the staff client or the service-role
// client (the public statement page).

import type { SupabaseClient } from '@supabase/supabase-js'
import { invoiceBalanceDue, invoiceTotalInclGst, loadAllocatedByInvoice, type InvoiceAmountFields } from './invoice-balance'
import { statementLineTitle, type StatementLine } from './statements'

const SELECT = 'id, invoice_number, status, date_issued, due_date, share_token, service_description, base_price, discount, gst_included, invoice_items ( price )'

/** Only these can be on a statement: unpaid and not cancelled/archived. */
export const STATEMENT_STATUSES = ['draft', 'sent'] as const

type Row = InvoiceAmountFields & {
  id: string
  invoice_number: string
  status: string
  date_issued: string | null
  due_date: string | null
  share_token: string
  service_description: string | null
}

async function toLines(supabase: SupabaseClient, rows: Row[]): Promise<StatementLine[]> {
  const allocated = await loadAllocatedByInvoice(supabase, rows.map((r) => r.id))
  return rows.map((r) => {
    const total = invoiceTotalInclGst(r)
    // Marked paid without a bank match (card, cash, marked by hand) owes nothing.
    const balance = r.status === 'paid' ? 0 : invoiceBalanceDue(r, allocated.get(r.id) ?? 0)
    return {
      invoiceId: r.id,
      invoiceNumber: r.invoice_number,
      status: r.status,
      title: statementLineTitle(r.service_description, 'Cleaning services'),
      dateIssued: r.date_issued,
      dueDate: r.due_date,
      total,
      paid: Math.round((total - balance) * 100) / 100,
      balance,
      shareToken: r.share_token,
    }
  })
}

const byDate = (a: StatementLine, b: StatementLine) =>
  (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.invoiceNumber.localeCompare(b.invoiceNumber)

/** Every invoice this client still owes money on (drafts included), oldest due first. */
export async function loadOutstandingStatementLines(supabase: SupabaseClient, clientId: string): Promise<StatementLine[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(SELECT)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .in('status', [...STATEMENT_STATUSES])
  if (error) throw new Error(error.message)
  const lines = await toLines(supabase, (data ?? []) as unknown as Row[])
  return lines.filter((l) => l.balance > 0).sort(byDate)
}

/** The invoices on a statement as they stand now (a paid one shows a $0 balance). */
export async function loadStatementLines(supabase: SupabaseClient, invoiceIds: string[]): Promise<StatementLine[]> {
  if (invoiceIds.length === 0) return []
  const { data, error } = await supabase
    .from('invoices')
    .select(SELECT)
    .in('id', invoiceIds)
    .is('deleted_at', null)
  if (error) throw new Error(error.message)
  return (await toLines(supabase, (data ?? []) as unknown as Row[])).sort(byDate)
}
