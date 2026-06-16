'use server'

// Admin-edit Stage 3 — audited edit of NON-FINANCIAL invoice metadata.
//
// Strictly whitelisted: notes, service description/address, contact +
// accounts snapshot fields, client reference / PO flag, and the issue /
// due dates. It can NEVER touch totals, GST, base/override price, status,
// sent state, paid state, line items, or numbering. For a sent invoice a
// reason is required, and we explicitly do NOT resend or change sent_at /
// paid status. Admin/staff only; every change is audit-logged.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

const SENT_STATUSES = ['sent', 'paid', 'overdue']

export interface UpdateInvoiceDetailsInput {
  invoiceId: string
  notes?: string | null
  service_description?: string | null
  service_address?: string | null
  client_reference?: string | null
  requires_po?: boolean
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  accounts_contact_name?: string | null
  accounts_email?: string | null
  date_issued?: string | null
  due_date?: string | null
  reason?: string | null
}

// The ONLY columns this action may write. Anything financial / status /
// sent / paid / line-item is absent by construction.
const TEXT_FIELDS = [
  'notes', 'service_description', 'service_address', 'client_reference',
  'contact_name', 'contact_email', 'contact_phone',
  'accounts_contact_name', 'accounts_email',
  'date_issued', 'due_date',
] as const

export async function updateInvoiceDetails(
  input: UpdateInvoiceDetailsInput,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.invoiceId) return { error: 'Invoice is required.' }

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, notes, service_description, service_address, client_reference, requires_po, contact_name, contact_email, contact_phone, accounts_contact_name, accounts_email, date_issued, due_date')
    .eq('id', input.invoiceId)
    .maybeSingle()
  if (!inv) return { error: 'Invoice not found.' }

  const isSent = SENT_STATUSES.includes((inv.status as string | null) ?? '')
  const reason = (input.reason ?? '').trim()
  if (isSent && !reason) {
    return { error: 'This invoice has already been sent — a reason is required to edit it.' }
  }

  // Build the update from the whitelist only.
  const update: Record<string, unknown> = {}
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}

  const inputAsRecord = input as unknown as Record<string, unknown>
  for (const f of TEXT_FIELDS) {
    const provided = inputAsRecord[f]
    if (provided === undefined) continue
    const next = typeof provided === 'string' ? (provided.trim() || null) : (provided ?? null)
    if (next !== ((inv as Record<string, unknown>)[f] ?? null)) {
      update[f] = next
      before[f] = (inv as Record<string, unknown>)[f] ?? null
      after[f] = next
    }
  }
  if (input.requires_po !== undefined && input.requires_po !== (inv.requires_po ?? false)) {
    update.requires_po = input.requires_po
    before.requires_po = inv.requires_po ?? false
    after.requires_po = input.requires_po
  }

  if (Object.keys(update).length === 0) return { error: 'No changes to save.' }

  const { error } = await supabase.from('invoices').update(update).eq('id', input.invoiceId)
  if (error) return { error: `Could not save: ${error.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user!.id,
    actor_role: 'admin',
    action: 'invoice.details_amended',
    entity_table: 'invoices',
    entity_id: input.invoiceId,
    before,
    after: { ...after, _reason: reason || null, _was_sent: isSent, invoice_number: inv.invoice_number ?? null },
  })

  revalidatePath(`/portal/invoices/${input.invoiceId}`)
  revalidatePath('/portal/invoices')
  return { ok: true }
}
