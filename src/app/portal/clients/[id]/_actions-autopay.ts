'use server'

// Automatic payments (NZ direct debit) — staff controls on the client page.
// The client saves their bank account on a Stripe page from the link created
// here; the Stripe webhook switches them to 'active'. Pause/resume only stops
// or restarts collection — the saved account and authority stay on file.

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { createAutopaySetupLink } from '@/lib/autopay'

export async function createClientAutopayLink(clientId: string): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
  const res = await createAutopaySetupLink(supabase, clientId, origin)
  if ('url' in res) {
    await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null, actor_role: 'staff', action: 'client.autopay_link_created',
      entity_table: 'clients', entity_id: clientId, before: null, after: {},
    })
  }
  return res
}

export async function setClientAutopayPaused(clientId: string, paused: boolean): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  const { data: c } = await supabase.from('clients').select('autopay_status, autopay_payment_method_id').eq('id', clientId).maybeSingle()
  if (!c?.autopay_payment_method_id) return { error: 'This customer has not set up automatic payments yet.' }
  const next = paused ? 'paused' : 'active'
  const { error } = await supabase.from('clients').update({ autopay_status: next }).eq('id', clientId)
  if (error) return { error: error.message }
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null, actor_role: 'staff', action: paused ? 'client.autopay_paused' : 'client.autopay_resumed',
    entity_table: 'clients', entity_id: clientId, before: { autopay_status: c.autopay_status }, after: { autopay_status: next },
  })
  revalidatePath(`/portal/clients/${clientId}`)
  return { ok: true }
}
