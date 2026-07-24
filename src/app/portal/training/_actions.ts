'use server'

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
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
  version?: string
  document_url?: string
  document_label?: string
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
      version: input.version?.trim() || '1.0',
      document_url: input.document_url?.trim() || null,
      document_label: input.document_label?.trim() || null,
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
      version: input.version?.trim() || '1.0',
      document_url: input.document_url?.trim() || null,
      document_label: input.document_label?.trim() || null,
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
      assignment_source: 'manual_staff_assignment',
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
    assignment_source: 'manual_staff_assignment' as const,
  }))

  const { error } = await supabase
    .from('worker_training_assignments')
    .upsert(rows, { onConflict: 'contractor_id,training_module_id' })

  if (error) return { error: `Failed to assign: ${error.message}` }
  revalidatePath(`/portal/training/${moduleId}`)
  return { success: true }
}

/**
 * Explicitly require re-acknowledgement of a module (admin only). Flags workers
 * who acknowledged an OLDER version so they must read the updated content again.
 * Completions stay valid — this is an additive flag, so it never re-gates an
 * already-active worker (the induction sync only ever completes, never
 * un-completes). Workers already on the current version are not flagged.
 */
export async function requireModuleReacknowledgement(moduleId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { data: mod } = await supabase.from('training_modules').select('version').eq('id', moduleId).maybeSingle()
  const currentVersion = (mod as { version?: string | null } | null)?.version ?? null

  const { data: acked } = await supabase
    .from('worker_training_assignments')
    .select('id, acknowledged_version')
    .eq('training_module_id', moduleId)
    .not('acknowledged_at', 'is', null)
  const toFlag = ((acked ?? []) as { id: string; acknowledged_version: string | null }[])
    .filter((a) => (a.acknowledged_version ?? null) !== currentVersion)
    .map((a) => a.id)

  if (toFlag.length) {
    const { error } = await supabase
      .from('worker_training_assignments')
      .update({ reacknowledgement_required: true })
      .in('id', toFlag)
    if (error) return { error: error.message }
  }
  revalidatePath(`/portal/training/${moduleId}`)
  return { success: true, flagged: toFlag.length }
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
