'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

interface CIInput {
  contractor_id: string
  job_id?: string
  amount: number
  date_submitted: string
  notes?: string
  status?: string
}

export async function createContractorInvoice(input: CIInput) {
  const supabase = createClient()

  if (!input.contractor_id) return { error: 'Contractor is required.' }
  if (!input.amount || input.amount <= 0) return { error: 'Amount is required.' }

  const { data, error } = await supabase
    .from('contractor_invoices')
    .insert({
      contractor_id: input.contractor_id,
      job_id: input.job_id || null,
      amount: input.amount,
      date_submitted: input.date_submitted || new Date().toISOString().slice(0, 10),
      notes: input.notes?.trim() || null,
      status: input.status || 'pending',
    })
    .select('id')
    .single()

  if (error || !data) return { error: `Failed to create: ${error?.message}` }
  redirect(`/portal/contractor-invoices/${data.id}`)
}

export async function updateContractorInvoice(id: string, input: CIInput) {
  const supabase = createClient()

  const { error } = await supabase
    .from('contractor_invoices')
    .update({
      contractor_id: input.contractor_id,
      job_id: input.job_id || null,
      amount: input.amount,
      date_submitted: input.date_submitted,
      notes: input.notes?.trim() || null,
      status: input.status || 'pending',
    })
    .eq('id', id)

  if (error) return { error: `Failed to update: ${error.message}` }
  revalidatePath(`/portal/contractor-invoices/${id}`)
  revalidatePath('/portal/contractor-invoices')
  redirect(`/portal/contractor-invoices/${id}`)
}

export async function markContractorInvoicePaid(id: string) {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('contractor_invoices')
    .update({ status: 'paid', date_paid: today })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/portal/contractor-invoices/${id}`)
  revalidatePath('/portal/contractor-invoices')
  return { success: true }
}

export async function approveContractorInvoice(id: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('contractor_invoices')
    .update({ status: 'approved' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/portal/contractor-invoices/${id}`)
  revalidatePath('/portal/contractor-invoices')
  return { success: true }
}
