'use server'

// Per-invoice "Show Pay now" override. On-account invoices don't offer a card
// by default and cash-sale ones do (lib/card-payments); this lets staff switch
// it either way for one invoice. Audited.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export async function setInvoiceCardPayment(invoiceId: string, allow: boolean): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: before } = await supabase
    .from('invoices')
    .select('allow_card_payment')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!before) return { error: 'Invoice not found.' }

  const { error } = await supabase.from('invoices').update({ allow_card_payment: allow }).eq('id', invoiceId)
  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'staff',
    action: 'invoice.card_payment_toggled',
    entity_table: 'invoices',
    entity_id: invoiceId,
    before: { allow_card_payment: before.allow_card_payment ?? null },
    after: { allow_card_payment: allow },
  })

  revalidatePath(`/portal/invoices/${invoiceId}`)
  return { ok: true }
}
