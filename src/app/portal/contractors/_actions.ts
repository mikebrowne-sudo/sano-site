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
  worker_type?: string
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
      worker_type: input.worker_type || 'contractor',
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
      worker_type: input.worker_type || 'contractor',
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

export async function uploadDocument(formData: FormData) {
  const supabase = createClient()

  const contractorId = formData.get('contractor_id') as string
  const documentType = formData.get('document_type') as string
  const title = formData.get('title') as string
  const notes = formData.get('notes') as string
  const file = formData.get('file') as File

  if (!contractorId || !title?.trim() || !file) {
    return { error: 'Title and file are required.' }
  }

  // Upload to Supabase Storage
  const ext = file.name.split('.').pop() || 'bin'
  const filePath = `${contractorId}/${Date.now()}-${title.trim().replace(/\s+/g, '-').toLowerCase()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('worker-documents')
    .upload(filePath, file)

  if (uploadErr) {
    return { error: `Upload failed: ${uploadErr.message}` }
  }

  // Save metadata
  const { error: dbErr } = await supabase
    .from('worker_documents')
    .insert({
      contractor_id: contractorId,
      document_type: documentType || 'other',
      title: title.trim(),
      file_path: filePath,
      file_size: file.size,
      notes: notes?.trim() || null,
    })

  if (dbErr) {
    return { error: `Failed to save document record: ${dbErr.message}` }
  }

  revalidatePath(`/portal/contractors/${contractorId}`)
  return { success: true }
}

export async function deleteDocument(documentId: string, contractorId: string) {
  const supabase = createClient()

  // Get file path first
  const { data: doc } = await supabase
    .from('worker_documents')
    .select('file_path')
    .eq('id', documentId)
    .single()

  if (doc?.file_path) {
    await supabase.storage.from('worker-documents').remove([doc.file_path])
  }

  const { error } = await supabase
    .from('worker_documents')
    .delete()
    .eq('id', documentId)

  if (error) {
    return { error: `Failed to delete document: ${error.message}` }
  }

  revalidatePath(`/portal/contractors/${contractorId}`)
  return { success: true }
}
