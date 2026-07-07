'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export async function createEmploymentAgreement(input: {
  personLabel: string
  position: string
  hourlyRate: number | null
  startDate: string | null
}): Promise<{ ok?: true; id?: string; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data, error } = await supabase
    .from('employment_agreements')
    .insert({
      person_label: input.personLabel?.trim() || 'Carol',
      position: input.position?.trim() || 'Cleaner (Casual)',
      hourly_rate: input.hourlyRate,
      start_date: input.startDate || null,
      status: 'draft',
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error || !data) return { error: `Couldn’t create: ${error?.message ?? 'no row'}` }

  revalidatePath('/portal/agreements')
  return { ok: true, id: data.id as string }
}

export async function deleteEmploymentAgreement(id: string): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  const { error } = await supabase.from('employment_agreements').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/portal/agreements')
  return { ok: true }
}
