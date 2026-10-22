// Permanent record of every invoice email that leaves Sano.
//
// Resend only keeps its logs for 30 days, so "when did this customer get the
// invoice, and at what address?" became unanswerable after a month. Each
// successful send writes one audit_log row (action 'invoice.sent') with the
// recipient, CCs and Resend's message id. The invoice page reads these back
// as its "Email history".
//
// Best-effort by design: the email has already gone out when this runs, so a
// logging failure is reported to the server log and never surfaces as
// "not sent".

import type { SupabaseClient } from '@supabase/supabase-js'

export const INVOICE_SENT_ACTION = 'invoice.sent'

export interface InvoiceSentLog {
  invoiceId: string
  invoiceNumber: string
  to: string
  cc?: string[]
  subject: string
  /** Resend's id for the message — lets a delivery be traced in Resend while it still has it. */
  resendId: string | null
  /** 'manual' = staff clicked Send; 'recurring_auto' = the recurring-contract cron. */
  source: 'manual' | 'recurring_auto'
  actorId: string | null
}

export async function logInvoiceSent(supabase: SupabaseClient, log: InvoiceSentLog): Promise<void> {
  try {
    const { error } = await supabase.from('audit_log').insert({
      actor_id: log.actorId,
      actor_role: log.actorId ? 'staff' : 'system',
      action: INVOICE_SENT_ACTION,
      entity_table: 'invoices',
      entity_id: log.invoiceId,
      before: null,
      after: {
        invoice_number: log.invoiceNumber,
        to: log.to,
        cc: log.cc && log.cc.length > 0 ? log.cc : [],
        subject: log.subject,
        resend_id: log.resendId,
        source: log.source,
      },
    })
    if (error) console.error('[invoice-send-log] sent but not logged:', error.message)
  } catch (e) {
    console.error('[invoice-send-log] sent but not logged:', e)
  }
}
