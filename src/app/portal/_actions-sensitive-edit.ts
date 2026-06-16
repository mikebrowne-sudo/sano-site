'use server'

// Stage 2 — the single audited writer for admin "full edit" changes
// across quotes / jobs / invoices / contractor invoices. Callers compute
// the milestone + the changed fields (via summariseChanges), then call
// this AFTER a successful update to record who/when/what/why + the
// before/after totals for financial changes. It also enforces the
// reason-required rule as a safety net. Admin/staff only.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import {
  entityTable,
  milestoneLabels,
  requiresReason,
  type SensitiveEntity,
  type Milestone,
  type FieldChange,
} from '@/lib/sensitive-edit'

export interface LogSensitiveEditInput {
  entity: SensitiveEntity
  entityId: string
  entityNumber?: string | null
  reason?: string | null
  milestone: Milestone
  changes: FieldChange[]
  beforeTotal?: number | null
  afterTotal?: number | null
}

export async function logSensitiveEdit(
  input: LogSensitiveEditInput,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.entityId) return { error: 'Missing record id.' }

  const reason = (input.reason ?? '').trim()
  if (requiresReason(input.milestone) && !reason) {
    return { error: 'A reason is required to edit a record that has been sent / accepted / completed / invoiced / paid / remitted.' }
  }

  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const c of input.changes) { before[c.field] = c.before; after[c.field] = c.after }

  const { error } = await supabase.from('audit_log').insert({
    actor_id: user!.id,
    actor_role: 'admin',
    action: `${input.entity}.amended`,
    entity_table: entityTable(input.entity),
    entity_id: input.entityId,
    before,
    after: {
      ...after,
      _reason: reason || null,
      _milestone: milestoneLabels(input.milestone),
      _entity_number: input.entityNumber ?? null,
      _before_total: input.beforeTotal ?? null,
      _after_total: input.afterTotal ?? null,
      _changed_fields: input.changes.map((c) => c.field),
    },
  })
  if (error) return { error: `Could not record the change: ${error.message}` }
  return { ok: true }
}
