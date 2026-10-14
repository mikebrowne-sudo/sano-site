// Overdue invoices that can be chased, with everything the bulk "Send
// reminders" needs per invoice: who it goes to, the greeting, the balance and
// where it sits on the 3 / 10 / 21-day schedule. One source for the Alerts
// list AND the send action (which re-loads, so nothing stale is trusted).
//
// Recipient + greeting follow the single-invoice reminder exactly:
//   to       = invoice accounts email → client accounts email → invoice contact → client email
//   greeting = linked contact → invoice contact → accounts contact → "Hi there,"

import type { SupabaseClient } from '@supabase/supabase-js'
import { invoiceBalanceDue, loadAllocatedByInvoice, type InvoiceAmountFields } from './invoice-balance'
import { daysOverdue, reminderStatus, nextReminderStage, type ReminderStage, type ReminderStatus } from './invoice-reminders'
import { resolveGreeting } from './email-greeting'
import { clientCardSetting, invoiceOffersCard } from './card-payments'
import { canTakeRealPayments } from './stripe'

export interface ReminderCandidate {
  invoiceId: string
  invoiceNumber: string
  clientName: string
  to: string
  greeting: string
  amountDue: number
  dueDate: string | null
  daysOverdue: number
  sentCount: number
  /** Stage the next reminder would be. */
  stage: ReminderStage
  status: ReminderStatus
  cardAvailable: boolean
  clientReference: string | null
  shareToken: string
}

type Row = InvoiceAmountFields & {
  id: string
  invoice_number: string
  due_date: string | null
  share_token: string
  client_reference: string | null
  payment_type: string | null
  allow_card_payment: boolean | null
  contact_id: string | null
  contact_name: string | null
  contact_email: string | null
  accounts_contact_name: string | null
  accounts_email: string | null
  clients: { name: string | null; email: string | null; accounts_email: string | null; allow_card_payment: boolean | null } | null
}

export async function loadReminderCandidates(
  supabase: SupabaseClient,
  today: string,
  onlyIds?: string[],
): Promise<ReminderCandidate[]> {
  let q = supabase
    .from('invoices')
    .select(`
      id, invoice_number, due_date, share_token, client_reference, payment_type, allow_card_payment,
      base_price, discount, gst_included, invoice_items ( price ),
      contact_id, contact_name, contact_email, accounts_contact_name, accounts_email,
      clients ( name, email, accounts_email, allow_card_payment )
    `)
    .is('deleted_at', null)
    .eq('status', 'sent')
    .lt('due_date', today)
    .order('due_date', { ascending: true })
  if (onlyIds) q = q.in('id', onlyIds.length ? onlyIds : ['00000000-0000-0000-0000-000000000000'])
  const { data } = await q
  const rows = (data ?? []) as unknown as Row[]
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  const contactIds = Array.from(new Set(rows.map((r) => r.contact_id).filter((x): x is string => !!x)))
  const [allocated, { data: reminderRows }, { data: contacts }] = await Promise.all([
    loadAllocatedByInvoice(supabase, ids),
    supabase.from('invoice_reminders').select('invoice_id').in('invoice_id', ids),
    contactIds.length
      ? supabase.from('contacts').select('id, full_name').in('id', contactIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])
  // Being collected by direct debit right now: don't chase it. Read on its own
  // and ignored if the autopay columns aren't there yet (hand-run migration).
  const { data: debiting, error: debitErr } = await supabase.from('invoices').select('id').in('id', ids).eq('autopay_status', 'processing')
  const beingDebited = new Set(debitErr ? [] : ((debiting ?? []) as { id: string }[]).map((r) => r.id))

  const sent = new Map<string, number>()
  for (const r of (reminderRows ?? []) as { invoice_id: string }[]) sent.set(r.invoice_id, (sent.get(r.invoice_id) ?? 0) + 1)
  const contactName = new Map(((contacts ?? []) as { id: string; full_name: string | null }[]).map((c) => [c.id, c.full_name]))
  const liveCard = canTakeRealPayments()

  const out: ReminderCandidate[] = []
  for (const r of rows) {
    if (beingDebited.has(r.id)) continue
    const amountDue = invoiceBalanceDue(r, allocated.get(r.id) ?? 0)
    if (amountDue <= 0) continue
    const client = Array.isArray(r.clients) ? (r.clients[0] ?? null) : r.clients
    const days = Math.max(0, daysOverdue(r.due_date, today))
    const count = sent.get(r.id) ?? 0
    out.push({
      invoiceId: r.id,
      invoiceNumber: r.invoice_number,
      clientName: client?.name ?? '—',
      to: (r.accounts_email || client?.accounts_email || r.contact_email || client?.email || '').trim(),
      greeting: resolveGreeting(
        [r.contact_id ? contactName.get(r.contact_id) : null, r.contact_name, r.accounts_contact_name],
        client?.name ?? null,
      ),
      amountDue,
      dueDate: r.due_date,
      daysOverdue: days,
      sentCount: count,
      stage: nextReminderStage(count),
      status: reminderStatus(days, count),
      cardAvailable: liveCard && invoiceOffersCard({ ...r, client_allow_card_payment: clientCardSetting(client) }),
      clientReference: r.client_reference,
      shareToken: r.share_token,
    })
  }
  return out
}
