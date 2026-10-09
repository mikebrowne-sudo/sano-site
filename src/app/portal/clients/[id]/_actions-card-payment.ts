'use server'

// Customer-level "always show Pay now (card)" — applies to every invoice of
// this customer that has no per-invoice override (lib/card-payments). Unticking
// returns the customer to the default (cash-sale on, on-account off). Audited.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export async function setClientCardPayment(clientId: string, always: boolean): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: before } = await supabase.from('clients').select('allow_card_payment').eq('id', clientId).maybeSingle()
  if (!before) return { error: 'Customer not found.' }

  const value = always ? true : null
  const { error } = await supabase.from('clients').update({ allow_card_payment: value }).eq('id', clientId)
  if (error) return { error: error.message }

  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'staff',
    action: 'client.card_payment_toggled',
    entity_table: 'clients',
    entity_id: clientId,
    before: { allow_card_payment: before.allow_card_payment ?? null },
    after: { allow_card_payment: value },
  })

  revalidatePath(`/portal/clients/${clientId}`)
  return { ok: true }
}
