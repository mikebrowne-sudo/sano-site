'use server'

// Phase 5.5.11 — One-shot client creation that also seeds the primary
// contact, optional accounts contact, and optional first site. Used by
// the new NewClientModal in `_components/NewClientModal.tsx`.
//
// All writes are best-effort: the parent client INSERT is the only
// hard requirement. If contact/site inserts fail we log and continue
// — the client still exists, the caller can fix the satellites later
// via the cleanup tools or the existing edit form.

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type ClientType    = 'individual' | 'company'
export type BusinessType  =
  | 'property_management' | 'construction' | 'office_commercial'
  | 'retail_hospitality'  | 'body_corporate' | 'airbnb' | 'other'
export type LeadSource    = 'google' | 'social' | 'referral' | 'existing_client' | 'other'
export type PaymentType   = 'prepaid' | 'on_account'
export type PaymentTerms  = '7_days' | '14_days' | '20_of_month' | 'custom'

export interface NewClientInput {
  client_type: ClientType
  name: string
  business_type?: BusinessType | null
  // Primary contact
  primary_name: string
  primary_email?: string | null
  primary_phone?: string | null
  // Accounts contact (only used when accounts_same_as_primary === false)
  accounts_same_as_primary: boolean
  accounts_name?: string | null
  accounts_email?: string | null
  // Payment setup
  payment_type: PaymentType
  payment_terms?: PaymentTerms | null
  // Lead source
  lead_source?: LeadSource | null
  referred_by?: string | null
  // Optional site at creation time
  service_address?: string | null
  // Free-form
  notes?: string | null
}

export interface CreatedClient {
  id: string
  primary_contact_id: string | null
  site_id: string | null
}

function clean(s: string | null | undefined): string | null {
  if (typeof s !== 'string') return null
  const t = s.trim()
  return t.length > 0 ? t : null
}

export async function createClientWithSetup(
  input: NewClientInput,
): Promise<{ ok: true; client: CreatedClient } | { error: string }> {
  const supabase = createClient()

  const name = clean(input.name)
  if (!name) return { error: 'Client name is required.' }
  const primaryName = clean(input.primary_name) ?? name

  // ── 1. Insert the client row ───────────────────────────────────────
  const accountsEmail = input.accounts_same_as_primary
    ? clean(input.primary_email)
    : clean(input.accounts_email)

  const { data: created, error: clientErr } = await supabase
    .from('clients')
    .insert({
      name,
      // For an individual we keep `name` as the human's name and leave
      // company_name null; for a company the name IS the company,
      // which we mirror into company_name to keep the legacy column
      // populated for selectors / labels that read it.
      company_name: input.client_type === 'company' ? name : null,
      email: clean(input.primary_email),
      phone: clean(input.primary_phone),
      service_address: clean(input.service_address),
      billing_address: null,
      billing_same_as_service: true,
      notes: clean(input.notes),
      client_type: input.client_type === 'company' ? 'company' : 'individual',
      business_type: input.business_type ?? null,
      lead_source: input.lead_source ?? null,
      referred_by: input.lead_source === 'referral' ? clean(input.referred_by) : null,
      accounts_email: accountsEmail,
      payment_type: input.payment_type,
      payment_terms: input.payment_type === 'on_account' ? (input.payment_terms ?? null) : null,
    })
    .select('id')
    .single()

  if (clientErr || !created) {
    return { error: `Failed to create client: ${clientErr?.message ?? 'unknown error'}` }
  }
  const clientId = created.id as string

  // ── 2. Primary contact ─────────────────────────────────────────────
  let primaryContactId: string | null = null
  try {
    const { data: pc, error } = await supabase
      .from('contacts')
      .insert({
        client_id: clientId,
        full_name: primaryName,
        contact_type: 'primary',
        email: clean(input.primary_email),
        phone: clean(input.primary_phone),
      })
      .select('id')
      .single()
    if (error) throw error
    primaryContactId = (pc?.id as string) ?? null
  } catch (err) {
    console.warn('[createClientWithSetup] primary contact failed:', err instanceof Error ? err.message : err)
  }

  // ── 3. Accounts contact (only when distinct from primary) ──────────
  if (!input.accounts_same_as_primary) {
    const accountsName  = clean(input.accounts_name)
    const accountsMail  = clean(input.accounts_email)
    if (accountsName || accountsMail) {
      try {
        await supabase
          .from('contacts')
          .insert({
            client_id: clientId,
            full_name: accountsName ?? accountsMail ?? 'Accounts',
            contact_type: 'accounts',
            email: accountsMail,
          })
      } catch (err) {
        console.warn('[createClientWithSetup] accounts contact failed:', err instanceof Error ? err.message : err)
      }
    }
  }

  // ── 4. First site (only when an address was supplied) ──────────────
  let siteId: string | null = null
  const addr = clean(input.service_address)
  if (addr) {
    try {
      const { data: s, error } = await supabase
        .from('sites')
        .insert({
          client_id: clientId,
          address: addr,
          default_contact_id: primaryContactId,
        })
        .select('id')
        .single()
      if (error) throw error
      siteId = (s?.id as string) ?? null
    } catch (err) {
      console.warn('[createClientWithSetup] site failed:', err instanceof Error ? err.message : err)
    }
  }

  revalidatePath('/portal/clients')
  return {
    ok: true,
    client: { id: clientId, primary_contact_id: primaryContactId, site_id: siteId },
  }
}

// Cheap server-side dupe lookup used by the modal as the user types.
// Lower-cased exact email match + normalised phone match + ilike name
// match. Capped at 5 results. Excludes archived clients. No admin
// gate — any logged-in staff can run this.
export interface PossibleMatch {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  matched_on: 'email' | 'phone' | 'name'
}

export async function findClientMatches(input: {
  email?: string
  phone?: string
  name?: string
}): Promise<PossibleMatch[]> {
  const supabase = createClient()
  const matches = new Map<string, PossibleMatch>()

  const emailQ = input.email?.trim()
  if (emailQ) {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, name, company_name, email, phone')
        .ilike('email', emailQ)
        .eq('is_archived', false)
        .limit(5)
      for (const r of data ?? []) {
        if (!r?.id) continue
        matches.set(r.id, { ...(r as PossibleMatch), matched_on: 'email' })
      }
    } catch { /* ignore */ }
  }

  const phoneDigits = (input.phone ?? '').replace(/\D+/g, '')
  if (phoneDigits.length >= 6) {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, name, company_name, email, phone')
        .eq('is_archived', false)
        .not('phone', 'is', null)
        .limit(50)
      for (const r of data ?? []) {
        if (!r?.id || matches.has(r.id)) continue
        const d = (r.phone ?? '').replace(/\D+/g, '')
        if (d === phoneDigits) {
          matches.set(r.id, { ...(r as PossibleMatch), matched_on: 'phone' })
        }
      }
    } catch { /* ignore */ }
  }

  const nameQ = input.name?.trim()
  if (nameQ && nameQ.length >= 3) {
    try {
      const { data } = await supabase
        .from('clients')
        .select('id, name, company_name, email, phone')
        .ilike('name', `%${nameQ}%`)
        .eq('is_archived', false)
        .limit(5)
      for (const r of data ?? []) {
        if (!r?.id || matches.has(r.id)) continue
        matches.set(r.id, { ...(r as PossibleMatch), matched_on: 'name' })
      }
    } catch { /* ignore */ }
  }

  return Array.from(matches.values()).slice(0, 5)
}
