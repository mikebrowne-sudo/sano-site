// Phase 1.6 — dashboard composition rebuild.
//
// Data fetches, route targets, and queries are unchanged from the prior
// version. Only the visual composition has been reworked: header row,
// compact attention strip, primary KPI row (4 large cards instead of 6
// equal ones), unified operations strip (one panel instead of 4 coloured
// pills), and a labelled recent-activity section.

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import {
  FileText, Receipt, ArrowRight, DollarSign, Clock,
  AlertTriangle, Bell, CalendarDays,
} from 'lucide-react'
import clsx from 'clsx'
import { StatusBadge } from './_components/StatusBadge'
import { CreateMenu } from './_components/CreateMenu'
import { computeInvoiceDisplayStatus } from '@/lib/quote-status'

export default async function PortalDashboard() {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const todayLabel = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

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
    supabase.from('quotes').select('id, quote_number, status, created_at, clients ( name )').is('deleted_at', null).eq('is_latest_version', true).order('created_at', { ascending: false }).limit(5),
    supabase.from('invoices').select('id, invoice_number, status, due_date, created_at, clients ( name )').is('deleted_at', null).order('created_at', { ascending: false }).limit(5),
    supabase.from('jobs').select('id, job_number, title, status, scheduled_date, assigned_to').order('created_at', { ascending: false }).limit(5),
    supabase.from('quotes').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('is_latest_version', true),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'paid'),
    supabase.from('invoices').select('id, due_date').is('deleted_at', null).eq('status', 'sent'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).is('contractor_id', null).neq('status', 'completed').neq('status', 'invoiced'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('scheduled_date', today).neq('status', 'completed').neq('status', 'invoiced'),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('worker_training_assignments').select('*', { count: 'exact', head: true }).neq('status', 'completed').not('due_date', 'is', null).lt('due_date', today),
  ])

  const outstandingCount = sentInvoices?.length ?? 0
  const overdueCount = (sentInvoices ?? []).filter((i) => i.due_date && i.due_date < today).length

  const alerts: { label: string; href: string; tone: 'amber' | 'red' }[] = []
  if ((unassignedJobs ?? 0) > 0) {
    alerts.push({
      label: `${unassignedJobs} unassigned job${unassignedJobs !== 1 ? 's' : ''}`,
      href: '/portal/jobs?view=unassigned',
      tone: 'amber',
    })
  }
  if (overdueCount > 0) {
    alerts.push({
      label: `${overdueCount} overdue invoice${overdueCount !== 1 ? 's' : ''}`,
      href: '/portal/alerts',
      tone: 'red',
    })
  }
  if ((overdueTraining ?? 0) > 0) {
    alerts.push({
      label: `${overdueTraining} overdue training item${overdueTraining !== 1 ? 's' : ''}`,
      href: '/portal/alerts',
      tone: 'amber',
    })
  }

  return (
    <div className="space-y-8">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sage-800 tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-sm text-sage-500">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Secondary actions — quieter ghost style so the primary
              "Create" button is the only thing the eye lands on first. */}
          <Link
            href="/portal/jobs/calendar"
            className="inline-flex items-center gap-1.5 text-sage-600 hover:text-sage-800 hover:bg-gray-100/70 font-medium px-3 py-2 rounded-lg text-sm transition-colors duration-150"
          >
            <CalendarDays size={15} /> Calendar
          </Link>
          <Link
            href="/portal/alerts"
            className="inline-flex items-center gap-1.5 text-sage-600 hover:text-sage-800 hover:bg-gray-100/70 font-medium px-3 py-2 rounded-lg text-sm transition-colors duration-150"
          >
            <Bell size={15} /> Alerts
          </Link>
          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" aria-hidden />
          <CreateMenu />
        </div>
      </header>

      {/* ── Attention strip ────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl px-5 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-amber-700 font-semibold">
              <AlertTriangle size={14} />
              <span>Needs attention</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-amber-200/70" />
            {alerts.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="inline-flex items-center gap-1.5 text-amber-800 hover:text-amber-900 font-medium transition-colors"
              >
                <span
                  className={clsx(
                    'h-1.5 w-1.5 rounded-full',
                    a.tone === 'red' ? 'bg-red-500' : 'bg-amber-500',
                  )}
                />
                {a.label}
              </Link>
            ))}
            <Link
              href="/portal/alerts"
              className="ml-auto inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium transition-colors"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Primary KPIs ───────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={FileText}
            label="Active quotes"
            value={totalQuotes ?? 0}
            hint="latest versions"
            href="/portal/quotes"
          />
          <KpiCard
            icon={Receipt}
            label="Active invoices"
            value={totalInvoices ?? 0}
            hint="all-time"
            href="/portal/invoices"
          />
          <KpiCard
            icon={DollarSign}
            label="Paid"
            value={paidInvoices ?? 0}
            hint="invoices closed"
            accent="emerald"
            href="/portal/finance"
          />
          <KpiCard
            icon={Clock}
            label="Outstanding"
            value={outstandingCount}
            hint={outstandingCount > 0 ? 'awaiting payment' : 'all clear'}
            accent={outstandingCount > 0 ? 'amber' : undefined}
            href="/portal/invoices"
          />
        </div>
      </section>

      {/* ── Operations strip ───────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-500 px-1">
          Operations today
        </h2>
        {/* Grid hairlines via the classic "gap-px on a tinted parent"
            trick — gives clean 1px dividers between cells regardless
            of how the grid wraps at each breakpoint. */}
        <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden bg-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px">
            <OpStat label="All jobs"        value={totalJobs ?? 0}      href="/portal/jobs" />
            <OpStat label="Today"           value={todayJobs ?? 0}      href="/portal/jobs?view=today"          tone={(todayJobs ?? 0) > 0 ? 'blue' : undefined} />
            <OpStat label="Unassigned"      value={unassignedJobs ?? 0} href="/portal/jobs?view=unassigned"     tone={(unassignedJobs ?? 0) > 0 ? 'amber' : undefined} />
            <OpStat label="In progress"     value={inProgressJobs ?? 0} href="/portal/jobs?view=in_progress"    tone={(inProgressJobs ?? 0) > 0 ? 'blue' : undefined} />
            <OpStat label="Overdue inv."    value={overdueCount}        href="/portal/alerts"                   tone={overdueCount > 0 ? 'red' : undefined} />
            <OpStat label="Overdue training" value={overdueTraining ?? 0} href="/portal/alerts"                  tone={(overdueTraining ?? 0) > 0 ? 'amber' : undefined} />
          </div>
        </div>
      </section>

      {/* ── Recent activity ────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-500 px-1">
          Recent activity
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ActivityPanel title="Quotes" href="/portal/quotes" empty={!recentQuotes?.length}>
            {(recentQuotes ?? []).map((q) => {
              const client = q.clients as unknown as { name: string } | null
              return (
                <Link
                  key={q.id}
                  href={`/portal/quotes/${q.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors duration-150"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-sage-800 truncate">{q.quote_number}</div>
                    <div className="text-xs text-sage-500 truncate">{client?.name ?? '—'}</div>
                  </div>
                  <StatusBadge kind="quote" status={q.status} />
                </Link>
              )
            })}
          </ActivityPanel>

          <ActivityPanel title="Invoices" href="/portal/invoices" empty={!recentInvoices?.length}>
            {(recentInvoices ?? []).map((inv) => {
              const client = inv.clients as unknown as { name: string } | null
              const status = computeInvoiceDisplayStatus(inv.status, inv.due_date)
              return (
                <Link
                  key={inv.id}
                  href={`/portal/invoices/${inv.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors duration-150"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-sage-800 truncate">{inv.invoice_number}</div>
                    <div className="text-xs text-sage-500 truncate">{client?.name ?? '—'}</div>
                  </div>
                  <StatusBadge kind="invoice" status={status} />
                </Link>
              )
            })}
          </ActivityPanel>

          <ActivityPanel title="Jobs" href="/portal/jobs" empty={!recentJobs?.length}>
            {(recentJobs ?? []).map((j) => (
              <Link
                key={j.id}
                href={`/portal/jobs/${j.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50/70 transition-colors duration-150"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-sage-800 truncate">{j.job_number}</div>
                  <div className="text-xs text-sage-500 truncate">{j.assigned_to || 'Unassigned'}</div>
                </div>
                <StatusBadge kind="job" status={j.status ?? 'draft'} />
              </Link>
            ))}
          </ActivityPanel>
        </div>
      </section>
    </div>
  )
}

// ── Components ──────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, hint, accent, href,
}: {
  icon: React.ElementType
  label: string
  value: number
  hint?: string
  accent?: 'emerald' | 'amber' | 'blue'
  href?: string
}) {
  const valueColor =
    accent === 'emerald' ? 'text-emerald-700' :
    accent === 'amber'   ? 'text-amber-700'   :
    accent === 'blue'    ? 'text-blue-700'    :
    'text-sage-800'
  const iconColor =
    accent === 'emerald' ? 'text-emerald-600' :
    accent === 'amber'   ? 'text-amber-600'   :
    accent === 'blue'    ? 'text-blue-600'    :
    'text-sage-500'
  // Phase 1.7 — small tinted "tile" behind each KPI icon. Unifies the
  // icon language across the row and gives the dashboard a small
  // signature element without leaning on decoration.
  const iconTileBg =
    accent === 'emerald' ? 'bg-emerald-50' :
    accent === 'amber'   ? 'bg-amber-50'   :
    accent === 'blue'    ? 'bg-blue-50'    :
    'bg-sage-50'

  const content = (
    <div
      className={clsx(
        'group bg-white rounded-xl p-5 border border-gray-100 shadow-sm h-full',
        href && 'hover:shadow-md hover:border-gray-200 transition-all duration-150',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-sage-500 mt-1">
          {label}
        </span>
        <span className={clsx('shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg', iconTileBg)}>
          <Icon size={15} className={iconColor} />
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={clsx('text-3xl font-bold tabular-nums tracking-tight leading-none', valueColor)}>
          {value}
        </p>
        {hint && (
          <span className="text-[11px] text-sage-500 leading-none">{hint}</span>
        )}
      </div>
    </div>
  )
  return href ? <Link href={href} className="block h-full">{content}</Link> : content
}

function OpStat({
  label, value, href, tone,
}: {
  label: string
  value: number
  href: string
  tone?: 'amber' | 'red' | 'blue'
}) {
  const alerting = value > 0 && !!tone
  const dotColor =
    tone === 'red'   ? 'bg-red-500'   :
    tone === 'amber' ? 'bg-amber-500' :
    tone === 'blue'  ? 'bg-blue-500'  :
    'bg-transparent'
  // Phase 1.7 — soft halo around the dot so alerting cells read at a
  // glance without resorting to coloured backgrounds (which fight the
  // gap-px hairline trick used by the parent grid).
  const dotRing =
    tone === 'red'   ? 'ring-2 ring-red-100'   :
    tone === 'amber' ? 'ring-2 ring-amber-100' :
    tone === 'blue'  ? 'ring-2 ring-blue-100'  :
    ''
  const valueColor =
    tone === 'red'   ? 'text-red-700'   :
    tone === 'amber' ? 'text-amber-700' :
    tone === 'blue'  ? 'text-blue-700'  :
    'text-sage-800'
  // Phase 1.7 — when alerting, hover tints to the alert tone instead
  // of generic gray. Quiet by default, smarter on engagement.
  const hoverBg =
    !alerting        ? 'hover:bg-gray-50'   :
    tone === 'red'   ? 'hover:bg-red-50'    :
    tone === 'amber' ? 'hover:bg-amber-50'  :
    'hover:bg-blue-50'

  return (
    <Link
      href={href}
      className={clsx('block bg-white px-5 py-4 transition-colors duration-150', hoverBg)}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-sage-500 mb-1.5">
        {label}
      </div>
      <div className="flex items-center gap-2">
        {alerting && (
          <span className={clsx('h-2 w-2 rounded-full shrink-0', dotColor, dotRing)} />
        )}
        <span className={clsx('text-xl font-bold tabular-nums', valueColor)}>{value}</span>
      </div>
    </Link>
  )
}

function ActivityPanel({
  title, href, empty, children,
}: {
  title: string
  href: string
  empty?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-sage-800">{title}</h3>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs text-sage-500 hover:text-sage-700 transition-colors"
        >
          View all <ArrowRight size={12} />
        </Link>
      </div>
      {empty ? (
        <div className="px-5 py-12 text-center text-sm text-sage-400">No recent activity</div>
      ) : (
        <div className="divide-y divide-gray-50 flex-1">{children}</div>
      )}
    </div>
  )
}
