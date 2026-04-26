'use server'

// Phase 5.3 — Server actions for the contractor onboarding panel.
//
// Toggle a checklist item between 'pending' and 'complete'. When all
// items are complete, contractors.onboarding_status flips to
// 'complete' (and contractors.status flips to 'active'). Otherwise
// onboarding_status stays at 'in_progress'.
//
// Checklist items are created at conversion time via the seed in
// `startContractorOnboarding` (see lib/onboarding-checklist.ts).
// `seedContractorChecklist` is exposed here as a recovery action for
// contractor records that pre-date Phase 5.3 or that lost their
// checklist somehow.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { checklistForWorkerType } from '@/lib/onboarding-checklist'

async function recomputeOnboardingStatus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  contractorId: string,
): Promise<{ allComplete: boolean }> {
  const { count: pendingCount } = await supabase
    .from('contractor_onboarding')
    .select('id', { count: 'exact', head: true })
    .eq('contractor_id', contractorId)
    .eq('status', 'pending')
  const { count: totalCount } = await supabase
    .from('contractor_onboarding')
    .select('id', { count: 'exact', head: true })
    .eq('contractor_id', contractorId)

  const total = totalCount ?? 0
  const pending = pendingCount ?? 0
  const allComplete = total > 0 && pending === 0
  const someComplete = total > 0 && pending < total

  const nowIso = new Date().toISOString()
  if (allComplete) {
    await supabase
      .from('contractors')
      .update({
        onboarding_status: 'complete',
        onboarding_completed_at: nowIso,
        status: 'active',
      })
      .eq('id', contractorId)
  } else if (someComplete) {
    await supabase
      .from('contractors')
      .update({ onboarding_status: 'in_progress', onboarding_completed_at: null })
      .eq('id', contractorId)
  } else {
    // No items complete yet → stay in_progress (or not_started for
    // pre-existing rows). Don't downgrade an already-complete record
    // back if the admin un-ticks an item; treat that as in_progress.
    await supabase
      .from('contractors')
      .update({ onboarding_status: 'in_progress', onboarding_completed_at: null })
      .eq('id', contractorId)
  }

  return { allComplete }
}

export async function setOnboardingItemStatus(input: {
  itemId: string
  contractorId: string
  status: 'pending' | 'complete'
}): Promise<{ ok: true; allComplete: boolean } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const updates: Record<string, unknown> = { status: input.status }
  if (input.status === 'complete') {
    updates.completed_at = new Date().toISOString()
    updates.completed_by = user.id
  } else {
    updates.completed_at = null
    updates.completed_by = null
  }

  const { error } = await supabase
    .from('contractor_onboarding')
    .update(updates)
    .eq('id', input.itemId)
    .eq('contractor_id', input.contractorId)
  if (error) return { error: error.message }

  const { allComplete } = await recomputeOnboardingStatus(supabase, input.contractorId)

  revalidatePath(`/portal/contractors/${input.contractorId}`)
  revalidatePath('/portal/contractors')
  return { ok: true, allComplete }
}

export async function seedContractorChecklist(input: {
  contractorId: string
}): Promise<{ ok: true; created: number } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: row } = await supabase
    .from('contractors')
    .select('id, worker_type')
    .eq('id', input.contractorId)
    .maybeSingle()
  if (!row) return { error: 'Contractor not found.' }

  const wt = ((row as { worker_type?: string | null }).worker_type ?? 'contractor') as 'contractor' | 'employee'

  // Skip items that already exist (idempotent re-seed).
  const { data: existing } = await supabase
    .from('contractor_onboarding')
    .select('item_key')
    .eq('contractor_id', input.contractorId)
  const existingKeys = new Set(((existing ?? []) as { item_key: string }[]).map((r) => r.item_key))

  const rows = checklistForWorkerType(wt)
    .filter((it) => !existingKeys.has(it.item_key))
    .map((it) => ({
      contractor_id: input.contractorId,
      section: it.section,
      item_key: it.item_key,
      label: it.label,
      sort_order: it.sort_order,
      status: 'pending' as const,
    }))

  if (rows.length === 0) return { ok: true, created: 0 }

  const { error } = await supabase.from('contractor_onboarding').insert(rows)
  if (error) return { error: error.message }

  await recomputeOnboardingStatus(supabase, input.contractorId)
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true, created: rows.length }
}
