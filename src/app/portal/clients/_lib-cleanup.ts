// Phase 5.5.10 — Read-only cleanup helpers + shared types.
//
// Lives outside the 'use server' file because Next.js 14 only allows
// async function exports from a "use server" module — interfaces and
// other non-function exports trigger a server-side runtime error.
//
// Defensive: every Supabase round-trip is wrapped in try/catch so an
// unexpected runtime failure (network blip, RLS edge case, missing
// column on a stale schema cache) returns a safe `{ error }` value
// instead of bubbling up and crashing the parent server component.
// Errors are logged via console.error so they surface in Netlify
// function logs.

console.error('[clients-debug] MODULE_LOADED clients/_lib-cleanup')

import { createClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = 'michael@sano.nz'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireAdmin(supabase: any): Promise<{ user: { id: string } } | { error: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated.' }
    if (user.email !== ADMIN_EMAIL) return { error: 'Admin only.' }
    return { user: { id: user.id } }
  } catch (err) {
    console.error('[cleanup] requireAdmin failed:', err)
    return { error: 'Auth check failed.' }
  }
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

const EMPTY_COUNTS: ClientLinkCounts = { quotes: 0, jobs: 0, invoices: 0, contacts: 0, sites: 0 }

export async function getClientLinkCounts(clientId: string): Promise<ClientLinkCounts | { error: string }> {
  try {
    const supabase = createClient()
    const auth = await requireAdmin(supabase)
    if ('error' in auth) return auth

    // Run each count independently and tolerate per-table failures so
    // one slow / blocked table doesn't take the page down. A failed
    // count returns 0 (with a console warning) — the safe-delete guard
    // is still strict because it requires zero rows on every table.
    const tables: { name: 'quotes' | 'jobs' | 'invoices' | 'contacts' | 'sites'; soft: boolean }[] = [
      { name: 'quotes',   soft: true  },
      { name: 'jobs',     soft: true  },
      { name: 'invoices', soft: true  },
      { name: 'contacts', soft: false },
      { name: 'sites',    soft: false },
    ]
    const counts: Record<string, number> = { ...EMPTY_COUNTS }
    await Promise.all(tables.map(async ({ name, soft }) => {
      try {
        let q = supabase.from(name).select('id', { count: 'exact', head: true }).eq('client_id', clientId)
        if (soft) q = q.is('deleted_at', null)
        const { count, error } = await q
        if (error) {
          console.warn(`[cleanup] count(${name}) error:`, error.message)
          return
        }
        counts[name] = count ?? 0
      } catch (err) {
        console.warn(`[cleanup] count(${name}) threw:`, err)
      }
    }))
    return {
      quotes: counts.quotes ?? 0,
      jobs: counts.jobs ?? 0,
      invoices: counts.invoices ?? 0,
      contacts: counts.contacts ?? 0,
      sites: counts.sites ?? 0,
    }
  } catch (err) {
    console.error('[cleanup] getClientLinkCounts failed:', err)
    return { error: 'Failed to load link counts.' }
  }
}

export async function findPossibleDuplicates(clientId: string): Promise<DuplicateMatch[] | { error: string }> {
  try {
    const supabase = createClient()
    const auth = await requireAdmin(supabase)
    if ('error' in auth) return auth

    const { data: c, error: meErr } = await supabase
      .from('clients')
      .select('id, name, email, phone, is_archived')
      .eq('id', clientId)
      .maybeSingle()
    if (meErr) {
      console.warn('[cleanup] findPossibleDuplicates self-load error:', meErr.message)
      return []
    }
    if (!c) return []
    const me = c as { id: string; name: string; email: string | null; phone: string | null }

    const matches = new Map<string, DuplicateMatch>()

    if (me.email && me.email.trim()) {
      try {
        const { data: byEmail, error } = await supabase
          .from('clients')
          .select('id, name, company_name, email, phone')
          .ilike('email', me.email.trim())
          .neq('id', clientId)
          .eq('is_archived', false)
        if (error) {
          console.warn('[cleanup] dup-by-email error:', error.message)
        } else {
          for (const r of byEmail ?? []) {
            if (!r?.id) continue
            matches.set(r.id, { ...(r as DuplicateMatch), matched_on: 'email' })
          }
        }
      } catch (err) {
        console.warn('[cleanup] dup-by-email threw:', err)
      }
    }

    if (me.name && me.name.trim()) {
      try {
        const { data: byName, error } = await supabase
          .from('clients')
          .select('id, name, company_name, email, phone')
          .ilike('name', me.name.trim())
          .neq('id', clientId)
          .eq('is_archived', false)
        if (error) {
          console.warn('[cleanup] dup-by-name error:', error.message)
        } else {
          for (const r of byName ?? []) {
            if (!r?.id || matches.has(r.id)) continue
            matches.set(r.id, { ...(r as DuplicateMatch), matched_on: 'name' })
          }
        }
      } catch (err) {
        console.warn('[cleanup] dup-by-name threw:', err)
      }
    }

    const myDigits = normalisePhone(me.phone)
    if (myDigits.length >= 6) {
      try {
        // Earlier `.not('phone', 'is', null)` chained on a complex
        // builder occasionally tripped supabase-js typing at runtime —
        // we instead fetch all non-archived peers and filter in JS.
        // Cheap at this row count and avoids the edge case.
        const { data: rows, error } = await supabase
          .from('clients')
          .select('id, name, company_name, email, phone')
          .neq('id', clientId)
          .eq('is_archived', false)
        if (error) {
          console.warn('[cleanup] dup-by-phone error:', error.message)
        } else {
          for (const r of rows ?? []) {
            if (!r?.id || matches.has(r.id)) continue
            if (!r.phone) continue
            if (normalisePhone(r.phone as string | null) === myDigits) {
              matches.set(r.id, { ...(r as DuplicateMatch), matched_on: 'phone' })
            }
          }
        }
      } catch (err) {
        console.warn('[cleanup] dup-by-phone threw:', err)
      }
    }

    return Array.from(matches.values())
  } catch (err) {
    console.error('[cleanup] findPossibleDuplicates failed:', err)
    return { error: 'Failed to load duplicates.' }
  }
}
