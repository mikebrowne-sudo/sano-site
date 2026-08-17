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
  ArrowLeft, ArrowRight, Wallet, ClipboardCheck, Landmark, CircleDashed,
  Banknote, Receipt, Car, Layers, FileInput, FolderOpen, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isFinanceUser } from '@/lib/is-admin'
import { formatCurrency, formatDate } from '@/lib/format'
import { loadContractorPayOverview, loadEmployeePayOverview } from '@/lib/pay-overview-data'

export const dynamic = 'force-dynamic'

export default async function PayHubPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const [contractor, employee] = await Promise.all([
    loadContractorPayOverview(supabase),
    loadEmployeePayOverview(supabase),
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

      {/* ── Contractors ────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-sage-800 mb-3">Contractors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="rounded-2xl border border-sage-200 bg-white p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-sage-400 mb-1">
              <Wallet size={12} /> Ready to pay
            </div>
            <div className="text-2xl font-bold text-sage-800 tabular-nums">{formatCurrency(contractor.readyTotal)}</div>
            <div className="text-xs text-sage-500 mt-0.5">
              {contractor.payeeCount} payee{contractor.payeeCount === 1 ? '' : 's'} · {contractor.payItemCount} pay item{contractor.payItemCount === 1 ? '' : 's'}
            </div>
          </div>
          <div className={clsx('rounded-2xl border p-4', awaiting.length > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-sage-200 bg-white')}>
            <div className={clsx('flex items-center gap-1.5 text-[11px] uppercase tracking-wide mb-1', awaiting.length > 0 ? 'text-amber-600' : 'text-sage-400')}>
              <ClipboardCheck size={12} /> Awaiting approval
            </div>
            <div className={clsx('text-2xl font-bold tabular-nums', awaiting.length > 0 ? 'text-amber-800' : 'text-sage-800')}>{awaiting.length}</div>
            <div className={clsx('text-xs mt-0.5', awaiting.length > 0 ? 'text-amber-700' : 'text-sage-500')}>
              {awaiting.length === 0 ? 'Nothing to approve' : `job${awaiting.length === 1 ? '' : 's'} to approve`}
            </div>
          </div>
          <div className="rounded-2xl border border-sage-200 bg-white p-4">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-sage-400 mb-1">
              <Landmark size={12} /> Awaiting bank confirmation
            </div>
            <div className="text-2xl font-bold text-sage-800 tabular-nums">{formatCurrency(contractor.awaitingBankTotal)}</div>
            <div className="text-xs text-sage-500 mt-0.5">
              {contractor.awaitingBankCount} payment{contractor.awaitingBankCount === 1 ? '' : 's'}
              {contractor.partlyConfirmedCount > 0 && (
                <span className="inline-flex items-center gap-1 ml-1 text-amber-700">
                  <CircleDashed size={10} /> {contractor.partlyConfirmedCount} partly
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <HubAction href="/portal/contractor-invoices/pay-run" icon={Wallet} label="Contractor pay" primary />
          <HubAction href="/portal/contractor-invoices/remittances" icon={FolderOpen} label="Payment history" />
          <HubAction href="/portal/contractor-invoices" icon={FileInput} label="Contractor invoices" />
        </div>
      </section>

      {/* ── Employees ──────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-sage-800 mb-3">Employees</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="rounded-2xl border border-sage-200 bg-white p-4">
            <div className="text-[11px] uppercase tracking-wide text-sage-400 mb-1">On payroll</div>
            <div className="text-2xl font-bold text-sage-800 tabular-nums">{employee.activeEmployees}</div>
            <div className="text-xs text-sage-500 mt-0.5">active employee{employee.activeEmployees === 1 ? '' : 's'}</div>
          </div>
          <div className="rounded-2xl border border-sage-200 bg-white p-4 sm:col-span-2">
            <div className="text-[11px] uppercase tracking-wide text-sage-400 mb-1">
              {employee.latestRun?.status === 'draft' ? 'Draft pay run' : 'Latest pay run'}
            </div>
            {employee.latestRun ? (
              <>
                <div className="text-2xl font-bold text-sage-800 tabular-nums">{formatCurrency(employee.latestRun.netTotal)}</div>
                <div className="text-xs text-sage-500 mt-0.5">
                  {employee.latestRun.lineCount} employee{employee.latestRun.lineCount === 1 ? '' : 's'}
                  {employee.latestRun.payDate && <> · pay date {formatDate(employee.latestRun.payDate)}</>}
                  {employee.latestRun.status && <> · {employee.latestRun.status}</>}
                </div>
              </>
            ) : (
              <div className="text-sm text-sage-400 mt-1">No pay runs yet.</div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <HubAction href="/portal/payroll" icon={Banknote} label="Employee payroll" primary />
          <HubAction href="/portal/payroll/ird" icon={Receipt} label="IRD liabilities" />
          <HubAction href="/portal/mileage" icon={Car} label="Mileage" />
        </div>
      </section>

      {/* ── Records ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[11px] uppercase tracking-wide text-sage-400 mb-2">Records</h2>
        <div className="flex flex-wrap gap-2">
          <HubAction href="/portal/payroll/contractor-withholding" icon={Receipt} label="Schedular withholding" />
          <HubAction href="/portal/finance/reconcile-out" icon={Landmark} label="Bank reconciliation" />
          <HubAction href="/portal/contractor-statements" icon={Layers} label="Contractor statements (historical)" />
        </div>
      </section>
    </div>
  )
}

function HubAction({
  href, icon: Icon, label, primary,
}: {
  href: string
  icon: LucideIcon
  label: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex items-center gap-2 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors',
        primary
          ? 'bg-sage-500 text-white hover:bg-sage-700'
          : 'bg-white border border-sage-200 text-sage-700 hover:bg-sage-50',
      )}
    >
      <Icon size={15} /> {label}
    </Link>
  )
}
