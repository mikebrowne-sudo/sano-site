import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { Receipt, FlaskConical, Archive } from 'lucide-react'
import clsx from 'clsx'
import { StatusBadge } from '../_components/StatusBadge'
import { computeInvoiceDisplayStatus } from '@/lib/quote-status'
import { ListLifecycleTabs } from '../_components/ListLifecycleTabs'
import { AttentionChips } from '../_components/AttentionChips'
import { BulkSelectProvider, BulkSelectCheckbox, BulkSelectHeader } from '../_components/BulkSelect'
import { getInvoiceAttention } from '@/lib/attention-rules'

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Phase 5.5.14 — finance-focused invoice tabs. Default 'needs_attention'
// includes drafts (not sent), overdue, and outstanding sent invoices.
type InvoiceTab = 'needs_attention' | 'outstanding' | 'paid' | 'draft' | 'all'
const INVOICE_TABS: readonly { value: InvoiceTab; label: string }[] = [
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'outstanding',     label: 'Outstanding' },
  { value: 'paid',            label: 'Paid' },
  { value: 'draft',           label: 'Draft' },
  { value: 'all',             label: 'All' },
]
function parseInvoiceTab(v: string | undefined): InvoiceTab {
  return (INVOICE_TABS.find((t) => t.value === v)?.value as InvoiceTab) ?? 'needs_attention'
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { tab?: string; show_archived?: string }
}) {
  const supabase = createClient()

  const activeTab    = parseInvoiceTab(searchParams?.tab)
  const showArchived = searchParams?.show_archived === '1'

  let query = supabase
    .from('invoices')
    .select(`
      id, invoice_number, status, base_price, discount,
      date_issued, due_date, created_at,
      is_test, deleted_at,
      clients ( name ),
      invoice_items ( price )
    `)
    .order('created_at', { ascending: false })

  if (!showArchived) {
    query = query.is('deleted_at', null).eq('is_test', false)
  }

  // Outstanding = sent invoices (overdue is computed per row from due_date).
  if (activeTab === 'outstanding') {
    query = query.in('status', ['sent'])
  } else if (activeTab === 'paid') {
    query = query.eq('status', 'paid')
  } else if (activeTab === 'draft') {
    query = query.eq('status', 'draft')
  } else if (activeTab === 'needs_attention') {
    // Drafts + sent (overdue and outstanding both branch off "sent").
    query = query.in('status', ['draft', 'sent'])
  }
  // 'all' applies no extra status filter.

  const { data: invoices, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-8">Invoices</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
          Failed to load invoices: {error.message}
        </div>
      </div>
    )
  }

  const allRows = (invoices ?? []).map((inv) => {
    const client = inv.clients as unknown as { name: string } | null
    const items = (inv.invoice_items ?? []) as { price: number }[]
    const addOns = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
    const total = (inv.base_price ?? 0) + addOns - (inv.discount ?? 0)

    const attention = getInvoiceAttention({
      status: inv.status,
      due_date: inv.due_date as string | null,
      created_at: inv.created_at as string | null,
      date_issued: inv.date_issued as string | null,
    })

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      clientName: client?.name ?? 'No client',
      status: computeInvoiceDisplayStatus(inv.status, inv.due_date),
      dateIssued: inv.date_issued,
      dueDate: inv.due_date,
      total,
      isTest: !!(inv as { is_test?: boolean }).is_test,
      isArchived: !!(inv as { deleted_at?: string | null }).deleted_at,
      attention,
    }
  })

  const rows = activeTab === 'needs_attention'
    ? allRows.filter((r) => r.attention.needsAttention)
    : allRows

  const emptyCopy: Record<InvoiceTab, { title: string; sub: string }> = {
    needs_attention: { title: 'Nothing needs your attention right now.', sub: 'Drafts, overdue, and outstanding invoices surface here.' },
    outstanding:     { title: 'No outstanding invoices.', sub: 'Paid invoices can be viewed under Paid.' },
    paid:            { title: 'No paid invoices yet.', sub: '' },
    draft:           { title: 'No draft invoices.', sub: 'Drafts appear here until they’re sent.' },
    all:             { title: 'No invoices yet.', sub: 'Convert a quote to create the first one.' },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Invoices</h1>
      </div>

      <ListLifecycleTabs
        basePath="/portal/invoices"
        tabs={INVOICE_TABS}
        activeTab={activeTab}
        showArchived={showArchived}
      />

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <Receipt size={32} className="text-sage-200 mx-auto mb-3" />
          <p className="text-sage-800 font-medium mb-1">{emptyCopy[activeTab].title}</p>
          {emptyCopy[activeTab].sub && (
            <p className="text-sage-600 text-sm mb-4">{emptyCopy[activeTab].sub}</p>
          )}
          <Link
            href="/portal/quotes"
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors mt-2"
          >
            View quotes
          </Link>
        </div>
      ) : (
        <BulkSelectProvider entity="invoice" ids={rows.map((r) => r.id as string)}>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sage-600">
                  <th className="pl-5 pr-2 py-3 w-8">
                    <BulkSelectHeader />
                  </th>
                  <th className="px-5 py-3 font-semibold">Invoice #</th>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Issued</th>
                  <th className="px-5 py-3 font-semibold">Due</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className={clsx('border-b border-gray-50 last:border-0 group', (row.isTest || row.isArchived) && 'opacity-60')}>
                    <td className="pl-5 pr-2 py-3 align-top">
                      <BulkSelectCheckbox id={row.id as string} label={`Select invoice ${row.invoiceNumber}`} />
                    </td>
                    <td className="p-0 align-top"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors">
                      <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
                        {row.invoiceNumber}
                        {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
                        {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
                      </span>
                      {(row.attention.reasons.length > 0 || row.attention.nextStep) && (
                        <div className="mt-1.5">
                          <AttentionChips reasons={row.attention.reasons} nextStep={row.attention.nextStep} size="xs" />
                        </div>
                      )}
                    </Link></td>
                    <td className="p-0 align-top"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-700">{row.clientName}</Link></td>
                    <td className="p-0 align-top"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors"><StatusBadge kind="invoice" status={row.status} /></Link></td>
                    <td className="p-0 align-top"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(row.dateIssued)}</Link></td>
                    <td className="p-0 align-top"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-sage-600">{fmtDate(row.dueDate)}</Link></td>
                    <td className="p-0 align-top"><Link href={`/portal/invoices/${row.id}`} className="block px-5 py-3 group-hover:bg-gray-50 transition-colors text-right font-medium text-sage-800">{fmt(row.total)}</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.id} className={clsx('flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors', (row.isTest || row.isArchived) && 'opacity-60')}>
                <div className="pt-1">
                  <BulkSelectCheckbox id={row.id as string} label={`Select invoice ${row.invoiceNumber}`} />
                </div>
                <Link href={`/portal/invoices/${row.id}`} className="block flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                  <span className="font-medium text-sage-800 inline-flex items-center gap-1.5">
                    {row.invoiceNumber}
                    {row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5"><FlaskConical size={9} /> Test</span>}
                    {row.isArchived && !row.isTest && <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide font-semibold text-sage-600 bg-sage-100 rounded-full px-1.5 py-0.5"><Archive size={9} /> Archived</span>}
                  </span>
                  <StatusBadge kind="invoice" status={row.status} />
                </div>
                {(row.attention.reasons.length > 0 || row.attention.nextStep) && (
                  <div className="mb-1">
                    <AttentionChips reasons={row.attention.reasons} nextStep={row.attention.nextStep} size="xs" />
                  </div>
                )}
                <div className="text-sage-600 text-sm">{row.clientName}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-sage-500">
                  <span>{fmtDate(row.dateIssued)}</span>
                  <span className="font-medium text-sage-800 text-sm">{fmt(row.total)}</span>
                </div>
              </Link>
              </div>
            ))}
          </div>
        </div>
        </BulkSelectProvider>
      )}
    </div>
  )
}
