// Portal-wide search. One box to find a quote, job or invoice by number
// (full or partial — "0014" or "014"), address / part-address, client
// name, or reference. Live records only (archived / test excluded), same
// convention as the individual list pages.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { FileText, Briefcase, Receipt } from 'lucide-react'
import { GlobalSearch } from '../_components/GlobalSearch'

export const dynamic = 'force-dynamic'

const RESULT_LIMIT = 25

type ClientJoin = { name: string | null; company_name: string | null } | null

function clientLabel(c: ClientJoin): string {
  if (!c) return '—'
  const company = c.company_name?.trim()
  if (company) return company
  return c.name?.trim() || '—'
}

/** Build a PostgREST `or` filter, appending a client-id match when we
 *  found clients whose name matched the query. */
function orFilter(fields: string[], clientIds: string[]): string {
  const clauses = [...fields]
  if (clientIds.length > 0) clauses.push(`client_id.in.(${clientIds.join(',')})`)
  return clauses.join(',')
}

export default async function PortalSearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = createClient()
  const q = (searchParams.q ?? '').trim()

  if (!q) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-sage-800 tracking-tight mb-2">Search</h1>
        <p className="text-sm text-sage-500 mb-6">
          Find a quote, job or invoice by number (full or partial), address, client name, or reference.
        </p>
        <div className="max-w-md">
          <GlobalSearch />
        </div>
      </div>
    )
  }

  const like = `%${q}%`

  // Clients whose name/company matches — so "search by customer" works
  // across all three record types.
  const { data: clientMatches } = await supabase
    .from('clients')
    .select('id')
    .or(`name.ilike.${like},company_name.ilike.${like}`)
    .limit(200)
  const clientIds = (clientMatches ?? []).map((c) => c.id as string)

  const [quotesRes, jobsRes, invoicesRes] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, quote_number, service_address, status, client_reference, clients ( name, company_name )')
      .eq('is_latest_version', true)
      .is('deleted_at', null)
      .eq('is_test', false)
      .or(orFilter([`quote_number.ilike.${like}`, `service_address.ilike.${like}`, `client_reference.ilike.${like}`], clientIds))
      .order('created_at', { ascending: false })
      .limit(RESULT_LIMIT),
    supabase
      .from('jobs')
      .select('id, job_number, title, address, status, assigned_to, clients ( name, company_name )')
      .is('deleted_at', null)
      .eq('is_test', false)
      .or(orFilter([`job_number.ilike.${like}`, `address.ilike.${like}`, `title.ilike.${like}`, `assigned_to.ilike.${like}`], clientIds))
      .order('created_at', { ascending: false })
      .limit(RESULT_LIMIT),
    supabase
      .from('invoices')
      .select('id, invoice_number, service_address, status, client_reference, clients ( name, company_name )')
      .is('deleted_at', null)
      .eq('is_test', false)
      .or(orFilter([`invoice_number.ilike.${like}`, `service_address.ilike.${like}`, `client_reference.ilike.${like}`], clientIds))
      .order('created_at', { ascending: false })
      .limit(RESULT_LIMIT),
  ])

  const quotes = (quotesRes.data ?? []) as unknown as Array<{ id: string; quote_number: string | null; service_address: string | null; status: string | null; clients: ClientJoin }>
  const jobs = (jobsRes.data ?? []) as unknown as Array<{ id: string; job_number: string | null; title: string | null; address: string | null; status: string | null; clients: ClientJoin }>
  const invoices = (invoicesRes.data ?? []) as unknown as Array<{ id: string; invoice_number: string | null; service_address: string | null; status: string | null; clients: ClientJoin }>

  const total = quotes.length + jobs.length + invoices.length

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-sage-800 tracking-tight mb-3">Search</h1>
      <div className="max-w-md mb-5">
        <GlobalSearch defaultValue={q} />
      </div>
      <p className="text-sm text-sage-500 mb-6">
        {total === 0 ? (
          <>No quotes, jobs or invoices match <span className="font-medium text-sage-700">“{q}”</span>.</>
        ) : (
          <>{total} result{total === 1 ? '' : 's'} for <span className="font-medium text-sage-700">“{q}”</span>.</>
        )}
      </p>

      <div className="space-y-6">
        <ResultGroup icon={FileText} title="Quotes" count={quotes.length}>
          {quotes.map((r) => (
            <ResultRow
              key={r.id}
              href={`/portal/quotes/${r.id}`}
              number={r.quote_number}
              primary={clientLabel(r.clients)}
              secondary={r.service_address}
              status={r.status}
            />
          ))}
        </ResultGroup>

        <ResultGroup icon={Briefcase} title="Jobs" count={jobs.length}>
          {jobs.map((r) => (
            <ResultRow
              key={r.id}
              href={`/portal/jobs/${r.id}`}
              number={r.job_number}
              primary={clientLabel(r.clients)}
              secondary={r.address || r.title}
              status={r.status}
            />
          ))}
        </ResultGroup>

        <ResultGroup icon={Receipt} title="Invoices" count={invoices.length}>
          {invoices.map((r) => (
            <ResultRow
              key={r.id}
              href={`/portal/invoices/${r.id}`}
              number={r.invoice_number}
              primary={clientLabel(r.clients)}
              secondary={r.service_address}
              status={r.status}
            />
          ))}
        </ResultGroup>
      </div>
    </div>
  )
}

function ResultGroup({
  icon: Icon,
  title,
  count,
  children,
}: {
  icon: typeof FileText
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className="text-sage-500" />
        <h2 className="text-sm font-semibold text-sage-800">{title}</h2>
        <span className="text-xs text-sage-400">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-sm text-sage-400 pl-6">No matches.</p>
      ) : (
        <div className="rounded-xl border border-sage-100 overflow-hidden divide-y divide-sage-50 bg-white">
          {children}
        </div>
      )}
    </section>
  )
}

function ResultRow({
  href,
  number,
  primary,
  secondary,
  status,
}: {
  href: string
  number: string | null
  primary: string
  secondary: string | null
  status: string | null
}) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sage-50 transition-colors">
      <span className="font-medium text-sage-800 whitespace-nowrap w-24 shrink-0">{number ?? '—'}</span>
      <span className="text-sage-700 truncate flex-1 min-w-0">{primary}</span>
      {secondary && <span className="text-sage-400 text-sm truncate flex-1 min-w-0 hidden sm:block">{secondary}</span>}
      {status && (
        <span className="text-[10px] uppercase tracking-wide font-semibold text-sage-500 bg-sage-50 border border-sage-100 rounded-full px-2 py-0.5 shrink-0 capitalize">
          {status.replace(/_/g, ' ')}
        </span>
      )}
    </Link>
  )
}
