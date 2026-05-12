// Phase 5B — Invoice-existence lock for material quote/job amendments.
//
// Business rule:
//   Until an invoice exists on the chain (quote → job → invoice),
//   staff can freely amend material fields. Once an invoice exists,
//   material edits are blocked for normal staff. Admin can override
//   with an explicit `force: true` flag — every override is audit-
//   logged.
//
// One concept, one lock helper, one guard. The previous status-string
// gates (isQuoteLocked) stay exported but are now legacy — code should
// migrate to this module.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdminUser } from './is-admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

/** True when a linked invoice exists. Single rule, single signal. */
export function isLockedByInvoice(linkedInvoiceId: string | null | undefined): boolean {
  return !!linkedInvoiceId
}

// ── Resolve the locking invoice ─────────────────────────────────────

/**
 * Find any invoice that locks edits on the given quote. An invoice
 * locks a quote when either:
 *   - it has invoice.quote_id pointing at this quote, OR
 *   - it has invoice.job_id pointing at a job whose quote_id is this quote
 *
 * Returns the first matching invoice id or null. Used by every quote-
 * side write path before applying a material change.
 */
export async function findLockingInvoiceForQuote(
  supabase: SB,
  quoteId: string,
): Promise<string | null> {
  // Direct: an invoice was created with quote_id pointing at this quote.
  const { data: directInv } = await supabase
    .from('invoices')
    .select('id')
    .eq('quote_id', quoteId)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (directInv?.id) return directInv.id as string

  // Indirect: a job was created from this quote and that job has an
  // invoice. createInvoiceFromJob populates invoices.quote_id, so the
  // direct check above usually catches this — but a job created with
  // a custom invoice flow may have invoice_id without invoices.quote_id.
  const { data: jobWithInv } = await supabase
    .from('jobs')
    .select('invoice_id')
    .eq('quote_id', quoteId)
    .is('deleted_at', null)
    .not('invoice_id', 'is', null)
    .limit(1)
    .maybeSingle()
  return (jobWithInv?.invoice_id as string | null) ?? null
}

/**
 * Find the invoice locking edits on the given job. A job is locked
 * when jobs.invoice_id is set. Returns the invoice id or null.
 */
export async function findLockingInvoiceForJob(
  supabase: SB,
  jobId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('jobs')
    .select('invoice_id')
    .eq('id', jobId)
    .maybeSingle()
  return (data?.invoice_id as string | null) ?? null
}

// ── The guard ───────────────────────────────────────────────────────

export interface AmendmentGuardInput {
  /** The invoice that locks this record, or null/undefined if none. */
  linkedInvoiceId: string | null | undefined
  /** The acting user (from supabase.auth.getUser()). */
  user: { id?: string; email?: string | null } | null | undefined
  /** When true, the caller is explicitly requesting admin override.
   *  Only honoured when the user is admin. */
  force?: boolean
}

export type AmendmentGuardResult =
  | { ok: true; overridden: false }
  | { ok: true; overridden: true }
  | { error: string }

/**
 * Decide whether the caller may apply a material amendment.
 *
 * Three outcomes:
 *   - { ok: true, overridden: false }  → unlocked, normal write
 *   - { ok: true, overridden: true }   → locked but admin force=true → audit as override
 *   - { error }                        → locked and not overridden → reject the write
 *
 * Callers MUST honour `error` (return early) and SHOULD branch their
 * audit_log action verb on `overridden` so the timeline can flag
 * override edits visually.
 */
export function assertCanAmend(input: AmendmentGuardInput): AmendmentGuardResult {
  if (!isLockedByInvoice(input.linkedInvoiceId)) {
    return { ok: true, overridden: false }
  }
  if (input.force && isAdminUser(input.user ?? null)) {
    return { ok: true, overridden: true }
  }
  return {
    error: 'This record is locked because an invoice has been created. Admin override is required to amend.',
  }
}

// ── Audit helpers ───────────────────────────────────────────────────

/**
 * Action-verb suffix per audit row. The override variant lets the
 * timeline render a visual flag on locked-record amendments.
 */
export function amendmentAuditAction(entity: 'quote' | 'job', overridden: boolean): string {
  if (overridden) return `${entity}.amended_after_invoice`
  return `${entity}.amended`
}

export interface WriteAmendmentAuditInput {
  supabase: SB
  entity: 'quote' | 'job'
  entityId: string
  actorId: string | null
  overridden: boolean
  before: Record<string, unknown>
  after: Record<string, unknown>
}

/**
 * Write a single audit_log row for a material amendment. Safe to call
 * after the write succeeds; doesn't throw on audit failure (audit is
 * append-only history, not a transaction). Failures log to console
 * for ops visibility.
 */
export async function writeAmendmentAudit(input: WriteAmendmentAuditInput): Promise<void> {
  try {
    await input.supabase.from('audit_log').insert({
      actor_id: input.actorId,
      actor_role: input.overridden ? 'admin' : 'staff',
      action: amendmentAuditAction(input.entity, input.overridden),
      entity_table: input.entity === 'quote' ? 'quotes' : 'jobs',
      entity_id: input.entityId,
      before: input.before,
      after: input.after,
    })
  } catch (err) {
    console.warn('[amendment-lock] writeAmendmentAudit failed:', err)
  }
}
