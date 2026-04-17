'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

interface ContractorInput {
  full_name: string
  email?: string
  phone?: string
  hourly_rate?: number
  status?: string
  notes?: string
}

export async function createContractor(input: ContractorInput) {
  const supabase = createClient()

  if (!input.full_name.trim()) {
    return { error: 'Full name is required.' }
  }

  const { data, error } = await supabase
    .from('contractors')
    .insert({
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      hourly_rate: input.hourly_rate ?? null,
      status: input.status || 'active',
      notes: input.notes?.trim() || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: `Failed to create contractor: ${error?.message}` }
  }

  redirect(`/portal/contractors/${data.id}`)
}

export async function updateContractor(id: string, input: ContractorInput) {
  const supabase = createClient()

  if (!input.full_name.trim()) {
    return { error: 'Full name is required.' }
  }

  const { error } = await supabase
    .from('contractors')
    .update({
      full_name: input.full_name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      hourly_rate: input.hourly_rate ?? null,
      status: input.status || 'active',
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)

  if (error) {
    return { error: `Failed to update contractor: ${error.message}` }
  }

  revalidatePath(`/portal/contractors/${id}`)
  revalidatePath('/portal/contractors')
  redirect(`/portal/contractors/${id}`)
}
