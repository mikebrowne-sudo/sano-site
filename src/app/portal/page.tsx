import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { FileText, Receipt, Briefcase, Plus, ArrowRight, DollarSign, Clock, AlertTriangle, BookOpen, Bell, CalendarDays } from 'lucide-react'
import clsx from 'clsx'

const QUOTE_STATUS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-50 text-blue-700',
  accepted: 'bg-emerald-50 text-emerald-700', declined: 'bg-red-50 text-red-700',
}
const INVOICE_STATUS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700', overdue: 'bg-amber-50 text-amber-700',
}
const JOB_STATUS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700', assigned: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700', completed: 'bg-emerald-50 text-emerald-700',
  invoiced: 'bg-purple-50 text-purple-700',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PortalDashboard() {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: recentQuotes },
    { data: recentInvoices },
    { data: recentJobs },
    { count: totalQuotes },
    { count: totalInvoices },
    { count: paidInvoices },
    { data: sentInvoices },
    { count: totalJobs },
    { count: unassignedJobs },
    { count: todayJobs },
    { count: inProgressJobs },
    { count: overdueTraining },
  ] = await Promise.all([
    supabase.from('quotes').select('id, quote_number, status, created_at, clients ( name )').order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('id, invoice_number, status, due_date, created_at, clients ( name )').order('created_at', { ascending: false }).limit(5),
    supabase.from('jobs').select('id, job_number, title, status, scheduled_date, assigned_to').order('created_at', { ascending: false }).limit(5),
    supabase.from('quotes').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
    supabase.from('invoices').select('id, due_date').eq('status', 'sent'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).is('contractor_id', null).neq('status', 'completed').neq('status', 'invoiced'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today).neq('status', 'completed').neq('status', 'invoiced'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('worker_training_assignments').select('*', { count: 'exact', head: true }).neq('status', 'completed').not('due_date', 'is', null).lt('due_date', today),
  ])

  const outstandingCount = sentInvoices?.length ?? 0
  const overdueInvoices = (sentInvoices ?? []).filter((i) => i.due_date && i.due_date < today)

  function invoiceDisplayStatus(status: string, dueDate: string | null) {
    if (status === 'sent' && dueDate && dueDate < today) return 'overdue'
    return status
  }

  const hasAlerts = (unassignedJobs ?? 0) > 0 || overdueInvoices.length > 0 || (overdueTraining ?? 0) > 0

  return (
    <div>
      <h1 className="text-2xl font-bold text-sage-800 mb-6">Dashboard</h1>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/portal/quotes/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Plus size={16} /> New Quote
        </Link>
        <Link href="/portal/jobs/new" className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
          <Plus size={16} /> New Job
        </Link>
        <Link href="/portal/jobs/calendar" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
          <CalendarDays size={16} /> Calendar
        </Link>
        <Link href="/portal/alerts" className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors">
          <Bell size={16} /> Alerts
        </Link>
      </div>

      {/* Attention needed */}
      {hasAlerts && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <h2 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2"><AlertTriangle size={14} /> Needs attention</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {(unassignedJobs ?? 0) > 0 && (
              <Link href="/portal/jobs?view=unassigned" className="text-amber-700 hover:text-amber-900 font-medium">
                {unassignedJobs} unassigned job{unassignedJobs !== 1 ? 's' : ''}
              </Link>
            )}
            {overdueInvoices.length > 0 && (
              <Link href="/portal/alerts" className="text-amber-700 hover:text-amber-900 font-medium">
                {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}
              </Link>
            )}
            {(overdueTraining ?? 0) > 0 && (
              <Link href="/portal/alerts" className="text-amber-700 hover:text-amber-900 font-medium">
                {overdueTraining} overdue training item{overdueTraining !== 1 ? 's' : ''}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        <SummaryCard icon={FileText} label="Quotes" value={totalQuotes ?? 0} href="/portal/quotes" />
        <SummaryCard icon={Receipt} label="Invoices" value={totalInvoices ?? 0} href="/portal/invoices" />
        <SummaryCard icon={DollarSign} label="Paid" value={paidInvoices ?? 0} accent="emerald" href="/portal/finance" />
        <SummaryCard icon={Clock} label="Outstanding" value={outstandingCount} accent={outstandingCount > 0 ? 'amber' : undefined} href="/portal/invoices" />
        <SummaryCard icon={Briefcase} label="Jobs" value={totalJobs ?? 0} href="/portal/jobs" />
        <SummaryCard icon={Briefcase} label="Today" value={todayJobs ?? 0} accent={(todayJobs ?? 0) > 0 ? 'blue' : undefined} href="/portal/jobs?view=today" />
      </div>

      {/* Operational row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <MiniCard label="Unassigned" value={unassignedJobs ?? 0} accent={unassignedJobs ? 'amber' : undefined} href="/portal/jobs?view=unassigned" />
        <MiniCard label="In progress" value={inProgressJobs ?? 0} accent={inProgressJobs ? 'blue' : undefined} href="/portal/jobs?view=in_progress" />
        <MiniCard label="Overdue invoices" value={overdueInvoices.length} accent={overdueInvoices.length > 0 ? 'red' : undefined} href="/portal/alerts" />
        <MiniCard label="Overdue training" value={overdueTraining ?? 0} accent={overdueTraining ? 'amber' : undefined} href="/portal/alerts" />
      </div>

      {/* Activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotes */}
        <ActivityPanel title="Recent Quotes" href="/portal/quotes" empty={!recentQuotes?.length}>
          {(recentQuotes ?? []).map((q) => {
            const client = q.clients as unknown as { name: string } | null
            return (
              <Link key={q.id} href={`/portal/quotes/${q.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-sage-50/50 transition-colors">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-sage-800">{q.quote_number}</span>
                  <span className="text-sage-500 text-xs ml-2">{client?.name ?? '—'}</span>
                </div>
                <span className={clsx('shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', QUOTE_STATUS[q.status] ?? QUOTE_STATUS.draft)}>{q.status}</span>
              </Link>
            )
          })}
        </ActivityPanel>

        {/* Recent Invoices */}
        <ActivityPanel title="Recent Invoices" href="/portal/invoices" empty={!recentInvoices?.length}>
          {(recentInvoices ?? []).map((inv) => {
            const client = inv.clients as unknown as { name: string } | null
            const status = invoiceDisplayStatus(inv.status, inv.due_date)
            return (
              <Link key={inv.id} href={`/portal/invoices/${inv.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-sage-50/50 transition-colors">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-sage-800">{inv.invoice_number}</span>
                  <span className="text-sage-500 text-xs ml-2">{client?.name ?? '—'}</span>
                </div>
                <span className={clsx('shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', INVOICE_STATUS[status] ?? INVOICE_STATUS.draft)}>{status}</span>
              </Link>
            )
          })}
        </ActivityPanel>

        {/* Recent Jobs */}
        <ActivityPanel title="Recent Jobs" href="/portal/jobs" empty={!recentJobs?.length}>
          {(recentJobs ?? []).map((j) => (
            <Link key={j.id} href={`/portal/jobs/${j.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-sage-50/50 transition-colors">
              <div className="min-w-0">
                <span className="text-sm font-medium text-sage-800">{j.job_number}</span>
                <span className="text-sage-500 text-xs ml-2">{j.assigned_to || 'Unassigned'}</span>
              </div>
              <span className={clsx('shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize', JOB_STATUS[j.status] ?? JOB_STATUS.draft)}>{j.status.replace('_', ' ')}</span>
            </Link>
          ))}
        </ActivityPanel>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, accent, href }: { icon: React.ElementType; label: string; value: number; accent?: 'emerald' | 'amber' | 'blue'; href?: string }) {
  const content = (
    <div className={clsx('bg-white rounded-xl border border-sage-100 p-4', href && 'hover:border-sage-300 transition-colors')}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={accent === 'emerald' ? 'text-emerald-600' : accent === 'amber' ? 'text-amber-600' : accent === 'blue' ? 'text-blue-600' : 'text-sage-500'} />
        <span className="text-xs font-medium text-sage-600">{label}</span>
      </div>
      <p className={clsx('text-xl font-bold', accent === 'emerald' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : accent === 'blue' ? 'text-blue-700' : 'text-sage-800')}>{value}</p>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function MiniCard({ label, value, accent, href }: { label: string; value: number; accent?: 'amber' | 'red' | 'blue'; href: string }) {
  return (
    <Link href={href} className={clsx('rounded-lg p-3 text-center transition-colors', accent === 'red' ? 'bg-red-50 hover:bg-red-100' : accent === 'amber' ? 'bg-amber-50 hover:bg-amber-100' : accent === 'blue' ? 'bg-blue-50 hover:bg-blue-100' : 'bg-sage-50 hover:bg-sage-100')}>
      <p className={clsx('text-lg font-bold', accent === 'red' ? 'text-red-700' : accent === 'amber' ? 'text-amber-700' : accent === 'blue' ? 'text-blue-700' : 'text-sage-800')}>{value}</p>
      <p className={clsx('text-xs font-medium', accent === 'red' ? 'text-red-600' : accent === 'amber' ? 'text-amber-600' : accent === 'blue' ? 'text-blue-600' : 'text-sage-500')}>{label}</p>
    </Link>
  )
}

function ActivityPanel({ title, href, empty, children }: { title: string; href: string; empty?: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-sage-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sage-100">
        <h2 className="text-sm font-semibold text-sage-800">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 transition-colors">
          View all <ArrowRight size={12} />
        </Link>
      </div>
      {empty ? (
        <div className="px-4 py-8 text-center text-sm text-sage-500">None yet</div>
      ) : (
        <div className="divide-y divide-sage-50">{children}</div>
      )}
    </div>
  )
}
