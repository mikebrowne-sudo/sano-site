'use server'

// Stage 2B — add a contact to an existing account from the quote form
// (or anywhere a quick-add is useful). Admin/staff only. Mirrors the
// contact insert already used by createClientWithSetup.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

export interface CreateContactInput {
  client_id: string
  full_name: string
  email?: string | null
  phone?: string | null
  contact_type?: 'primary' | 'accounts'
}

export interface NewContact {
  id: string
  client_id: string | null
  full_name: string | null
  contact_type: string | null
  email: string | null
  phone: string | null
}

export interface CreateContactResult {
  ok?: true
  contact?: NewContact
  error?: string
}

export async function createContact(input: CreateContactInput): Promise<CreateContactResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const clientId = input.client_id?.trim()
  const fullName = input.full_name?.trim()
  if (!clientId) return { error: 'Select an account first.' }
  if (!fullName) return { error: 'Contact name is required.' }

  const contactType = input.contact_type === 'accounts' ? 'accounts' : 'primary'

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      client_id: clientId,
      full_name: fullName,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      contact_type: contactType,
    })
    .select('id, client_id, full_name, contact_type, email, phone')
    .single()

  if (error || !data) {
    return { error: `Could not add contact: ${error?.message ?? 'no row returned'}` }
  }

  revalidatePath('/portal/clients')
  return { ok: true, contact: data as unknown as NewContact }
}
