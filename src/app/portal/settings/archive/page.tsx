// Phase 6 — Archived Records (admin-only).
//
// Lists soft-deleted quotes and invoices with a one-click restore. Lives
// under Settings since it's an admin-only recovery surface — not promoted
// to the main sidebar.

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArchiveRestore, FileText, Receipt, Briefcase } from 'lucide-react'
import { RestoreQuoteAction, RestoreInvoiceAction, RestoreJobAction } from './_components/RestoreActions'
import { displayQuoteNumber } from '@/lib/quote-versioning'
import { StatusBadge } from '../../_components/StatusBadge'

const ADMIN_EMAIL = 'michael@sano.nz'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default async function ArchivedRecordsPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) notFound()

  const [{ data: quotes }, { data: invoices }, { data: jobs }] = await Promise.all([
    supabase
      .from('quotes')
      .select(`
        id, quote_number, status, version_number, deleted_at, deleted_by,
        clients ( name )
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    supabase
      .from('invoices')
      .select(`
        id, invoice_number, status, deleted_at, deleted_by,
        clients ( name )
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
    // Phase D.2 — archived jobs.
    supabase
      .from('jobs')
      .select(`
        id, job_number, title, status, deleted_at, deleted_by,
        clients ( name )
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }),
  ])

  // Resolve actor names (one fetch per unique deleter id).
  const deleterIds = Array.from(new Set([
    ...(quotes ?? []).map((q) => q.deleted_by).filter(Boolean),
    ...(invoices ?? []).map((i) => i.deleted_by).filter(Boolean),
    ...(jobs ?? []).map((j) => j.deleted_by).filter(Boolean),
  ])) as string[]

  const userMap = new Map<string, string>()
  if (deleterIds.length > 0) {
    // auth.users is not directly readable from the client SDK in most setups —
    // fall back to showing the truncated UUID. In a richer setup we'd join a
    // staff lookup table; not in scope for this phase.
    for (const id of deleterIds) {
      userMap.set(id, `${id.slice(0, 8)}…`)
    }
  }

  const quoteRows = (quotes ?? []).map((q) => ({
    id: q.id as string,
    displayNumber: displayQuoteNumber({
      quote_number: q.quote_number as string,
      version_number: (q.version_number as number) ?? 1,
    }),
    status: (q.status as string) ?? 'draft',
    versionNumber: (q.version_number as number) ?? 1,
    clientName: (q.clients as unknown as { name: string } | null)?.name ?? 'No client',
    deletedAt: q.deleted_at as string,
    deletedBy: q.deleted_by ? userMap.get(q.deleted_by as string) ?? 'Unknown' : 'Unknown',
  }))

  const invoiceRows = (invoices ?? []).map((i) => ({
    id: i.id as string,
    invoiceNumber: i.invoice_number as string,
    status: (i.status as string) ?? 'draft',
    clientName: (i.clients as unknown as { name: string } | null)?.name ?? 'No client',
    deletedAt: i.deleted_at as string,
    deletedBy: i.deleted_by ? userMap.get(i.deleted_by as string) ?? 'Unknown' : 'Unknown',
  }))

  const jobRows = (jobs ?? []).map((j) => ({
    id: j.id as string,
    jobNumber: j.job_number as string,
    title: (j.title as string | null) ?? '',
    status: (j.status as string) ?? 'draft',
    clientName: (j.clients as unknown as { name: string } | null)?.name ?? 'No client',
    deletedAt: j.deleted_at as string,
    deletedBy: j.deleted_by ? userMap.get(j.deleted_by as string) ?? 'Unknown' : 'Unknown',
  }))

  return (
    <div>
      <Link
        href="/portal/settings"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to settings
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <ArchiveRestore size={24} className="text-sage-500" />
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Archived Records</h1>
      </div>
      <p className="text-sm text-sage-600 mb-8">
        Quotes, invoices, and jobs that have been archived. Restore returns them to the active list.
      </p>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-sage-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText size={14} /> Quotes ({quoteRows.length})
        </h2>
        {quoteRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-sage-500 text-center">
            No archived quotes.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Quote</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Status at archive</th>
                  <th className="px-5 py-3 font-semibold">Archived</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {quoteRows.map((q) => (
                  <tr key={q.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-sage-800">
                      <Link href={`/portal/quotes/${q.id}`} className="hover:underline">{q.displayNumber}</Link>
                    </td>
                    <td className="px-5 py-3 text-sage-700">{q.clientName}</td>
                    <td className="px-5 py-3"><StatusBadge kind="quote" status={q.status} /></td>
                    <td className="px-5 py-3 text-sage-600 text-xs">{fmtDate(q.deletedAt)}</td>
                    <td className="px-5 py-3 text-sage-600 text-xs">{q.deletedBy}</td>
                    <td className="px-5 py-3 text-right">
                      <RestoreQuoteAction quoteId={q.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-sm font-semibold text-sage-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Receipt size={14} /> Invoices ({invoiceRows.length})
        </h2>
        {invoiceRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-sage-500 text-center">
            No archived invoices.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Status at archive</th>
                  <th className="px-5 py-3 font-semibold">Archived</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-sage-800">
                      <Link href={`/portal/invoices/${inv.id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-5 py-3 text-sage-700">{inv.clientName}</td>
                    <td className="px-5 py-3"><StatusBadge kind="invoice" status={inv.status} /></td>
                    <td className="px-5 py-3 text-sage-600 text-xs">{fmtDate(inv.deletedAt)}</td>
                    <td className="px-5 py-3 text-sage-600 text-xs">{inv.deletedBy}</td>
                    <td className="px-5 py-3 text-right">
                      <RestoreInvoiceAction invoiceId={inv.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-sage-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Briefcase size={14} /> Jobs ({jobRows.length})
        </h2>
        {jobRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-sm text-sage-500 text-center">
            No archived jobs.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="px-5 py-3 font-semibold">Job</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Status at archive</th>
                  <th className="px-5 py-3 font-semibold">Archived</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {jobRows.map((job) => (
                  <tr key={job.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-sage-800">
                      <Link href={`/portal/jobs/${job.id}`} className="hover:underline">{job.jobNumber}</Link>
                    </td>
                    <td className="px-5 py-3 text-sage-700">{job.title || '—'}</td>
                    <td className="px-5 py-3 text-sage-700">{job.clientName}</td>
                    <td className="px-5 py-3"><StatusBadge kind="job" status={job.status} /></td>
                    <td className="px-5 py-3 text-sage-600 text-xs">{fmtDate(job.deletedAt)}</td>
                    <td className="px-5 py-3 text-sage-600 text-xs">{job.deletedBy}</td>
                    <td className="px-5 py-3 text-right">
                      <RestoreJobAction jobId={job.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
