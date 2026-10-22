// "Email history" for an invoice: every send (audit_log 'invoice.sent') and
// every payment reminder (invoice_reminders), oldest first.
//
// Sends were only recorded from 2026-10-23 (see invoice-send-log.ts). An
// invoice sent before then has no send row, so the history says so instead of
// implying it was never emailed.

import type { SupabaseClient } from '@supabase/supabase-js'
import { INVOICE_SENT_ACTION } from '@/lib/invoice-send-log'

export interface EmailHistoryEntry {
  kind: 'invoice' | 'reminder'
  at: string
  to: string
  cc: string[]
  /** "Sent" / "Auto-sent (recurring)" / "Reminder 1" … */
  label: string
}

interface SendRow { created_at: string; after: Record<string, unknown> | null }
interface ReminderRow { stage: number; sent_at: string; to_email: string; cc_emails: string[] | null }

export function buildEmailHistory(sends: SendRow[], reminders: ReminderRow[]): EmailHistoryEntry[] {
  const entries: EmailHistoryEntry[] = [
    ...sends.map((s): EmailHistoryEntry => {
      const a = s.after ?? {}
      return {
        kind: 'invoice',
        at: s.created_at,
        to: typeof a.to === 'string' ? a.to : '',
        cc: Array.isArray(a.cc) ? (a.cc as unknown[]).filter((x): x is string => typeof x === 'string') : [],
        label: a.source === 'recurring_auto' ? 'Invoice auto-sent (recurring)' : 'Invoice sent',
      }
    }),
    ...reminders.map((r): EmailHistoryEntry => ({
      kind: 'reminder',
      at: r.sent_at,
      to: r.to_email,
      cc: r.cc_emails ?? [],
      label: `Payment reminder ${r.stage}`,
    })),
  ]
  return entries.sort((x, y) => x.at.localeCompare(y.at))
}

/** Reads both sources; each fails soft to empty (finance logins can't read audit_log). */
export async function loadInvoiceEmailHistory(supabase: SupabaseClient, invoiceId: string): Promise<EmailHistoryEntry[]> {
  const [sends, reminders] = await Promise.all([
    supabase
      .from('audit_log')
      .select('created_at, after')
      .eq('entity_table', 'invoices')
      .eq('entity_id', invoiceId)
      .eq('action', INVOICE_SENT_ACTION)
      .order('created_at'),
    supabase
      .from('invoice_reminders')
      .select('stage, sent_at, to_email, cc_emails')
      .eq('invoice_id', invoiceId)
      .order('sent_at'),
  ])
  return buildEmailHistory(
    (sends.error ? [] : sends.data ?? []) as SendRow[],
    (reminders.error ? [] : reminders.data ?? []) as ReminderRow[],
  )
}
