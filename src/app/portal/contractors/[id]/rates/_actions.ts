'use server'

// Per-client pay-rate management for one worker.
//
// Rates are EFFECTIVE-DATED and SUPERSEDING: changing a rate closes the current
// row and inserts a new one, so what a past job paid stays explainable. Nothing
// here ever rewrites an existing job_workers.pay_rate snapshot — a rate change
// affects future assignments only. An already-assigned job is repriced solely
// through the explicit, audited setJobWorkerPayRate action.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { isAdminUser } from '@/lib/is-admin'
import { toPositiveRate } from '@/lib/contractor-rate-snapshot'

export interface RateActionResult {
  error?: string
  success?: string
}

/** Day before `iso`, for closing the superseded row. */
function dayBefore(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

export async function setClientRate(input: {
  contractorId: string
  clientId: string
  hourlyRate: string | number
  effectiveFrom: string
  note?: string | null
}): Promise<RateActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  if (!input.contractorId || !input.clientId) {
    return { error: 'Worker and client are both required.' }
  }

  const rate = toPositiveRate(input.hourlyRate)
  if (rate == null) return { error: 'Enter an hourly rate greater than zero.' }

  const effectiveFrom = (input.effectiveFrom || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return { error: 'Enter a valid effective-from date.' }
  }

  // The row currently in force for this worker+client, if any.
  const { data: currentRow } = await supabase
    .from('contractor_client_rates')
    .select('id, hourly_rate, effective_from')
    .eq('contractor_id', input.contractorId)
    .eq('client_id', input.clientId)
    .eq('status', 'active')
    .is('effective_to', null)
    .maybeSingle()

  if (currentRow) {
    if (effectiveFrom <= (currentRow.effective_from as string)) {
      return {
        error: `The current rate starts on ${currentRow.effective_from}. A replacement must start after that date.`,
      }
    }
    // Close the outgoing row rather than editing it — history stays intact.
    const { error: closeErr } = await supabase
      .from('contractor_client_rates')
      .update({ effective_to: dayBefore(effectiveFrom), status: 'superseded' })
      .eq('id', currentRow.id as string)
    if (closeErr) return { error: `Failed to close the current rate: ${closeErr.message}` }
  }

  const { data: inserted, error: insErr } = await supabase
    .from('contractor_client_rates')
    .insert({
      contractor_id: input.contractorId,
      client_id: input.clientId,
      hourly_rate: rate,
      effective_from: effectiveFrom,
      note: input.note?.trim() || null,
      supersedes_id: (currentRow?.id as string | null) ?? null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insErr) {
    return { error: `Failed to save the rate: ${insErr.message}` }
  }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: currentRow ? 'contractor_client_rate.changed' : 'contractor_client_rate.set',
    entity_table: 'contractor_client_rates',
    entity_id: inserted?.id as string,
    before: currentRow
      ? { hourly_rate: currentRow.hourly_rate, effective_from: currentRow.effective_from }
      : null,
    after: { hourly_rate: rate, effective_from: effectiveFrom, client_id: input.clientId },
  })

  revalidatePath(`/portal/contractors/${input.contractorId}/rates`)
  return { success: `Rate saved. It applies to jobs from ${effectiveFrom}.` }
}

export async function endClientRate(input: {
  contractorId: string
  rateId: string
  effectiveTo: string
}): Promise<RateActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const effectiveTo = (input.effectiveTo || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveTo)) {
    return { error: 'Enter a valid end date.' }
  }

  const { data: row } = await supabase
    .from('contractor_client_rates')
    .select('id, effective_from')
    .eq('id', input.rateId)
    .maybeSingle()
  if (!row) return { error: 'Rate not found.' }

  if (effectiveTo < (row.effective_from as string)) {
    return { error: `The end date cannot be before the start date (${row.effective_from}).` }
  }

  const { error } = await supabase
    .from('contractor_client_rates')
    .update({ effective_to: effectiveTo, status: 'superseded' })
    .eq('id', input.rateId)
  if (error) return { error: `Failed to end the rate: ${error.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'contractor_client_rate.ended',
    entity_table: 'contractor_client_rates',
    entity_id: input.rateId,
    before: null,
    after: { effective_to: effectiveTo },
  })

  revalidatePath(`/portal/contractors/${input.contractorId}/rates`)
  return { success: `Rate ended on ${effectiveTo}. Jobs after that date use the profile rate.` }
}
