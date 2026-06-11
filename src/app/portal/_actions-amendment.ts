'use server'

// Phase 5B+ — capture the admin's REASON when overriding the invoice-sent
// amendment lock. Writes a dedicated audit row at the approval gate (before
// the operator enters override mode), so the timeline records WHO overrode,
// WHEN, on WHAT, and WHY — separate from the subsequent amendment row that
// records the actual field changes.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'

export interface LogAmendmentOverrideInput {
  entity: 'quote' | 'job'
  entityId: string
  invoiceNumber?: string | null
  reason: string
}

export async function logAmendmentOverride(
  input: LogAmendmentOverrideInput,
): Promise<{ ok: true } | { error: string }> {
  const reason = (input.reason ?? '').trim()
  if (!reason) return { error: 'A reason is required to override.' }
  if (input.entity !== 'quote' && input.entity !== 'job') {
    return { error: 'Invalid record type.' }
  }
  if (!input.entityId) return { error: 'Missing record id.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) {
    return { error: 'Admin override is not permitted for this account.' }
  }

  const { error } = await supabase.from('audit_log').insert({
    actor_id: user!.id,
    actor_role: 'admin',
    action: `${input.entity}.override_initiated`,
    entity_table: input.entity === 'quote' ? 'quotes' : 'jobs',
    entity_id: input.entityId,
    before: null,
    after: {
      actor_email: user!.email,
      reason,
      invoice_number: input.invoiceNumber ?? null,
    },
  })
  if (error) return { error: `Could not record the override: ${error.message}` }
  return { ok: true }
}
