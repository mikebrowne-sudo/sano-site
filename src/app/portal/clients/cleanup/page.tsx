// Stage 5 — account cleanup review list (admin-only, READ-ONLY).
//
// Surfaces accounts that likely need tidying (branch split across
// name/company_name, company-named contacts, no real contact, possible
// duplicates / test records, person-in-wrong-field) with a proposed
// account name and a suggested manual action. Every fix is done via the
// existing client edit / merge / archive screens — this page links out
// and never mutates data itself.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import {
  analyzeAccount,
  duplicateClientIds,
  type CleanupContact,
  type RiskLevel,
} from '@/lib/account-cleanup'

export const dynamic = 'force-dynamic'

interface ClientRow {
  id: string
  name: string | null
  company_name: string | null
  email: string | null
  accounts_email: string | null
  client_type: string | null
  business_type: string | null
}

const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 }
const RISK_STYLE: Record<RiskLevel, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-sage-50 text-sage-600 border-sage-200',
}

const FLAG_LABELS: Record<string, string> = {
  branchSplit: 'Branch split across fields',
  noContacts: 'No contacts',
  noRealContact: 'No real contact person',
  companyNamedContact: 'Company-named contact',
  personMaybeWrongField: 'Name/company may be swapped',
  possibleTest: 'Possible test/junk',
  possibleDuplicate: 'Possible duplicate',
}

export default async function ClientCleanupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const [{ data: clientsRaw }, { data: contactsRaw }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company_name, email, accounts_email, client_type, business_type')
      .eq('is_archived', false)
      .order('name'),
    supabase
      .from('contacts')
      .select('client_id, full_name, contact_type, email'),
  ])

  const clients = (clientsRaw ?? []) as ClientRow[]
  const contacts = (contactsRaw ?? []) as Array<CleanupContact & { client_id: string | null }>

  const contactsByClient = new Map<string, CleanupContact[]>()
  for (const c of contacts) {
    if (!c.client_id) continue
    contactsByClient.set(c.client_id, [...(contactsByClient.get(c.client_id) ?? []), c])
  }

  const dupIds = duplicateClientIds(clients)

  const rows = clients
    .map((c) => {
      const accountContacts = contactsByClient.get(c.id) ?? []
      const analysis = analyzeAccount({
        name: c.name,
        companyName: c.company_name,
        email: c.email,
        contacts: accountContacts,
        isPossibleDuplicate: dupIds.has(c.id),
      })
      return { client: c, contacts: accountContacts, analysis }
    })
    .filter((r) => r.analysis.hasAnyFlag)
    .sort((a, b) => {
      const r = RISK_ORDER[a.analysis.riskLevel] - RISK_ORDER[b.analysis.riskLevel]
      if (r !== 0) return r
      return (a.client.name ?? '').localeCompare(b.client.name ?? '')
    })

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/portal/clients" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Back to clients
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Account cleanup review</h1>
        <p className="text-sm text-sage-500 mt-1 max-w-3xl">
          {rows.length} account{rows.length === 1 ? '' : 's'} flagged for review out of {clients.length}. This is a
          read-only worklist — make any change from the client screen (rename, merge, archive). Nothing here is
          applied automatically, and no contact names are invented.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sage-500 text-sm">
          Nothing flagged — accounts look tidy.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-sage-500 border-b border-sage-200 bg-sage-50/50">
                  <th className="py-3 px-4 font-semibold">Account</th>
                  <th className="py-3 px-4 font-semibold">Proposed name</th>
                  <th className="py-3 px-4 font-semibold">Emails</th>
                  <th className="py-3 px-4 font-semibold">Contacts</th>
                  <th className="py-3 px-4 font-semibold">Flags</th>
                  <th className="py-3 px-4 font-semibold">Suggested action</th>
                  <th className="py-3 px-4 font-semibold text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ client: c, contacts: cts, analysis: a }) => (
                  <tr key={c.id} className="border-b border-sage-50 align-top">
                    <td className="py-3 px-4">
                      <div className="font-medium text-sage-800">{c.name || '—'}</div>
                      {c.company_name && <div className="text-xs text-sage-500">{c.company_name}</div>}
                      {(c.business_type || c.client_type) && (
                        <div className="text-[11px] text-sage-400 mt-0.5">{c.business_type ?? c.client_type}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {a.proposedName
                        ? <span className="text-sage-800">{a.proposedName}</span>
                        : <span className="text-sage-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-sage-600 max-w-[180px]">
                      <div className="truncate" title={c.email ?? ''}>{c.email || <span className="text-sage-300">no email</span>}</div>
                      {c.accounts_email && <div className="truncate text-sage-500" title={c.accounts_email}>accts: {c.accounts_email}</div>}
                    </td>
                    <td className="py-3 px-4 text-xs text-sage-600 max-w-[200px]">
                      {cts.length === 0
                        ? <span className="text-red-600">none</span>
                        : cts.map((ct, i) => (
                            <div key={i} className="truncate" title={`${ct.full_name ?? ''} ${ct.email ?? ''}`}>
                              {ct.full_name || '(no name)'}{ct.contact_type === 'accounts' ? ' · accts' : ''}
                            </div>
                          ))}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize', RISK_STYLE[a.riskLevel])}>{a.riskLevel}</span>
                        {Object.entries(a.flags).filter(([, v]) => v).map(([k]) => (
                          <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{FLAG_LABELS[k] ?? k}</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-sage-700 max-w-[240px]">{a.suggestedAction}</td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/portal/clients/${c.id}`} className="inline-flex items-center gap-1.5 text-sage-600 hover:text-sage-800 font-medium whitespace-nowrap">
                        <ExternalLink size={13} /> Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-sage-400 inline-flex items-start gap-1.5 max-w-3xl">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        Suggestions are heuristics to review, not rules. Renames, merges and archives are manual on the client
        screen so audit links and historical quotes/jobs/invoices stay intact.
      </p>
    </div>
  )
}
