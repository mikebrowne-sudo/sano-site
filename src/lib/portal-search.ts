// Comprehensive portal search — one query across every record type an
// operator might want to jump to: quotes, jobs, invoices, clients,
// contractors, contractor invoices, and remittances.
//
// Matches by number (full or partial, substring ilike), address /
// part-address, name / company, email, phone, label or reference.
// Server-safe (no React / lucide imports) so it can back both the
// /api/portal/search endpoint (command palette) and the /portal/search
// full page. Runs under the caller's RLS-scoped Supabase client.

import type { SupabaseClient } from '@supabase/supabase-js'

export type SearchResultType =
  | 'quote'
  | 'job'
  | 'invoice'
  | 'client'
  | 'contractor'
  | 'contractor_invoice'
  | 'remittance'

export interface SearchResult {
  type: SearchResultType
  id: string
  href: string
  title: string
  subtitle: string | null
  meta: string | null
}

export interface SearchGroup {
  type: SearchResultType
  label: string
  items: SearchResult[]
}

type ClientJoin = { name: string | null; company_name: string | null } | null

function clientLabel(c: ClientJoin): string {
  if (!c) return '—'
  return c.company_name?.trim() || c.name?.trim() || '—'
}

/** Commas / parens / quotes break PostgREST's `or()` value syntax, so we
 *  strip them from the search term (matching how the existing list-page
 *  searches interpolate the term unquoted). Whitespace is collapsed. */
function safeTerm(q: string): string {
  return q.replace(/[,()"\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

function orClause(fields: string[], term: string, clientIds: string[]): string {
  const clauses = fields.map((f) => `${f}.ilike.%${term}%`)
  if (clientIds.length > 0) clauses.push(`client_id.in.(${clientIds.join(',')})`)
  return clauses.join(',')
}

export async function searchPortal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  rawQuery: string,
  opts: { limit?: number } = {},
): Promise<SearchGroup[]> {
  const q = safeTerm(rawQuery)
  const limit = opts.limit ?? 6
  if (!q) return []

  // Clients matching by name/company — reused as its own result group
  // AND folded into quote/job/invoice matches so "search by customer"
  // works everywhere.
  const { data: clientMatches } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .or(`name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .eq('is_archived', false)
    .limit(Math.max(limit, 50))
  const clientRows = (clientMatches ?? []) as Array<{ id: string; name: string | null; company_name: string | null }>
  const clientIds = clientRows.map((c) => c.id)

  const [quotesRes, jobsRes, invoicesRes, contractorsRes, ciRes, remitRes] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, quote_number, service_address, status, clients ( name, company_name )')
      .eq('is_latest_version', true)
      .is('deleted_at', null)
      .eq('is_test', false)
      .or(orClause(['quote_number', 'service_address', 'client_reference'], q, clientIds))
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('jobs')
      .select('id, job_number, title, address, status, assigned_to, clients ( name, company_name )')
      .is('deleted_at', null)
      .eq('is_test', false)
      .or(orClause(['job_number', 'address', 'title', 'assigned_to'], q, clientIds))
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('invoices')
      .select('id, invoice_number, service_address, status, clients ( name, company_name )')
      .is('deleted_at', null)
      .eq('is_test', false)
      .or(orClause(['invoice_number', 'service_address', 'client_reference'], q, clientIds))
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('contractors')
      .select('id, full_name, email, phone, status')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .order('full_name', { ascending: true })
      .limit(limit),
    supabase
      .from('contractor_invoices')
      .select('id, invoice_number, site_label, period_label, amount, status, contractors ( full_name )')
      .or(`invoice_number.ilike.%${q}%,site_label.ilike.%${q}%,period_label.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('contractor_remittances')
      .select('id, remittance_number, payee_label, reference')
      .or(`remittance_number.ilike.%${q}%,payee_label.ilike.%${q}%,reference.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const quotes = (quotesRes.data ?? []) as unknown as Array<{ id: string; quote_number: string | null; service_address: string | null; status: string | null; clients: ClientJoin }>
  const jobs = (jobsRes.data ?? []) as unknown as Array<{ id: string; job_number: string | null; title: string | null; address: string | null; status: string | null; clients: ClientJoin }>
  const invoices = (invoicesRes.data ?? []) as unknown as Array<{ id: string; invoice_number: string | null; service_address: string | null; status: string | null; clients: ClientJoin }>
  const contractors = (contractorsRes.data ?? []) as Array<{ id: string; full_name: string | null; email: string | null; phone: string | null; status: string | null }>
  const cis = (ciRes.data ?? []) as unknown as Array<{ id: string; invoice_number: string | null; site_label: string | null; period_label: string | null; status: string | null; contractors: { full_name: string | null } | null }>
  const remits = (remitRes.data ?? []) as Array<{ id: string; remittance_number: string | null; payee_label: string | null; reference: string | null }>

  const groups: SearchGroup[] = [
    {
      type: 'quote',
      label: 'Quotes',
      items: quotes.map((r) => ({
        type: 'quote' as const,
        id: r.id,
        href: `/portal/quotes/${r.id}`,
        title: r.quote_number ?? '—',
        subtitle: clientLabel(r.clients),
        meta: r.service_address ?? r.status ?? null,
      })),
    },
    {
      type: 'job',
      label: 'Jobs',
      items: jobs.map((r) => ({
        type: 'job' as const,
        id: r.id,
        href: `/portal/jobs/${r.id}`,
        title: r.job_number ?? '—',
        subtitle: clientLabel(r.clients),
        meta: r.address ?? r.title ?? r.status ?? null,
      })),
    },
    {
      type: 'invoice',
      label: 'Invoices',
      items: invoices.map((r) => ({
        type: 'invoice' as const,
        id: r.id,
        href: `/portal/invoices/${r.id}`,
        title: r.invoice_number ?? '—',
        subtitle: clientLabel(r.clients),
        meta: r.service_address ?? r.status ?? null,
      })),
    },
    {
      type: 'client',
      label: 'Clients',
      items: clientRows.slice(0, limit).map((r) => ({
        type: 'client' as const,
        id: r.id,
        href: `/portal/clients/${r.id}`,
        title: r.company_name?.trim() || r.name?.trim() || '—',
        subtitle: r.company_name?.trim() && r.name?.trim() ? r.name : null,
        meta: null,
      })),
    },
    {
      type: 'contractor',
      label: 'Contractors',
      items: contractors.map((r) => ({
        type: 'contractor' as const,
        id: r.id,
        href: `/portal/contractors/${r.id}`,
        title: r.full_name ?? '—',
        subtitle: r.email ?? r.phone ?? null,
        meta: r.status ?? null,
      })),
    },
    {
      type: 'contractor_invoice',
      label: 'Contractor invoices',
      items: cis.map((r) => ({
        type: 'contractor_invoice' as const,
        id: r.id,
        href: `/portal/contractor-invoices/${r.id}`,
        title: r.invoice_number ?? 'Contractor invoice',
        subtitle: r.contractors?.full_name ?? null,
        meta: r.site_label ?? r.period_label ?? r.status ?? null,
      })),
    },
    {
      type: 'remittance',
      label: 'Remittances',
      items: remits.map((r) => ({
        type: 'remittance' as const,
        id: r.id,
        href: `/portal/contractor-invoices/remittances/${r.id}`,
        title: r.remittance_number ?? 'Remittance',
        subtitle: r.payee_label ?? null,
        meta: r.reference ?? null,
      })),
    },
  ]

  return groups.filter((g) => g.items.length > 0)
}
