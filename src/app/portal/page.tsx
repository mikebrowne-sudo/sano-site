import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import {
  FileText,
  Receipt,
  Briefcase,
  Plus,
  ArrowRight,
  DollarSign,
  Clock,
  Bell,
  CalendarDays,
} from 'lucide-react'
import {
  PageHeader,
  SectionCard,
  KpiCard,
  MiniStat,
  StatusBadge,
  AttentionBanner,
  buttonClasses,
} from './_components/ui'

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

  const hasAlerts =
    (unassignedJobs ?? 0) > 0 ||
    overdueInvoices.length > 0 ||
    (overdueTraining ?? 0) > 0

  return (
    <div className="space-y-10">
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Link href="/portal/quotes/new" className={buttonClasses.primary}>
              <Plus size={16} /> New Quote
            </Link>
            <Link href="/portal/jobs/new" className={buttonClasses.primary}>
              <Plus size={16} /> New Job
            </Link>
            <Link href="/portal/jobs/calendar" className={buttonClasses.secondary}>
              <CalendarDays size={16} /> Calendar
            </Link>
            <Link href="/portal/alerts" className={buttonClasses.secondary}>
              <Bell size={16} /> Alerts
            </Link>
          </>
        }
      />

      {hasAlerts && (
        <AttentionBanner>
          {(unassignedJobs ?? 0) > 0 && (
            <Link
              href="/portal/jobs?view=unassigned"
              className="text-sage-700 hover:text-sage-900 font-medium transition-colors"
            >
              {unassignedJobs} unassigned job{unassignedJobs !== 1 ? 's' : ''}
            </Link>
          )}
          {overdueInvoices.length > 0 && (
            <Link
              href="/portal/alerts"
              className="text-sage-700 hover:text-sage-900 font-medium transition-colors"
            >
              {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}
            </Link>
          )}
          {(overdueTraining ?? 0) > 0 && (
            <Link
              href="/portal/alerts"
              className="text-sage-700 hover:text-sage-900 font-medium transition-colors"
            >
              {overdueTraining} overdue training item{overdueTraining !== 1 ? 's' : ''}
            </Link>
          )}
        </AttentionBanner>
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sage-500 mb-3">
          Totals
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard icon={FileText} label="Quotes" value={totalQuotes ?? 0} href="/portal/quotes" />
          <KpiCard icon={Receipt} label="Invoices" value={totalInvoices ?? 0} href="/portal/invoices" />
          <KpiCard icon={DollarSign} label="Paid" value={paidInvoices ?? 0} accent="emerald" href="/portal/finance" />
          <KpiCard icon={Clock} label="Outstanding" value={outstandingCount} accent={outstandingCount > 0 ? 'amber' : 'neutral'} href="/portal/invoices" />
          <KpiCard icon={Briefcase} label="Jobs" value={totalJobs ?? 0} href="/portal/jobs" />
          <KpiCard icon={Briefcase} label="Today" value={todayJobs ?? 0} accent={(todayJobs ?? 0) > 0 ? 'blue' : 'neutral'} href="/portal/jobs?view=today" />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sage-500 mb-3">
          Operations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MiniStat
            label="Unassigned"
            value={unassignedJobs ?? 0}
            accent={unassignedJobs ? 'amber' : 'neutral'}
            href="/portal/jobs?view=unassigned"
          />
          <MiniStat
            label="In progress"
            value={inProgressJobs ?? 0}
            accent={inProgressJobs ? 'blue' : 'neutral'}
            href="/portal/jobs?view=in_progress"
          />
          <MiniStat
            label="Overdue invoices"
            value={overdueInvoices.length}
            accent={overdueInvoices.length > 0 ? 'red' : 'neutral'}
            href="/portal/alerts"
          />
          <MiniStat
            label="Overdue training"
            value={overdueTraining ?? 0}
            accent={overdueTraining ? 'amber' : 'neutral'}
            href="/portal/alerts"
          />
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-sage-500 mb-3">
          Recent activity
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SectionCard
            title="Recent Quotes"
            action={
              <Link
                href="/portal/quotes"
                className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 transition-colors"
              >
                View all <ArrowRight size={12} />
              </Link>
            }
            empty={!recentQuotes?.length}
            emptyMessage="No quotes yet."
          >
            {(recentQuotes ?? []).map((q) => {
              const client = q.clients as unknown as { name: string } | null
              return (
                <Link
                  key={q.id}
                  href={`/portal/quotes/${q.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sage-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-sage-800">{q.quote_number}</span>
                    <span className="text-sage-500 text-xs ml-2">{client?.name ?? '—'}</span>
                  </div>
                  <StatusBadge kind="quote" status={q.status} />
                </Link>
              )
            })}
          </SectionCard>

          <SectionCard
            title="Recent Invoices"
            action={
              <Link
                href="/portal/invoices"
                className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 transition-colors"
              >
                View all <ArrowRight size={12} />
              </Link>
            }
            empty={!recentInvoices?.length}
            emptyMessage="No invoices yet."
          >
            {(recentInvoices ?? []).map((inv) => {
              const client = inv.clients as unknown as { name: string } | null
              const status = invoiceDisplayStatus(inv.status, inv.due_date)
              return (
                <Link
                  key={inv.id}
                  href={`/portal/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sage-50/50 transition-colors"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-sage-800">{inv.invoice_number}</span>
                    <span className="text-sage-500 text-xs ml-2">{client?.name ?? '—'}</span>
                  </div>
                  <StatusBadge kind="invoice" status={status} />
                </Link>
              )
            })}
          </SectionCard>

          <SectionCard
            title="Recent Jobs"
            action={
              <Link
                href="/portal/jobs"
                className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 transition-colors"
              >
                View all <ArrowRight size={12} />
              </Link>
            }
            empty={!recentJobs?.length}
            emptyMessage="No jobs yet."
          >
            {(recentJobs ?? []).map((j) => (
              <Link
                key={j.id}
                href={`/portal/jobs/${j.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-sage-50/50 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-sage-800">{j.job_number}</span>
                  <span className="text-sage-500 text-xs ml-2">{j.assigned_to || 'Unassigned'}</span>
                </div>
                <StatusBadge kind="job" status={j.status} />
              </Link>
            ))}
          </SectionCard>
        </div>
      </section>
    </div>
  )
}
