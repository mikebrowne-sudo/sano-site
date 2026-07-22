// Recompute a statement's stored totals from its currently-linked payables.
// subtotal = total_payable = sum of line amounts (GST-inclusive); gst_total =
// sum of gst_amount for confirmed ('applied') lines only. Used after a line is
// removed from a draft (e.g. a payable is voided) so the stored total never
// drifts from what's actually linked.

import type { createClient } from './supabase-server'
import { GST_CONFIRMED_STATUS } from './contractor-statement-build'

type Supabase = ReturnType<typeof createClient>
const round2 = (n: number) => Math.round(n * 100) / 100

export async function recomputeStatementTotals(supabase: Supabase, statementId: string): Promise<void> {
  const { data: lines } = await supabase
    .from('contractor_invoices')
    .select('amount, gst_status, gst_amount')
    .eq('statement_id', statementId)
  const rows = lines ?? []
  const subtotal = round2(rows.reduce((s, l) => s + Number(l.amount), 0))
  const gstTotal = round2(
    rows.reduce((s, l) => (l.gst_status === GST_CONFIRMED_STATUS ? s + Number(l.gst_amount ?? 0) : s), 0),
  )
  await supabase
    .from('contractor_statements')
    .update({ subtotal, gst_total: gstTotal, total_payable: subtotal, updated_at: new Date().toISOString() })
    .eq('id', statementId)
}
