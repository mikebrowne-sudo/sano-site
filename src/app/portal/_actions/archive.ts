'use server'

// Phase 6 — admin-only soft-delete (archive) and restore actions for
// quotes and invoices. Replaces the hard-delete paths in
// _actions/delete-record.ts for these two entities. Per spec decision:
// admin can archive ANY status; we surface a strong warning client-side
// for accepted/converted quotes and any invoice with linked rows, but
// the server still allows it.
//
// Both archive and restore:
//   • take a record_snapshots row before mutating
//   • write an audit_log entry
//   • are idempotent (archiving an already-archived row succeeds silently;
//     restoring a non-archived row is a no-op success)

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const ADMIN_EMAIL = 'michael@sano.nz'

// ─── Quotes ───────────────────────────────────────────────────────

export interface ArchiveQuoteInput {
  quote_id: string
  /** Acknowledgement that the operator has seen the linked-records
   *  warning (invoices/jobs that point to this quote). Required when
   *  links exist; ignored otherwise. */
  confirm_linked?: boolean
}

export type ArchiveQuoteResult =
  | { ok: true }
  | {
      error: string
      reason?:
        | 'not_authenticated'
        | 'not_admin'
        | 'not_found'
        | 'linked_records'
      linked?: { invoice_ids: string[]; job_ids: string[] }
    }

export async function archiveQuote(input: ArchiveQuoteInput): Promise<ArchiveQuoteResult> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', reason: 'not_authenticated' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Only admin can archive quotes.', reason: 'not_admin' }
  if (!input.quote_id) return { error: 'quote_id is required.' }

  const { data: current, error: curErr } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', input.quote_id)
    .single()
  if (curErr || !current) return { error: 'Quote not found.', reason: 'not_found' }

  if (current.deleted_at != null) return { ok: true } // idempotent

  // Linked-records check.
  const [invoicesRes, jobsRes] = await Promise.all([
    supabase.from('invoices').select('id').eq('quote_id', input.quote_id).is('deleted_at', null),
    supabase.from('jobs').select('id').eq('quote_id', input.quote_id),
  ])
  const invoice_ids = (invoicesRes.data ?? []).map((r) => r.id)
  const job_ids = (jobsRes.data ?? []).map((r) => r.id)
  const hasLinked = invoice_ids.length > 0 || job_ids.length > 0

  if (hasLinked && !input.confirm_linked) {
    return {
      error: `Quote is linked to ${invoice_ids.length} invoice(s) and ${job_ids.length} job(s). Re-submit with confirm_linked=true to archive anyway.`,
      reason: 'linked_records',
      linked: { invoice_ids, job_ids },
    }
  }

  // Snapshot the row first so the archive is fully reversible.
  await supabase.from('record_snapshots').insert({
    entity_table: 'quotes',
    entity_id: input.quote_id,
    reason: 'quote.archived',
    snapshot: current as unknown as Record<string, unknown>,
    created_by: user.id,
  })

  // Apply the archive.
  const now = new Date().toISOString()
  const { error: delErr } = await supabase
    .from('quotes')
    .update({ deleted_at: now, deleted_by: user.id })
    .eq('id', input.quote_id)
    .is('deleted_at', null) // race guard
  if (delErr) return { error: `Failed to archive: ${delErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'quote.archived',
    entity_table: 'quotes',
    entity_id: input.quote_id,
    before: { deleted_at: null, deleted_by: null, status: current.status },
    after: {
      deleted_at: now,
      deleted_by: user.id,
      status_at_archive: current.status,
      version_number_at_archive: current.version_number,
      confirm_linked: !!input.confirm_linked,
      linked_invoice_ids: invoice_ids,
      linked_job_ids: job_ids,
    },
  })

  revalidatePath('/portal/quotes')
  revalidatePath(`/portal/quotes/${input.quote_id}`)
  revalidatePath('/portal/settings/archive')
  return { ok: true }
}

export interface RestoreQuoteInput {
  quote_id: string
}

export async function restoreQuote(input: RestoreQuoteInput) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'Only admin can restore quotes.' }
  }
  if (!input.quote_id) return { error: 'quote_id is required.' }

  const { data: current, error: curErr } = await supabase
    .from('quotes')
    .select('id, deleted_at, status, version_number')
    .eq('id', input.quote_id)
    .single()
  if (curErr || !current) return { error: 'Quote not found.' }

  if (current.deleted_at == null) return { ok: true } // idempotent

  const { error: restoreErr } = await supabase
    .from('quotes')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', input.quote_id)
  if (restoreErr) return { error: `Failed to restore: ${restoreErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'quote.restored',
    entity_table: 'quotes',
    entity_id: input.quote_id,
    before: { deleted_at: current.deleted_at, status: current.status },
    after: { deleted_at: null, deleted_by: null },
  })

  revalidatePath('/portal/quotes')
  revalidatePath(`/portal/quotes/${input.quote_id}`)
  revalidatePath('/portal/settings/archive')
  return { ok: true }
}

// ─── Invoices ─────────────────────────────────────────────────────

export interface ArchiveInvoiceInput {
  invoice_id: string
  confirm_linked?: boolean
}

export type ArchiveInvoiceResult =
  | { ok: true }
  | {
      error: string
      reason?:
        | 'not_authenticated'
        | 'not_admin'
        | 'not_found'
        | 'linked_records'
      linked?: { job_ids: string[] }
    }

export async function archiveInvoice(input: ArchiveInvoiceInput): Promise<ArchiveInvoiceResult> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.', reason: 'not_authenticated' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Only admin can archive invoices.', reason: 'not_admin' }
  if (!input.invoice_id) return { error: 'invoice_id is required.' }

  const { data: current, error: curErr } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', input.invoice_id)
    .single()
  if (curErr || !current) return { error: 'Invoice not found.', reason: 'not_found' }

  if (current.deleted_at != null) return { ok: true }

  // Jobs that point at this invoice.
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('invoice_id', input.invoice_id)
  const job_ids = (jobs ?? []).map((r) => r.id)
  const hasLinked = job_ids.length > 0

  if (hasLinked && !input.confirm_linked) {
    return {
      error: `Invoice is linked to ${job_ids.length} job(s). Re-submit with confirm_linked=true to archive anyway.`,
      reason: 'linked_records',
      linked: { job_ids },
    }
  }

  await supabase.from('record_snapshots').insert({
    entity_table: 'invoices',
    entity_id: input.invoice_id,
    reason: 'invoice.archived',
    snapshot: current as unknown as Record<string, unknown>,
    created_by: user.id,
  })

  const now = new Date().toISOString()
  const { error: delErr } = await supabase
    .from('invoices')
    .update({ deleted_at: now, deleted_by: user.id })
    .eq('id', input.invoice_id)
    .is('deleted_at', null)
  if (delErr) return { error: `Failed to archive: ${delErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'invoice.archived',
    entity_table: 'invoices',
    entity_id: input.invoice_id,
    before: { deleted_at: null, deleted_by: null, status: current.status },
    after: {
      deleted_at: now,
      deleted_by: user.id,
      status_at_archive: current.status,
      confirm_linked: !!input.confirm_linked,
      linked_job_ids: job_ids,
    },
  })

  revalidatePath('/portal/invoices')
  revalidatePath(`/portal/invoices/${input.invoice_id}`)
  revalidatePath('/portal/settings/archive')
  return { ok: true }
}

export interface RestoreInvoiceInput {
  invoice_id: string
}

export async function restoreInvoice(input: RestoreInvoiceInput) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'Only admin can restore invoices.' }
  }
  if (!input.invoice_id) return { error: 'invoice_id is required.' }

  const { data: current, error: curErr } = await supabase
    .from('invoices')
    .select('id, deleted_at, status')
    .eq('id', input.invoice_id)
    .single()
  if (curErr || !current) return { error: 'Invoice not found.' }

  if (current.deleted_at == null) return { ok: true }

  const { error: restoreErr } = await supabase
    .from('invoices')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', input.invoice_id)
  if (restoreErr) return { error: `Failed to restore: ${restoreErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'invoice.restored',
    entity_table: 'invoices',
    entity_id: input.invoice_id,
    before: { deleted_at: current.deleted_at, status: current.status },
    after: { deleted_at: null, deleted_by: null },
  })

  revalidatePath('/portal/invoices')
  revalidatePath(`/portal/invoices/${input.invoice_id}`)
  revalidatePath('/portal/settings/archive')
  return { ok: true }
}

// ─── Jobs ─────────────────────────────────────────────────────────
// Phase D.2 — jobs now support soft-delete. Mirrors the quote +
// invoice archive/restore surface, with a record_snapshot taken
// before the mutation so restore is fully reversible.

export interface ArchiveJobInput {
  job_id: string
}

export async function archiveJob(input: ArchiveJobInput) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Only admin can archive jobs.' }
  if (!input.job_id) return { error: 'job_id is required.' }

  const { data: current, error: curErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', input.job_id)
    .single()
  if (curErr || !current) return { error: 'Job not found.' }

  if (current.deleted_at != null) return { ok: true }

  await supabase.from('record_snapshots').insert({
    entity_table: 'jobs',
    entity_id: input.job_id,
    reason: 'job.archived',
    snapshot: current as unknown as Record<string, unknown>,
    created_by: user.id,
  })

  const now = new Date().toISOString()
  const { error: delErr } = await supabase
    .from('jobs')
    .update({ deleted_at: now, deleted_by: user.id })
    .eq('id', input.job_id)
    .is('deleted_at', null)
  if (delErr) return { error: `Failed to archive: ${delErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job.archived',
    entity_table: 'jobs',
    entity_id: input.job_id,
    before: { deleted_at: null, deleted_by: null, status: current.status },
    after: {
      deleted_at: now,
      deleted_by: user.id,
      status_at_archive: current.status,
    },
  })

  revalidatePath('/portal/jobs')
  revalidatePath(`/portal/jobs/${input.job_id}`)
  revalidatePath('/portal/settings/archive')
  return { ok: true }
}

export interface RestoreJobInput {
  job_id: string
}

export async function restoreJob(input: RestoreJobInput) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'Only admin can restore jobs.' }
  }
  if (!input.job_id) return { error: 'job_id is required.' }

  const { data: current, error: curErr } = await supabase
    .from('jobs')
    .select('id, deleted_at, status')
    .eq('id', input.job_id)
    .single()
  if (curErr || !current) return { error: 'Job not found.' }

  if (current.deleted_at == null) return { ok: true }

  const { error: restoreErr } = await supabase
    .from('jobs')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', input.job_id)
  if (restoreErr) return { error: `Failed to restore: ${restoreErr.message}` }

  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'admin',
    action: 'job.restored',
    entity_table: 'jobs',
    entity_id: input.job_id,
    before: { deleted_at: current.deleted_at, status: current.status },
    after: { deleted_at: null, deleted_by: null },
  })

  revalidatePath('/portal/jobs')
  revalidatePath(`/portal/jobs/${input.job_id}`)
  revalidatePath('/portal/settings/archive')
  return { ok: true }
}
