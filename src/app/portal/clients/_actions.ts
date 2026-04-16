'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

interface ClientInput {
  name: string
  company_name?: string
  email?: string
  phone?: string
  service_address?: string
  billing_address?: string
  billing_same_as_service: boolean
  notes?: string
}

export async function createClientAction(input: ClientInput) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: input.name,
      company_name: input.company_name || null,
      email: input.email || null,
      phone: input.phone || null,
      service_address: input.service_address || null,
      billing_address: input.billing_same_as_service ? null : (input.billing_address || null),
      billing_same_as_service: input.billing_same_as_service,
      notes: input.notes || null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: `Failed to create client: ${error?.message}` }
  }

  redirect(`/portal/clients/${data.id}`)
}

export async function updateClientAction(id: string, input: ClientInput) {
  const supabase = createClient()

  const { error } = await supabase
    .from('clients')
    .update({
      name: input.name,
      company_name: input.company_name || null,
      email: input.email || null,
      phone: input.phone || null,
      service_address: input.service_address || null,
      billing_address: input.billing_same_as_service ? null : (input.billing_address || null),
      billing_same_as_service: input.billing_same_as_service,
      notes: input.notes || null,
    })
    .eq('id', id)

  if (error) {
    return { error: `Failed to update client: ${error.message}` }
  }

  revalidatePath(`/portal/clients/${id}`)
  revalidatePath('/portal/clients')
  return { success: true }
}
