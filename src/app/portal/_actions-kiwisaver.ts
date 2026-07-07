'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export async function upsertKiwiSaverOptOut(input: {
  personLabel?: string
  startDate?: string | null
  optOutFiled?: boolean
}): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const person = (input.personLabel || 'Carol').trim()
  const patch: Record<string, unknown> = { person_label: person, updated_at: new Date().toISOString() }
  if (input.startDate !== undefined) patch.start_date = input.startDate || null
  if (input.optOutFiled !== undefined) patch.opt_out_filed = input.optOutFiled

  const { error } = await supabase.from('kiwisaver_optout').upsert(patch, { onConflict: 'person_label' })
  if (error) return { error: `Couldn’t save: ${error.message}` }

  revalidatePath('/portal')
  return { ok: true }
}
