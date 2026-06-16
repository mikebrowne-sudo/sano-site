'use server'

// Admin Full Edit Mode — Stage 3. Audited admin edit of invoice
// financials: base price, add-on line items (label + amount, add / edit /
// remove), discount, and the GST-inclusive flag. The total is always the
// canonical base + line items − discount (calculateInvoiceTotal) — there
// is no hand-typed total that can disagree with the lines, because the
// base price is directly editable.
//
// A reason is required once the invoice has been sent or paid. Saving NEVER
// resends, never changes status / sent_at / paid state, never creates a
// credit note, and never touches numbering or remittance/contractor data.
// Admin/staff only; the change is audited via logSensitiveEdit (#246).

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { calculateInvoiceTotal } from '@/lib/invoice-total'
import { summariseChanges, type FieldChange } from '@/lib/sensitive-edit'
import { logSensitiveEdit } from '@/app/portal/_actions-sensitive-edit'
import { revalidatePath } from 'next/cache'

const SENT_STATUSES = ['sent', 'paid', 'overdue']

export interface InvoiceLineInput {
  label: string
  price: number
}

export interface UpdateInvoiceFinancialsInput {
  invoiceId: string
  base_price: number
  discount: number
  gst_included: boolean
  items: InvoiceLineInput[]
  reason?: string | null
}

export async function updateInvoiceFinancials(
  input: UpdateInvoiceFinancialsInput,
): Promise<{ ok: true; total: number } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.invoiceId) return { error: 'Invoice is required.' }

  if (!(input.base_price >= 0)) return { error: 'Base price must be zero or more.' }
  if (!(input.discount >= 0)) return { error: 'Discount must be zero or more.' }

  const { data: inv } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, base_price, discount, gst_included')
    .eq('id', input.invoiceId)
    .maybeSingle()
  if (!inv) return { error: 'Invoice not found.' }

  const { data: currentItemsRaw } = await supabase
    .from('invoice_items')
    .select('label, price, sort_order')
    .eq('invoice_id', input.invoiceId)
    .order('sort_order')
  const currentItems = (currentItemsRaw ?? []) as Array<{ label: string | null; price: number | null }>

  const status = (inv.status as string | null) ?? ''
  const isSent = SENT_STATUSES.includes(status)
  const isPaid = status === 'paid'
  const reason = (input.reason ?? '').trim()
  if ((isSent || isPaid) && !reason) {
    return { error: 'This invoice has been sent — a reason is required to edit its amounts.' }
  }

  // Normalise the submitted lines (drop blank labels; keep finite prices —
  // negative is allowed for a correction/credit line).
  const newItems = (input.items ?? [])
    .map((i) => ({ label: (i.label ?? '').trim(), price: Number(i.price) }))
    .filter((i) => i.label && Number.isFinite(i.price))

  const oldTotal = calculateInvoiceTotal({ base_price: inv.base_price as number | null, discount: inv.discount as number | null }, currentItems)
  const newTotal = calculateInvoiceTotal({ base_price: input.base_price, discount: input.discount }, newItems)

  const financialChanges = summariseChanges(
    { base_price: (inv.base_price as number | null) ?? null, discount: (inv.discount as number | null) ?? null, gst_included: (inv.gst_included as boolean | null) ?? null },
    { base_price: input.base_price, discount: input.discount, gst_included: input.gst_included },
    ['base_price', 'discount', 'gst_included'],
  )
  const itemsBefore = currentItems.map((i) => `${i.label ?? ''}: ${i.price ?? 0}`)
  const itemsAfter = newItems.map((i) => `${i.label}: ${i.price}`)
  const itemsChanged = JSON.stringify(itemsBefore) !== JSON.stringify(itemsAfter)

  if (financialChanges.length === 0 && !itemsChanged) {
    return { error: 'No changes to save.' }
  }

  // Apply invoice financial fields — never status / sent / paid / numbering.
  const { error: invErr } = await supabase
    .from('invoices')
    .update({ base_price: input.base_price, discount: input.discount, gst_included: input.gst_included })
    .eq('id', input.invoiceId)
  if (invErr) return { error: `Could not save invoice: ${invErr.message}` }

  // Reconcile line items: replace the set (the table has no inbound FKs).
  if (itemsChanged) {
    await supabase.from('invoice_items').delete().eq('invoice_id', input.invoiceId)
    if (newItems.length > 0) {
      await supabase.from('invoice_items').insert(
        newItems.map((i, idx) => ({ invoice_id: input.invoiceId, label: i.label, price: i.price, sort_order: idx })),
      )
    }
  }

  const changes: FieldChange[] = [...financialChanges]
  if (itemsChanged) changes.push({ field: 'line_items', before: itemsBefore, after: itemsAfter })

  await logSensitiveEdit({
    entity: 'invoice',
    entityId: input.invoiceId,
    entityNumber: (inv.invoice_number as string | null) ?? null,
    reason: reason || null,
    milestone: { sent: isSent, paid: isPaid },
    changes,
    beforeTotal: oldTotal,
    afterTotal: newTotal,
  })

  revalidatePath(`/portal/invoices/${input.invoiceId}`)
  revalidatePath('/portal/invoices')
  return { ok: true, total: newTotal }
}
