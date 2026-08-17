// Pay hub (Phase 5) — an operational overview, not just navigation.
//
// Answers "what's the state of pay across the business right now?" in one
// glance, then routes to the two workspaces that do the work:
//   Contractors -> Current pay · Payment history
//   Employees   -> Payroll · IRD liabilities · Mileage
//
// Every contractor figure is derived exactly the way Contractor Pay and Payment
// History derive it (see lib/pay-overview-data.ts), so the hub can never
// disagree with the screens it links to.
//
// Read-only: viewing this page changes no payment state.
//
// Retired concepts are deliberately absent from the primary layout — contractor
// statements and the legacy contractor pay-run track are gone from the actions;
// the statements archive is kept only as a small labelled historical link, since
// the records still exist.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowLeft, ArrowRight, Wallet, Landmark, Banknote, FolderOpen, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { buttonClasses } from '../_components/Button'
import { isFinanceUser } from '@/lib/is-admin'
import { formatCurrency, formatDate } from '@/lib/format'
import { loadContractorPayOverview, loadEmployeePayOverview } from '@/lib/pay-overview-data'
import { loadAwaitingPayment } from '@/lib/awaiting-payment-data'

export const dynamic = 'force-dynamic'

export default async function PayHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const [contractor, employee, awaitingPayment] = await Promise.all([
    loadContractorPayOverview(supabase),
    loadEmployeePayOverview(supabase),
    loadAwaitingPayment(supabase),
  ])

  // Jobs still needing pay approval — the same source Contractor Pay uses.
  const { loadApprovalRows, awaitingAuthorisation } = await import('@/lib/contractor-pay-approvals-data')
  const awaiting = awaitingAuthorisation(await loadApprovalRows(supabase))

  // Needs attention — only genuinely actionable things. A payment waiting on
  // bank reconciliation is NORMAL and is reported as information, not an alert.
  const attention: { label: string; href: string; tone: 'amber' | 'sage' }[] = []
  if (awaiting.length > 0) {
    attention.push({
      label: `${awaiting.length} completed job${awaiting.length === 1 ? '' : 's'} awaiting pay approval`,
      href: '/portal/contractor-invoices/pay-run', tone: 'amber',
    })
  }
  if (contractor.partlyConfirmedCount > 0) {
    attention.push({
      label: `${contractor.partlyConfirmedCount} payment${contractor.partlyConfirmedCount === 1 ? '' : 's'} only partly matched to the bank`,
      href: '/portal/finance/reconcile-out', tone: 'amber',
    })
  }
  if (employee.draftRunCount > 0) {
    attention.push({
      label: `${employee.draftRunCount} draft employee pay run${employee.draftRunCount === 1 ? '' : 's'} to review`,
      href: '/portal/payroll', tone: 'sage',
    })
  }
  if (employee.unreimbursedMileage > 0) {
    attention.push({
      label: `${employee.unreimbursedMileage} mileage log${employee.unreimbursedMileage === 1 ? '' : 's'} not yet reimbursed`,
      href: '/portal/mileage', tone: 'sage',
    })
  }

  return (
    <div className="max-w-5xl">
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Pay</h1>
      <p className="text-sm text-sage-500 mb-6 max-w-2xl">
        Where contractor and employee pay stands right now.
      </p>

      {attention.length > 0 && (
        <section className="mb-6 rounded-2xl border border-sage-200 bg-white p-4">
          <h2 className="text-[11px] uppercase tracking-wide text-sage-400 mb-2">Needs attention</h2>
          <ul className="space-y-1.5">
            {attention.map((a) => (
              <li key={a.href + a.label}>
                <Link href={a.href} className="flex items-center gap-2 text-sm text-sage-700 hover:text-sage-900 group">
                  <AlertTriangle size={13} className={a.tone === 'amber' ? 'text-amber-500' : 'text-sage-400'} />
                  <span className="group-hover:underline">{a.label}</span>
                  <ArrowRight size={13} className="text-sage-300 group-hover:text-sage-500" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Four primary cards. Each is a SUMMARY + one obvious way in — detail
          belongs on the destination page, not here. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 1 — Contractor Pay: the main operational card. */}
        <PayCard
          icon={Wallet}
          title="Contractor Pay"
          href="/portal/contractor-invoices/pay-run"
          actionLabel="Open Contractor Pay"
          primary
          stats={[
            {
              label: 'Awaiting payment',
              value: formatCurrency(awaitingPayment.total),
              detail: `${awaitingPayment.remittanceCount} remittance${awaitingPayment.remittanceCount === 1 ? '' : 's'} prepared`,
              accent: awaitingPayment.remittanceCount > 0,
            },
            {
              label: 'Ready to pay',
              value: formatCurrency(contractor.readyTotal),
              detail: `${contractor.payeeCount} payee${contractor.payeeCount === 1 ? '' : 's'} · ${contractor.payItemCount} job${contractor.payItemCount === 1 ? '' : 's'}`,
            },
            {
              label: 'Awaiting approval',
              value: String(awaiting.length),
              detail: awaiting.length === 0 ? 'nothing to approve' : `job${awaiting.length === 1 ? '' : 's'} to approve`,
              accent: awaiting.length > 0,
            },
          ]}
        />

        {/* 2 — Employee Pay: deliberately separate from contractor pay. */}
        <PayCard
          icon={Banknote}
          title="Employee Pay"
          href="/portal/payroll"
          actionLabel="Open Employee Payroll"
          stats={[
            {
              label: 'On payroll',
              value: String(employee.activeEmployees),
              detail: `active employee${employee.activeEmployees === 1 ? '' : 's'}`,
            },
            {
              label: employee.latestRun?.status === 'draft' ? 'Draft pay run' : 'Latest pay run',
              value: employee.latestRun ? formatCurrency(employee.latestRun.netTotal) : '—',
              detail: employee.latestRun
                ? `${employee.latestRun.lineCount} employee${employee.latestRun.lineCount === 1 ? '' : 's'}${employee.latestRun.payDate ? ` · ${formatDate(employee.latestRun.payDate)}` : ''}`
                : 'no pay runs yet',
              accent: employee.latestRun?.status === 'draft',
            },
          ]}
        />

        {/* 3 — Payment History: reference, not where payments are built. */}
        <PayCard
          icon={FolderOpen}
          title="Payment History"
          href="/portal/contractor-invoices/remittances"
          actionLabel="View Payment History"
          stats={[
            {
              label: 'Awaiting bank confirmation',
              value: formatCurrency(contractor.awaitingBankTotal),
              detail: `${contractor.awaitingBankCount} payment${contractor.awaitingBankCount === 1 ? '' : 's'}${contractor.partlyConfirmedCount > 0 ? ` · ${contractor.partlyConfirmedCount} partly` : ''}`,
            },
            {
              label: 'Bank confirmed',
              value: String(contractor.confirmedCount),
              detail: `payment${contractor.confirmedCount === 1 ? '' : 's'} matched to the bank`,
            },
          ]}
        />

        {/* 4 — IRD & Reconciliation: the finance follow-up tasks. */}
        <PayCard
          icon={Landmark}
          title="IRD &amp; Reconciliation"
          href="/portal/finance/reconcile-out"
          actionLabel="Bank reconciliation"
          secondary={[
            { href: '/portal/payroll/ird', label: 'IRD liabilities' },
            { href: '/portal/payroll/contractor-withholding', label: 'Schedular withholding' },
          ]}
          stats={[
            {
              label: 'Unreconciled payments',
              value: String(contractor.awaitingBankCount + contractor.partlyConfirmedCount),
              detail: 'paid, not yet matched to the bank',
              accent: contractor.awaitingBankCount + contractor.partlyConfirmedCount > 0,
            },
          ]}
        />
      </div>

      {/* Supporting records stay reachable without competing with the cards. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sage-500">
        <span className="uppercase tracking-wide text-[11px] text-sage-400">Also</span>
        <Link href="/portal/contractor-invoices" className="hover:text-sage-700 underline">Contractor invoices</Link>
        <Link href="/portal/mileage" className="hover:text-sage-700 underline">Mileage</Link>
        <Link href="/portal/contractors" className="hover:text-sage-700 underline">Workforce</Link>
        <Link href="/portal/contractor-statements" className="hover:text-sage-700 underline">Contractor statements (historical)</Link>
      </div>
    </div>
  )
}

interface PayCardStat {
  label: string
  value: string
  detail: string
  accent?: boolean
}

/** One primary Pay card: a few headline figures and one obvious way in. */
function PayCard({
  icon: Icon, title, href, actionLabel, stats, primary, secondary,
}: {
  icon: LucideIcon
  title: string
  href: string
  actionLabel: string
  stats: PayCardStat[]
  primary?: boolean
  secondary?: { href: string; label: string }[]
}) {
  return (
    <section className="rounded-xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col">
      <h2 className="flex items-center gap-2 text-base font-semibold text-sage-800 mb-3">
        <Icon size={16} className="text-sage-500" /> {title}
      </h2>

      <dl className="space-y-2 flex-1">
        {stats.map((s) => (
          <div key={s.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-sage-600">{s.label}</dt>
            <dd className="text-right">
              <span className={clsx('font-semibold tabular-nums', s.accent ? 'text-amber-700' : 'text-sage-800')}>
                {s.value}
              </span>
              <span className="block text-[11px] text-sage-400">{s.detail}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={href} className={buttonClasses({ variant: primary ? 'primary' : 'secondary', size: 'sm' })}>
          {actionLabel}
        </Link>
        {secondary?.map((s) => (
          <Link key={s.href} href={s.href} className="text-xs text-sage-600 hover:text-sage-800 underline">
            {s.label}
          </Link>
        ))}
      </div>
    </section>
  )
}
