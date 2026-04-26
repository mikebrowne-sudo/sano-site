'use server'

// Phase 5.3 + 5.4 (locked) — Server actions for the contractor
// onboarding panel.
//
// Status model is 4-stage:
//   onboarding → ready → active   (linear, admin-gated)
// Trial is checked at activation (not at the ready transition).
//
// When the required checklist hits 100%:
//   - onboarding_status = 'complete'
//   - status            = 'ready'  (auto)
//   - ready_at          = now()
// Admin then clicks Mark ready to work / Activate Worker:
//   - status        = 'active'
//   - activated_at  = now()
//
// When require_admin_activation_approval = false AND trial passes
// (or not required), the recompute step skips the 'ready' pause and
// goes straight to 'active' in one transaction.
//
// Admin override: bypasses both gates with a required reason (audit
// logged separately). Implemented by adminOverrideActivate.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { checklistForWorkerType } from '@/lib/onboarding-checklist'
import {
  loadWorkforceSettings,
  requiredItemsForWorkerType,
} from '@/lib/workforce-settings'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any

async function writeAudit(
  supabase: SB,
  userId: string,
  contractorId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  action: string,
) {
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action,
    entity_table: 'contractors',
    entity_id: contractorId,
    before,
    after,
  })
}

interface RecomputeOptions {
  actorId?: string
}

async function recomputeOnboardingStatus(
  supabase: SB,
  contractorId: string,
  opts: RecomputeOptions = {},
): Promise<{ allRequiredComplete: boolean; nowReady: boolean; nowActive: boolean }> {
  const settings = await loadWorkforceSettings(supabase)

  const [{ data: c }, { data: itemsRaw }] = await Promise.all([
    supabase
      .from('contractors')
      .select('id, worker_type, status, onboarding_status, trial_required, trial_status')
      .eq('id', contractorId)
      .maybeSingle(),
    supabase
      .from('contractor_onboarding')
      .select('item_key, status')
      .eq('contractor_id', contractorId),
  ])
  if (!c) return { allRequiredComplete: false, nowReady: false, nowActive: false }
  const contractor = c as {
    worker_type: string
    status: string
    onboarding_status: string | null
    trial_required: boolean | null
    trial_status: string | null
  }
  const items = (itemsRaw ?? []) as { item_key: string; status: string }[]

  const required = new Set(requiredItemsForWorkerType(
    settings,
    (contractor.worker_type ?? 'contractor') as 'contractor' | 'employee',
  ))
  const requiredItems = items.filter((i) => required.has(i.item_key))
  const requiredComplete = requiredItems.filter((i) => i.status === 'complete').length
  const allRequiredComplete = requiredItems.length > 0
    && requiredComplete === requiredItems.length

  const nowIso = new Date().toISOString()
  let nowReady = false
  let nowActive = false

  if (allRequiredComplete) {
    const trialOk = !contractor.trial_required || contractor.trial_status === 'passed'
    const wasOnboarding = contractor.status === 'onboarding'

    const update: Record<string, unknown> = {
      onboarding_status: 'complete',
      onboarding_completed_at: nowIso,
    }
    if (wasOnboarding) {
      update.status = 'ready'
      update.ready_at = nowIso
      nowReady = true
    }
    if (!settings.require_admin_activation_approval && trialOk) {
      update.status = 'active'
      update.activated_at = nowIso
      nowActive = true
    }

    await supabase.from('contractors').update(update).eq('id', contractorId)

    if (contractor.onboarding_status !== 'complete' && opts.actorId) {
      await writeAudit(
        supabase, opts.actorId, contractorId,
        { onboarding_status: contractor.onboarding_status, status: contractor.status },
        {
          onboarding_status: 'complete',
          status: nowActive ? 'active' : (nowReady ? 'ready' : contractor.status),
          activation_pending: settings.require_admin_activation_approval || !trialOk,
        },
        'contractor.onboarding_completed',
      )
    }
    if (nowActive && opts.actorId) {
      await writeAudit(
        supabase, opts.actorId, contractorId,
        { status: 'ready' },
        { status: 'active', activated_at: nowIso, auto: true },
        'contractor.activated',
      )
    }
  } else {
    await supabase
      .from('contractors')
      .update({ onboarding_status: 'in_progress', onboarding_completed_at: null })
      .eq('id', contractorId)
  }

  return { allRequiredComplete, nowReady, nowActive }
}

export async function setOnboardingItemStatus(input: {
  itemId: string
  contractorId: string
  status: 'pending' | 'complete'
}): Promise<{ ok: true; allRequiredComplete: boolean } | { error: string }> {
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

  const { allRequiredComplete } = await recomputeOnboardingStatus(
    supabase, input.contractorId, { actorId: user.id },
  )

  revalidatePath(`/portal/contractors/${input.contractorId}`)
  revalidatePath('/portal/contractors')
  return { ok: true, allRequiredComplete }
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

  await recomputeOnboardingStatus(supabase, input.contractorId, { actorId: user.id })
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true, created: rows.length }
}

// ── Activation gate ──────────────────────────────────────────────

export async function markContractorActive(input: {
  contractorId: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: c } = await supabase
    .from('contractors')
    .select('id, status, onboarding_status, trial_required, trial_status, full_name')
    .eq('id', input.contractorId)
    .maybeSingle()
  if (!c) return { error: 'Contractor not found.' }
  const contractor = c as {
    id: string
    status: string
    onboarding_status: string | null
    trial_required: boolean | null
    trial_status: string | null
    full_name: string
  }

  if (contractor.status === 'active') {
    return { error: 'Contractor is already active.' }
  }
  if (contractor.onboarding_status !== 'complete') {
    return { error: 'Onboarding is not complete yet — finish all required checklist items first.' }
  }
  if (contractor.trial_required && contractor.trial_status !== 'passed') {
    return { error: 'Trial has not been marked passed yet — record the trial outcome first.' }
  }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('contractors')
    .update({ status: 'active', activated_at: nowIso })
    .eq('id', input.contractorId)
  if (error) return { error: error.message }

  await writeAudit(
    supabase, user.id, contractor.id,
    { status: contractor.status },
    { status: 'active', activated_at: nowIso },
    'contractor.activated',
  )

  revalidatePath(`/portal/contractors/${input.contractorId}`)
  revalidatePath('/portal/contractors')
  return { ok: true }
}

// Admin override — bypasses both onboarding completion and trial
// gates. Requires a non-empty reason; reason is captured in
// audit_log.after.reason for forensic traceability.
export async function adminOverrideActivate(input: {
  contractorId: string
  reason: string
}): Promise<{ ok: true } | { error: string }> {
  if (!input.reason.trim()) return { error: 'A reason is required for admin override.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== 'michael@sano.nz') {
    return { error: 'Admin only.' }
  }

  const { data: c } = await supabase
    .from('contractors')
    .select('id, status, onboarding_status, trial_required, trial_status, full_name')
    .eq('id', input.contractorId)
    .maybeSingle()
  if (!c) return { error: 'Contractor not found.' }
  const contractor = c as {
    id: string
    status: string
    onboarding_status: string | null
    trial_required: boolean | null
    trial_status: string | null
  }
  if (contractor.status === 'active') {
    return { error: 'Contractor is already active.' }
  }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('contractors')
    .update({ status: 'active', activated_at: nowIso })
    .eq('id', input.contractorId)
  if (error) return { error: error.message }

  await writeAudit(
    supabase, user.id, contractor.id,
    {
      status: contractor.status,
      onboarding_status: contractor.onboarding_status,
      trial_required: contractor.trial_required,
      trial_status: contractor.trial_status,
    },
    {
      status: 'active',
      activated_at: nowIso,
      reason: input.reason.trim(),
      bypassed_onboarding: contractor.onboarding_status !== 'complete',
      bypassed_trial: !!contractor.trial_required && contractor.trial_status !== 'passed',
    },
    'admin_override_activation',
  )

  revalidatePath(`/portal/contractors/${input.contractorId}`)
  revalidatePath('/portal/contractors')
  return { ok: true }
}

// ── Trial actions on the contractor record ──────────────────────

export async function setContractorTrialRequired(input: {
  contractorId: string
  trialRequired: boolean
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const update: Record<string, unknown> = { trial_required: input.trialRequired }
  if (input.trialRequired) {
    update.trial_status = 'not_started'
  } else {
    update.trial_status = 'not_required'
    update.trial_scheduled_for = null
  }

  const { error } = await supabase
    .from('contractors')
    .update(update)
    .eq('id', input.contractorId)
  if (error) return { error: error.message }

  await writeAudit(
    supabase, user.id, input.contractorId,
    {},
    { trial_required: input.trialRequired },
    'contractor.trial_required_changed',
  )
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}

export async function scheduleContractorTrial(input: {
  contractorId: string
  scheduledFor: string
}): Promise<{ ok: true } | { error: string }> {
  if (!input.scheduledFor) return { error: 'Trial date required.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const isoDate = new Date(input.scheduledFor).toISOString()
  const { error } = await supabase
    .from('contractors')
    .update({
      trial_scheduled_for: isoDate,
      trial_status: 'scheduled',
    })
    .eq('id', input.contractorId)
  if (error) return { error: error.message }

  await writeAudit(
    supabase, user.id, input.contractorId,
    {},
    { trial_scheduled_for: isoDate, trial_status: 'scheduled' },
    'contractor.trial_scheduled',
  )
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}

export async function recordContractorTrialOutcome(input: {
  contractorId: string
  outcome: 'passed' | 'failed'
  note?: string
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const note = input.note?.trim() || null
  const { error } = await supabase
    .from('contractors')
    .update({
      trial_status: input.outcome,
      trial_outcome_note: note,
    })
    .eq('id', input.contractorId)
  if (error) return { error: error.message }

  await writeAudit(
    supabase, user.id, input.contractorId,
    {},
    { trial_status: input.outcome, note },
    input.outcome === 'passed' ? 'contractor.trial_passed' : 'contractor.trial_failed',
  )
  revalidatePath(`/portal/contractors/${input.contractorId}`)
  return { ok: true }
}
