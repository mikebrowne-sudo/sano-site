// Contractor training data loader — shared by the live training page
// and the staff preview.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface TrainingItem {
  id: string
  status: string
  dueDate: string | null
  title: string
  category: string
  description: string | null
  isOverdue: boolean
}

export async function loadContractorTraining(
  supabase: SupabaseClient,
  contractorId: string,
): Promise<TrainingItem[]> {
  const { data } = await supabase
    .from('worker_training_assignments')
    .select('id, status, due_date, completed_at, acknowledged_at, training_modules ( id, title, category, description )')
    .eq('contractor_id', contractorId)
    .order('status')

  const today = new Date().toISOString().slice(0, 10)
  return (data ?? []).map((a) => {
    const mod = a.training_modules as unknown as { title: string; category: string; description: string | null } | null
    return {
      id: a.id as string,
      status: (a.status as string) ?? 'assigned',
      dueDate: (a.due_date as string | null) ?? null,
      title: mod?.title ?? '—',
      category: mod?.category ?? 'other',
      description: mod?.description ?? null,
      isOverdue: a.status !== 'completed' && !!a.due_date && (a.due_date as string) < today,
    }
  })
}
