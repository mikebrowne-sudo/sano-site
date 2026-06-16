'use server'

// Account contacts — create / update. Used by the quote quick-add
// (Stage 2B) and the account-page Contacts section. Admin/staff only.
// Mirrors the contact insert used by createClientWithSetup.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'

const CONTACT_COLS = 'id, client_id, full_name, contact_type, email, phone, notes'

export interface CreateContactInput {
  client_id: string
  full_name: string
  email?: string | null
  phone?: string | null
  contact_type?: 'primary' | 'accounts'
  notes?: string | null
}

export interface UpdateContactInput {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  contact_type?: 'primary' | 'accounts'
  notes?: string | null
}

export interface AccountContact {
  id: string
  client_id: string | null
  full_name: string | null
  contact_type: string | null
  email: string | null
  phone: string | null
  notes: string | null
}

// Kept for the existing quote quick-add import.
export type NewContact = AccountContact

export interface ContactResult {
  ok?: true
  contact?: AccountContact
  error?: string
}

function normType(t?: string): 'primary' | 'accounts' {
  return t === 'accounts' ? 'accounts' : 'primary'
}

export async function createContact(input: CreateContactInput): Promise<ContactResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const clientId = input.client_id?.trim()
  const fullName = input.full_name?.trim()
  if (!clientId) return { error: 'Select an account first.' }
  if (!fullName) return { error: 'Contact name is required.' }

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      client_id: clientId,
      full_name: fullName,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      contact_type: normType(input.contact_type),
      notes: input.notes?.trim() || null,
    })
    .select(CONTACT_COLS)
    .single()

  if (error || !data) {
    return { error: `Could not add contact: ${error?.message ?? 'no row returned'}` }
  }

  revalidatePath('/portal/clients')
  if (data.client_id) revalidatePath(`/portal/clients/${data.client_id}`)
  return { ok: true, contact: data as unknown as AccountContact }
}

export async function updateContact(input: UpdateContactInput): Promise<ContactResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const id = input.id?.trim()
  const fullName = input.full_name?.trim()
  if (!id) return { error: 'Contact id is required.' }
  if (!fullName) return { error: 'Contact name is required.' }

  // Only the contact's own fields change — client_id is never touched, so
  // the contact stays under the same account.
  const { data, error } = await supabase
    .from('contacts')
    .update({
      full_name: fullName,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      contact_type: normType(input.contact_type),
      notes: input.notes?.trim() || null,
    })
    .eq('id', id)
    .select(CONTACT_COLS)
    .single()

  if (error || !data) {
    return { error: `Could not update contact: ${error?.message ?? 'no row returned'}` }
  }

  revalidatePath('/portal/clients')
  if (data.client_id) revalidatePath(`/portal/clients/${data.client_id}`)
  return { ok: true, contact: data as unknown as AccountContact }
}
