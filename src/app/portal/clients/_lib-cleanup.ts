// Phase 5.5.10 — Read-only cleanup helpers + shared types.
//
// Lives outside the 'use server' file because Next.js 14 only allows
// async function exports from a "use server" module — interfaces and
// other non-function exports trigger a server-side runtime error.
//
// These helpers are admin-only and called from server components
// during render. The mutating actions (archive / merge / fix) stay in
// _actions-cleanup.ts.

import { createClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'michael@sano.nz'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any): Promise<{ user: { id: string } } | { error: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
  return { user: { id: user.id } }
}

export interface ClientLinkCounts {
  quotes: number
  jobs: number
  invoices: number
  contacts: number
  sites: number
}

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
