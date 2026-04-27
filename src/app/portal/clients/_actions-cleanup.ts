'use server'

// Phase 5.5.10 — CRM cleanup actions: archive / safe-delete / merge,
// plus light data-fix helpers for the cleanup dashboard.
//
// All actions are admin-only and audit-logged. Merge is the most
// destructive operation but never deletes data — the loser is archived
// and every quote / job / invoice / contact / site is moved by FK
// update, so the operation is reversible by un-archiving + redirecting
// new records back to the loser if needed.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const ADMIN_EMAIL = 'michael@sano.nz'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any): Promise<{ user: { id: string } } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { user: { id: user.id } }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function writeAudit(supabase: any, userId: string, entityId: string | null, before: Record<string, unknown>, after: Record<string, unknown>, action: string, entityTable: string) {
  await supabase.from('audit_log').insert({
    actor_id: userId,
    actor_role: 'admin',
    action,
    entity_table: entityTable,
    entity_id: entityId,
    before, after,
  })
}

// ── Client link counts (used by safe-delete + merge confirmation) ──

export interface ClientLinkCounts {
  quotes: number
  jobs: number
  invoices: number
  contacts: number
  sites: number
}

export async function getClientLinkCounts(clientId: string): Promise<ClientLinkCounts | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const [{ count: quotes }, { count: jobs }, { count: invoices }, { count: contacts }, { count: sites }] = await Promise.all([
    supabase.from('quotes').select('id', { count: 'exact', head: true }).eq('client_id', clientId).is('deleted_at', null),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('client_id', clientId).is('deleted_at', null),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('client_id', clientId).is('deleted_at', null),
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.from('sites').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
  ])
  return {
    quotes: quotes ?? 0,
    jobs: jobs ?? 0,
    invoices: invoices ?? 0,
    contacts: contacts ?? 0,
    sites: sites ?? 0,
  }
}

// ── Archive / unarchive ────────────────────────────────────────────

export async function archiveClient(clientId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: c } = await supabase
    .from('clients')
    .select('id, is_archived')
    .eq('id', clientId)
    .maybeSingle()
  if (!c) return { error: 'Client not found.' }
  if ((c as { is_archived?: boolean }).is_archived) return { error: 'Client is already archived.' }

  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('clients')
    .update({ is_archived: true, archived_at: nowIso })
    .eq('id', clientId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, clientId,
    { is_archived: false },
    { is_archived: true, archived_at: nowIso },
    'client.archived', 'clients',
  )
  revalidatePath('/portal/clients')
  revalidatePath(`/portal/clients/${clientId}`)
  return { ok: true }
}

export async function unarchiveClient(clientId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { error } = await supabase
    .from('clients')
    .update({ is_archived: false, archived_at: null })
    .eq('id', clientId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, clientId,
    { is_archived: true },
    { is_archived: false, archived_at: null },
    'client.unarchived', 'clients',
  )
  revalidatePath('/portal/clients')
  revalidatePath(`/portal/clients/${clientId}`)
  return { ok: true }
}

// ── Safe delete (only when no linked documents) ────────────────────

export async function safeDeleteClient(clientId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const links = await getClientLinkCounts(clientId)
  if ('error' in links) return links
  if (links.quotes > 0 || links.jobs > 0 || links.invoices > 0) {
    return { error: 'This client has existing records. Archive instead.' }
  }

  // Contacts / sites cascade via FK ON DELETE CASCADE — that's expected
  // for a client we're hard-deleting (they have no documents to point
  // at the children).
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, clientId,
    { exists: true }, { exists: false },
    'client.deleted', 'clients',
  )
  revalidatePath('/portal/clients')
  return { ok: true }
}

// ── Merge clients (source → target). Source is archived after move. ──

export async function mergeClients(input: {
  sourceId: string
  targetId: string
}): Promise<{ ok: true; moved: ClientLinkCounts } | { error: string }> {
  if (input.sourceId === input.targetId) return { error: 'Source and target must differ.' }
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const [{ data: src }, { data: tgt }] = await Promise.all([
    supabase.from('clients').select('id, name, is_archived').eq('id', input.sourceId).maybeSingle(),
    supabase.from('clients').select('id, name, is_archived').eq('id', input.targetId).maybeSingle(),
  ])
  if (!src) return { error: 'Source client not found.' }
  if (!tgt) return { error: 'Target client not found.' }
  if ((tgt as { is_archived?: boolean }).is_archived) {
    return { error: 'Target client is archived. Unarchive it before merging.' }
  }

  // Move FK references. Each table's update is idempotent; running the
  // merge twice is harmless because the second pass finds zero rows.
  const tables = ['quotes', 'jobs', 'invoices', 'contacts', 'sites'] as const
  const moved: ClientLinkCounts = { quotes: 0, jobs: 0, invoices: 0, contacts: 0, sites: 0 }
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .update({ client_id: input.targetId })
      .eq('client_id', input.sourceId)
      .select('id')
    if (error) return { error: `Move ${table} failed: ${error.message}` }
    moved[table] = (data ?? []).length
  }

  // Archive the source rather than delete it — keeps audit history
  // intact and the merge is reversible by an admin.
  const nowIso = new Date().toISOString()
  await supabase
    .from('clients')
    .update({ is_archived: true, archived_at: nowIso })
    .eq('id', input.sourceId)

  await writeAudit(supabase, auth.user.id, input.sourceId,
    { client_name: (src as { name?: string }).name ?? null },
    { merged_into: input.targetId, target_name: (tgt as { name?: string }).name ?? null, moved },
    'client.merged', 'clients',
  )

  revalidatePath('/portal/clients')
  revalidatePath(`/portal/clients/${input.sourceId}`)
  revalidatePath(`/portal/clients/${input.targetId}`)
  return { ok: true, moved }
}

// ── Duplicate detection (case-insensitive exact email/phone/name) ──

export interface DuplicateMatch {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  matched_on: 'email' | 'phone' | 'name'
}

function normalisePhone(p: string | null): string {
  if (!p) return ''
  return p.replace(/\D+/g, '')
}

export async function findPossibleDuplicates(clientId: string): Promise<DuplicateMatch[] | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: c } = await supabase
    .from('clients')
    .select('id, name, email, phone, is_archived')
    .eq('id', clientId)
    .maybeSingle()
  if (!c) return { error: 'Client not found.' }
  const me = c as { id: string; name: string; email: string | null; phone: string | null }

  const matches = new Map<string, DuplicateMatch>()

  // Case-insensitive email match.
  if (me.email && me.email.trim()) {
    const { data: byEmail } = await supabase
      .from('clients')
      .select('id, name, company_name, email, phone')
      .ilike('email', me.email.trim())
      .neq('id', clientId)
      .eq('is_archived', false)
    for (const r of byEmail ?? []) {
      matches.set(r.id, { ...(r as DuplicateMatch), matched_on: 'email' })
    }
  }

  // Case-insensitive name exact.
  if (me.name && me.name.trim()) {
    const { data: byName } = await supabase
      .from('clients')
      .select('id, name, company_name, email, phone')
      .ilike('name', me.name.trim())
      .neq('id', clientId)
      .eq('is_archived', false)
    for (const r of byName ?? []) {
      if (!matches.has(r.id)) {
        matches.set(r.id, { ...(r as DuplicateMatch), matched_on: 'name' })
      }
    }
  }

  // Phone — fetch all and filter in JS so we can normalise digits.
  const myDigits = normalisePhone(me.phone)
  if (myDigits.length >= 6) {
    const { data: rows } = await supabase
      .from('clients')
      .select('id, name, company_name, email, phone')
      .neq('id', clientId)
      .eq('is_archived', false)
      .not('phone', 'is', null)
    for (const r of rows ?? []) {
      if (matches.has(r.id)) continue
      if (normalisePhone(r.phone) === myDigits) {
        matches.set(r.id, { ...(r as DuplicateMatch), matched_on: 'phone' })
      }
    }
  }

  return Array.from(matches.values())
}

// ── Data-fix helpers (used by the cleanup dashboard + job/invoice UI) ──

export async function fixJobClientToMatchQuote(jobId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: j } = await supabase
    .from('jobs')
    .select('id, client_id, quote_id, quotes ( client_id )')
    .eq('id', jobId)
    .maybeSingle()
  if (!j) return { error: 'Job not found.' }
  const job = j as unknown as { id: string; client_id: string; quote_id: string | null; quotes: { client_id: string } | null }
  if (!job.quote_id || !job.quotes) return { error: 'Job has no linked quote.' }
  if (job.client_id === job.quotes.client_id) return { error: 'Job already matches the quote\'s client.' }

  const newClient = job.quotes.client_id
  const { error } = await supabase
    .from('jobs')
    .update({ client_id: newClient })
    .eq('id', jobId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, jobId,
    { client_id: job.client_id },
    { client_id: newClient, fix: 'match_quote_client' },
    'job.fixed', 'jobs',
  )
  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/cleanup')
  return { ok: true }
}

export async function unlinkJobQuote(jobId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const { data: j } = await supabase.from('jobs').select('quote_id, source').eq('id', jobId).maybeSingle()
  if (!j) return { error: 'Job not found.' }
  const job = j as { quote_id: string | null; source: string | null }
  if (!job.quote_id) return { error: 'Job already has no quote link.' }

  const { error } = await supabase
    .from('jobs')
    .update({ quote_id: null, source: 'manual' })
    .eq('id', jobId)
  if (error) return { error: error.message }

  await writeAudit(supabase, auth.user.id, jobId,
    { quote_id: job.quote_id, source: job.source },
    { quote_id: null, source: 'manual', fix: 'unlink_quote' },
    'job.fixed', 'jobs',
  )
  revalidatePath(`/portal/jobs/${jobId}`)
  revalidatePath('/portal/cleanup')
  return { ok: true }
}

export async function linkInvoiceToJob(input: { invoiceId: string; jobId: string }): Promise<{ ok: true } | { error: string }> {
  const supabase = createClient()
  const auth = await requireAdmin(supabase)
  if ('error' in auth) return auth

  const [{ data: inv }, { data: job }] = await Promise.all([
    supabase.from('invoices').select('id, client_id, job_id, source').eq('id', input.invoiceId).maybeSingle(),
    supabase.from('jobs').select('id, client_id, invoice_id').eq('id', input.jobId).maybeSingle(),
  ])
  if (!inv) return { error: 'Invoice not found.' }
  if (!job) return { error: 'Job not found.' }
  const i = inv as { id: string; client_id: string; job_id: string | null; source: string | null }
  const j = job as { id: string; client_id: string; invoice_id: string | null }

  if (i.client_id !== j.client_id) {
    return { error: 'Invoice and job belong to different clients.' }
  }
  if (i.job_id && i.job_id !== j.id) {
    return { error: 'Invoice is already linked to a different job.' }
  }

  // Link both directions (invoice.job_id, jobs.invoice_id). Sequential
  // so any error short-circuits cleanly.
  const invUp = await supabase.from('invoices').update({ job_id: j.id, source: 'job' }).eq('id', i.id)
  if (invUp.error) return { error: `Failed to link invoice: ${invUp.error.message}` }
  if (j.invoice_id !== i.id) {
    const jobUp = await supabase.from('jobs').update({ invoice_id: i.id }).eq('id', j.id)
    if (jobUp.error) return { error: `Failed to link job back: ${jobUp.error.message}` }
  }

  await writeAudit(supabase, auth.user.id, i.id,
    { job_id: i.job_id, source: i.source },
    { job_id: j.id, source: 'job' },
    'invoice.linked', 'invoices',
  )
  revalidatePath(`/portal/invoices/${i.id}`)
  revalidatePath(`/portal/jobs/${j.id}`)
  revalidatePath('/portal/cleanup')
  return { ok: true }
}
