'use server'

// Phase 5.5.13 — operational lifecycle actions.
//
// Three transitions for quotes / jobs / invoices:
//   markAsTest  — flag is_test = true AND set archived_at (deleted_at)
//                 so the row drops out of every live view immediately.
//   archive     — set archived_at (deleted_at) only; is_test untouched.
//   restore     — clear archived_at; the caller decides whether to
//                 also clear is_test ("Restore as live" vs just unarchive).
//
// All actions are admin-gated and audit-logged. Operate either on a
// single id or a list of ids. Returning counts so the caller can show
// "3 quotes archived" feedback after bulk actions.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const ADMIN_EMAIL = 'michael@sano.nz'

export type LifecycleEntity = 'quote' | 'job' | 'invoice'

const ENTITY_TABLE: Record<LifecycleEntity, 'quotes' | 'jobs' | 'invoices'> = {
  quote: 'quotes',
  job: 'jobs',
  invoice: 'invoices',
}

const ENTITY_AUDIT_TABLE: Record<LifecycleEntity, string> = {
  quote: 'quotes',
  job: 'jobs',
  invoice: 'invoices',
}

const ENTITY_PATHS: Record<LifecycleEntity, string[]> = {
  quote:   ['/portal', '/portal/quotes'],
  job:     ['/portal', '/portal/jobs'],
  invoice: ['/portal', '/portal/invoices'],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any): Promise<{ user: { id: string } } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { user: { id: user.id } }
}

async function writeAudit(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  entityTable: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  action: string,
) {
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action,
    entity_table: entityTable,
    entity_id: entityId,
    before, after,
  })
}

function ids(idOrIds: string | string[]): string[] {
  return Array.isArray(idOrIds) ? idOrIds : [idOrIds]
}

// ── Mark as test ───────────────────────────────────────────────────

export async function markAsTest(
  entity: LifecycleEntity,
  idOrIds: string | string[],
): Promise<{ ok: true; count: number } | { error: string }> {
  const targets = ids(idOrIds)
  if (targets.length === 0) return { error: 'No records selected.' }

  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const nowIso = new Date().toISOString()
  const table = ENTITY_TABLE[entity]
  const auditAction = `${entity}.marked_test`

  const { data, error } = await supabase
    .from(table)
    .update({ is_test: true, deleted_at: nowIso, deleted_by: auth.user.id })
    .in('id', targets)
    .select('id')
  if (error) return { error: error.message }

  for (const row of data ?? []) {
    await writeAudit(supabase, auth.user.id, ENTITY_AUDIT_TABLE[entity], row.id as string,
      { is_test: false }, { is_test: true, archived_via: 'marked_test', archived_at: nowIso },
      auditAction,
    )
  }

  for (const p of ENTITY_PATHS[entity]) revalidatePath(p)
  return { ok: true, count: (data ?? []).length }
}

// ── Archive (soft) ─────────────────────────────────────────────────

export async function archiveRecords(
  entity: LifecycleEntity,
  idOrIds: string | string[],
): Promise<{ ok: true; count: number } | { error: string }> {
  const targets = ids(idOrIds)
  if (targets.length === 0) return { error: 'No records selected.' }

  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const nowIso = new Date().toISOString()
  const table = ENTITY_TABLE[entity]
  const auditAction = `${entity}.archived`

  const { data, error } = await supabase
    .from(table)
    .update({ deleted_at: nowIso, deleted_by: auth.user.id })
    .is('deleted_at', null)
    .in('id', targets)
    .select('id')
  if (error) return { error: error.message }

  for (const row of data ?? []) {
    await writeAudit(supabase, auth.user.id, ENTITY_AUDIT_TABLE[entity], row.id as string,
      { archived_at: null }, { archived_at: nowIso },
      auditAction,
    )
  }

  for (const p of ENTITY_PATHS[entity]) revalidatePath(p)
  return { ok: true, count: (data ?? []).length }
}

// ── Restore ────────────────────────────────────────────────────────
// `asLive: true` → clear is_test as well, so the record returns to
// live operational views even if it was test data. Default keeps the
// is_test flag intact (just unarchive).

export async function restoreRecords(
  entity: LifecycleEntity,
  idOrIds: string | string[],
  options: { asLive?: boolean } = {},
): Promise<{ ok: true; count: number } | { error: string }> {
  const targets = ids(idOrIds)
  if (targets.length === 0) return { error: 'No records selected.' }

  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const table = ENTITY_TABLE[entity]
  const asLive = !!options.asLive
  const auditAction = `${entity}.restored`

  const update: Record<string, unknown> = { deleted_at: null, deleted_by: null }
  if (asLive) update.is_test = false

  const { data, error } = await supabase
    .from(table)
    .update(update)
    .in('id', targets)
    .select('id')
  if (error) return { error: error.message }

  for (const row of data ?? []) {
    await writeAudit(supabase, auth.user.id, ENTITY_AUDIT_TABLE[entity], row.id as string,
      { archived: true }, { archived: false, as_live: asLive },
      auditAction,
    )
  }

  for (const p of ENTITY_PATHS[entity]) revalidatePath(p)
  return { ok: true, count: (data ?? []).length }
}
