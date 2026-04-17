'use server'

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

interface ModuleInput {
  title: string
  category?: string
  description?: string
  content?: string
  status?: string
  requires_acknowledgement?: boolean
  requires_completion?: boolean
  sort_order?: number
}

export async function createModule(input: ModuleInput) {
  const supabase = createClient()
  if (!input.title?.trim()) return { error: 'Title is required.' }

  const { data, error } = await supabase
    .from('training_modules')
    .insert({
      title: input.title.trim(),
      category: input.category || 'other',
      description: input.description?.trim() || null,
      content: input.content?.trim() || null,
      status: input.status || 'active',
      requires_acknowledgement: input.requires_acknowledgement ?? false,
      requires_completion: input.requires_completion ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select('id')
    .single()

  if (error || !data) return { error: `Failed to create module: ${error?.message}` }
  redirect(`/portal/training/${data.id}`)
}

export async function updateModule(id: string, input: ModuleInput) {
  const supabase = createClient()
  if (!input.title?.trim()) return { error: 'Title is required.' }

  const { error } = await supabase
    .from('training_modules')
    .update({
      title: input.title.trim(),
      category: input.category || 'other',
      description: input.description?.trim() || null,
      content: input.content?.trim() || null,
      status: input.status || 'active',
      requires_acknowledgement: input.requires_acknowledgement ?? false,
      requires_completion: input.requires_completion ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .eq('id', id)

  if (error) return { error: `Failed to update: ${error.message}` }
  revalidatePath(`/portal/training/${id}`)
  revalidatePath('/portal/training')
  redirect(`/portal/training/${id}`)
}

export async function assignModuleToContractor(moduleId: string, contractorId: string, dueDate?: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('worker_training_assignments')
    .upsert({
      contractor_id: contractorId,
      training_module_id: moduleId,
      status: 'assigned',
      due_date: dueDate || null,
    }, { onConflict: 'contractor_id,training_module_id' })

  if (error) return { error: `Failed to assign: ${error.message}` }
  revalidatePath(`/portal/training/${moduleId}`)
  revalidatePath(`/portal/contractors/${contractorId}`)
  return { success: true }
}

export async function assignModuleToAll(moduleId: string, dueDate?: string) {
  const supabase = createClient()

  const { data: contractors } = await supabase
    .from('contractors')
    .select('id')
    .eq('status', 'active')

  if (!contractors?.length) return { error: 'No active contractors found.' }

  const rows = contractors.map((c) => ({
    contractor_id: c.id,
    training_module_id: moduleId,
    status: 'assigned' as const,
    due_date: dueDate || null,
  }))

  const { error } = await supabase
    .from('worker_training_assignments')
    .upsert(rows, { onConflict: 'contractor_id,training_module_id' })

  if (error) return { error: `Failed to assign: ${error.message}` }
  revalidatePath(`/portal/training/${moduleId}`)
  return { success: true }
}

export async function removeAssignment(assignmentId: string, moduleId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('worker_training_assignments')
    .delete()
    .eq('id', assignmentId)

  if (error) return { error: error.message }
  revalidatePath(`/portal/training/${moduleId}`)
  return { success: true }
}
