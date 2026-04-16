import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { FileText, Receipt, Plus, ArrowRight, DollarSign, Clock } from 'lucide-react'
import clsx from 'clsx'

const QUOTE_STATUS: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
}

const INVOICE_STATUS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PortalDashboard() {
  const supabase = createClient()

  const [
    { data: recentQuotes },
    { data: recentInvoices },
    { count: totalQuotes },
    { count: totalInvoices },
    { count: paidInvoices },
    { data: sentInvoices },
  ] = await Promise.all([
    supabase
      .from('quotes')
      .select('id, quote_number, status, created_at, clients ( name )')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, due_date, created_at, clients ( name )')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('quotes').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('invoices').select('id, due_date').eq('status', 'sent'),
  ])

  // Calculate outstanding = sent + overdue (UI)
  const today = new Date().toISOString().slice(0, 10)
  const outstandingCount = sentInvoices?.length ?? 0

  // Overdue display for invoice rows
  function invoiceDisplayStatus(status: string, dueDate: string | null) {
    if (status === 'sent' && dueDate && dueDate < today) return 'overdue'
    return status
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-sage-800 mb-6">Dashboard</h1>

      {/* ── Quick actions ───────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/portal/quotes/new"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          <Plus size={16} />
          New Quote
        </Link>
        <Link
          href="/portal/quotes"
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
        >
          <FileText size={16} />
          View Quotes
        </Link>
        <Link
          href="/portal/invoices"
          className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
        >
          <Receipt size={16} />
          View Invoices
        </Link>
      </div>

      {/* ── Summary cards ───────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <SummaryCard icon={FileText} label="Quotes" value={totalQuotes ?? 0} />
        <SummaryCard icon={Receipt} label="Invoices" value={totalInvoices ?? 0} />
        <SummaryCard icon={Clock} label="Outstanding" value={outstandingCount} accent={outstandingCount > 0 ? 'amber' : undefined} />
        <SummaryCard icon={DollarSign} label="Paid" value={paidInvoices ?? 0} accent="emerald" />
      </div>

      {/* ── Recent activity ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-sage-100">
            <h2 className="text-sm font-semibold text-sage-800">Recent Quotes</h2>
            <Link href="/portal/quotes" className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {(!recentQuotes || recentQuotes.length === 0) ? (
            <div className="px-5 py-8 text-center text-sm text-sage-500">No quotes yet.</div>
          ) : (
            <div className="divide-y divide-sage-50">
              {recentQuotes.map((q) => {
                const client = q.clients as unknown as { name: string } | null
                return (
                  <Link key={q.id} href={`/portal/quotes/${q.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-sage-50/50 transition-colors">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-sage-800">{q.quote_number}</span>
                      <span className="text-sage-500 text-xs ml-2">{client?.name ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-sage-400">{fmtDate(q.created_at)}</span>
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', QUOTE_STATUS[q.status] ?? QUOTE_STATUS.draft)}>
                        {q.status}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-sage-100">
            <h2 className="text-sm font-semibold text-sage-800">Recent Invoices</h2>
            <Link href="/portal/invoices" className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {(!recentInvoices || recentInvoices.length === 0) ? (
            <div className="px-5 py-8 text-center text-sm text-sage-500">No invoices yet.</div>
          ) : (
            <div className="divide-y divide-sage-50">
              {recentInvoices.map((inv) => {
                const client = inv.clients as unknown as { name: string } | null
                const status = invoiceDisplayStatus(inv.status, inv.due_date)
                return (
                  <Link key={inv.id} href={`/portal/invoices/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-sage-50/50 transition-colors">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-sage-800">{inv.invoice_number}</span>
                      <span className="text-sage-500 text-xs ml-2">{client?.name ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-sage-400">{fmtDate(inv.created_at)}</span>
                      <span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', INVOICE_STATUS[status] ?? INVOICE_STATUS.draft)}>
                        {status}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number
  accent?: 'emerald' | 'amber'
}) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 p-5">
      <div className="flex items-center gap-2.5 mb-2">
        <Icon size={16} className={clsx(
          accent === 'emerald' ? 'text-emerald-600' :
          accent === 'amber' ? 'text-amber-600' :
          'text-sage-500',
        )} />
        <span className="text-sm font-medium text-sage-600">{label}</span>
      </div>
      <p className={clsx(
        'text-2xl font-bold',
        accent === 'emerald' ? 'text-emerald-700' :
        accent === 'amber' ? 'text-amber-700' :
        'text-sage-800',
      )}>
        {value}
      </p>
    </div>
  )
}
