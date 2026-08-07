import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import { AlertTriangle, Briefcase, Receipt, BookOpen, CalendarDays, ShieldCheck, CalendarClock } from 'lucide-react'
import { RunJobReminders, RunTrainingReminders } from './_components/ReminderButtons'
import { computeComplianceStatus } from '@/lib/contractor-compliance'
import { ComplianceBadge } from '../contractors/_components/ComplianceBadge'
import clsx from 'clsx'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtCurrency(d: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d)
}

export default async function AlertsPage() {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)
  // Unassigned jobs only count as "needs attention" if recent/upcoming — a
  // 30-day floor drops abandoned old drafts from the alert (still reachable on
  // the jobs list). Anything scheduled on/after this date, or undated, shows.
  const staleFloor = new Date()
  staleFloor.setDate(staleFloor.getDate() - 30)
  const staleFloorStr = staleFloor.toISOString().slice(0, 10)
  // Renewals surface once they're within 30 days.
  const in30 = new Date()
  in30.setDate(in30.getDate() + 30)
  const in30Str = in30.toISOString().slice(0, 10)

  // Load all alert data in parallel
  const [
    { data: allUnassigned },
    { data: todayJobs, count: todayCount },
    { data: tomorrowJobs, count: tomorrowCount },
    { data: overdueInvoices, count: overdueInvCount },
    { data: overdueTraining, count: overdueTrainingCount },
    { data: activeContractors },
    { data: salesFollowUps },
    { data: salesRenewals },
  ] = await Promise.all([
    // Unassigned, live, not completed/invoiced. Split into recent/upcoming
    // ("active", shown) vs older-than-30-days ("stale", hidden) in JS below.
    supabase.from('jobs')
      .select('id, job_number, title, scheduled_date, status')
      .is('contractor_id', null)
      .is('deleted_at', null).eq('is_test', false)
      .neq('status', 'completed').neq('status', 'invoiced')
      .order('scheduled_date', { ascending: true, nullsFirst: false }),
    // Today's jobs
    supabase.from('jobs')
      .select('id, job_number, title, assigned_to, status, scheduled_time', { count: 'exact' })
      .eq('scheduled_date', today)
      .neq('status', 'completed').neq('status', 'invoiced')
      .order('scheduled_time', { ascending: true, nullsFirst: false }),
    // Tomorrow's jobs (for reminders)
    supabase.from('jobs')
      .select('id, job_number, title, assigned_to, contractor_id, scheduled_time, last_reminder_sent_at', { count: 'exact' })
      .eq('scheduled_date', tomorrowStr)
      .not('contractor_id', 'is', null)
      .neq('status', 'completed').neq('status', 'invoiced'),
    // Overdue invoices — the full list (you asked for all of them), oldest first.
    supabase.from('invoices')
      .select('id, invoice_number, base_price, discount, due_date, clients ( name ), invoice_items ( price )', { count: 'exact' })
      .is('deleted_at', null)
      .eq('status', 'sent')
      .lt('due_date', today)
      .order('due_date', { ascending: true }),
    // Overdue training
    supabase.from('worker_training_assignments')
      .select('id, due_date, last_reminder_sent_at, contractors ( full_name ), training_modules ( title )', { count: 'exact' })
      .neq('status', 'completed')
      .not('due_date', 'is', null)
      .lt('due_date', today),
    // Active contractors for compliance check
    supabase.from('contractors')
      .select('id, full_name, status, insurance_expiry, right_to_work_required, right_to_work_expiry, contract_signed_date')
      .eq('status', 'active')
      .order('full_name'),
    // Sales follow-ups due — leads whose next_follow_up is today or earlier and
    // aren't closed. So a scheduled follow-up actually reaches you.
    supabase.from('sales_leads')
      .select('id, company, contact_name, status, next_follow_up')
      .not('next_follow_up', 'is', null)
      .lte('next_follow_up', today)
      .not('status', 'in', '(won,lost,do_not_contact)')
      .order('next_follow_up', { ascending: true }),
    // Renewals coming up — within the next 30 days (won clients up for review).
    supabase.from('sales_leads')
      .select('id, company, contact_name, status, renewal_date')
      .not('renewal_date', 'is', null)
      .lte('renewal_date', in30Str)
      .not('status', 'in', '(lost,do_not_contact)')
      .order('renewal_date', { ascending: true }),
  ])

  // Compute compliance flags for active contractors
  const complianceFlagged = (activeContractors ?? [])
    .map((c) => ({ contractor: c, result: computeComplianceStatus(c, today) }))
    .filter((r) => r.result.status !== 'compliant' && r.result.status !== 'inactive')

  const complianceFlaggedCount = complianceFlagged.length

  // Typed views of the sales alert rows (Supabase infers these loosely).
  type SalesRow = { id: string; company: string; contact_name: string | null; next_follow_up?: string | null; renewal_date?: string | null }
  const followUpRows = (salesFollowUps ?? []) as unknown as SalesRow[]
  const renewalRows = (salesRenewals ?? []) as unknown as SalesRow[]

  // Split unassigned into active (recent/upcoming → shown) vs stale (old drafts
  // → hidden but counted, so nothing silently disappears).
  const unassignedAll = allUnassigned ?? []
  const activeUnassigned = unassignedAll.filter((j) => !j.scheduled_date || j.scheduled_date >= staleFloorStr)
  const staleUnassignedCount = unassignedAll.length - activeUnassigned.length
  const unassignedCount = activeUnassigned.length

  // Total owed across all overdue invoices, for the section header.
  const overdueTotal = (overdueInvoices ?? []).reduce((sum, inv) => {
    const items = (inv.invoice_items ?? []) as { price: number }[]
    return sum + (inv.base_price ?? 0) + items.reduce((s, i) => s + (i.price ?? 0), 0) - (inv.discount ?? 0)
  }, 0)

  // Calculate which tomorrow jobs haven't been reminded today
  const todayStart = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString()
  const unremindedJobs = (tomorrowJobs ?? []).filter((j) => !j.last_reminder_sent_at || j.last_reminder_sent_at < todayStart)

  return (
    <div>
      <h1 className="text-3xl tracking-tight font-bold text-sage-800 mb-8">Alerts & Reminders</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <SummaryCard icon={Receipt} label="Overdue invoices" value={overdueInvCount ?? 0} accent={overdueInvCount ? 'red' : undefined} />
        <SummaryCard icon={Briefcase} label="Unassigned jobs" value={unassignedCount} accent={unassignedCount ? 'amber' : undefined} />
        <SummaryCard icon={CalendarDays} label="Today's jobs" value={todayCount ?? 0} />
        <SummaryCard icon={BookOpen} label="Overdue training" value={overdueTrainingCount ?? 0} accent={overdueTrainingCount ? 'amber' : undefined} />
        <SummaryCard icon={ShieldCheck} label="Compliance alerts" value={complianceFlaggedCount} accent={complianceFlaggedCount ? 'amber' : undefined} />
      </div>

      {/* ── 1. Overdue invoices — TOP: the full list, most pressing money ── */}
      <Section
        title={`Overdue Invoices (${overdueInvCount ?? 0})`}
        icon={Receipt}
        headerRight={overdueTotal > 0 ? <span className="text-sm font-semibold text-red-600 tabular-nums">{fmtCurrency(overdueTotal)} owed</span> : undefined}
      >
        {(overdueInvoices ?? []).length === 0 ? (
          <p className="text-sage-500 text-sm">No overdue invoices.</p>
        ) : (
          <div className="space-y-2">
            {(overdueInvoices ?? []).map((inv) => {
              const client = inv.clients as unknown as { name: string } | null
              const items = (inv.invoice_items ?? []) as { price: number }[]
              const total = (inv.base_price ?? 0) + items.reduce((s, i) => s + (i.price ?? 0), 0) - (inv.discount ?? 0)
              const daysOver = inv.due_date ? Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000) : 0
              return (
                <Link key={inv.id} href={`/portal/invoices/${inv.id}`} className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-3 hover:bg-red-100 transition-colors text-sm">
                  <div>
                    <span className="font-medium text-sage-800">{inv.invoice_number}</span>
                    <span className="text-sage-600 ml-2">{client?.name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-red-600 font-medium">Due {fmtDate(inv.due_date)}{daysOver > 0 ? ` · ${daysOver}d over` : ''}</span>
                    <span className="font-medium text-sage-800 tabular-nums">{fmtCurrency(total)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── 2. Unassigned jobs (recent/upcoming only; old drafts hidden) ── */}
      <Section title={`Unassigned Jobs (${unassignedCount})`} icon={AlertTriangle}>
        {unassignedCount === 0 ? (
          <p className="text-sage-500 text-sm">
            No unassigned jobs needing attention.
            {staleUnassignedCount > 0 && (
              <> <Link href="/portal/jobs?view=unassigned" className="text-sage-500 underline hover:text-sage-700">{staleUnassignedCount} older draft{staleUnassignedCount === 1 ? '' : 's'} hidden →</Link></>
            )}
          </p>
        ) : (
          <div className="space-y-2">
            {activeUnassigned.map((j) => (
              <Link key={j.id} href={`/portal/jobs/${j.id}`} className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3 hover:bg-amber-100 transition-colors text-sm">
                <div>
                  <span className="font-medium text-sage-800">{j.job_number}</span>
                  {j.title && <span className="text-sage-600 ml-2">{j.title}</span>}
                </div>
                <span className="text-xs text-sage-500">{fmtDate(j.scheduled_date)}</span>
              </Link>
            ))}
            {staleUnassignedCount > 0 && (
              <Link href="/portal/jobs?view=unassigned" className="text-xs text-sage-500 hover:text-sage-700">{staleUnassignedCount} older draft{staleUnassignedCount === 1 ? '' : 's'} hidden — view all unassigned →</Link>
            )}
          </div>
        )}
      </Section>

      {/* ── 3. Today's jobs ── */}
      <Section title={`Today's Jobs (${todayCount ?? 0})`} icon={CalendarDays}>
        {(todayJobs ?? []).length === 0 ? (
          <p className="text-sage-500 text-sm">No jobs for today.</p>
        ) : (
          <div className="space-y-2">
            {(todayJobs ?? []).map((j) => (
              <Link key={j.id} href={`/portal/jobs/${j.id}`} className="flex items-center justify-between bg-sage-50 rounded-lg px-4 py-3 hover:bg-sage-100 transition-colors text-sm">
                <div>
                  <span className="font-medium text-sage-800">{j.job_number}</span>
                  {j.title && <span className="text-sage-600 ml-2">{j.title}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-sage-500">{j.assigned_to ?? <span className="text-amber-600 font-medium">Unassigned</span>}</span>
                  {j.scheduled_time && <span className="text-sage-500">{j.scheduled_time}</span>}
                  <span className={clsx('inline-block px-2 py-0.5 rounded-full font-medium capitalize',
                    j.status === 'in_progress' ? 'bg-amber-50 text-amber-700' : j.status === 'assigned' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                  )}>{j.status.replace('_', ' ')}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* ── 4. Tomorrow reminders ── */}
      <Section title={`Job Reminders — Tomorrow (${tomorrowCount ?? 0} jobs, ${unremindedJobs.length} pending)`} icon={Briefcase}>
        <div className="mb-4">
          <RunJobReminders />
        </div>
        {(tomorrowJobs ?? []).length === 0 ? (
          <p className="text-sage-500 text-sm">No jobs scheduled for tomorrow.</p>
        ) : (
          <div className="space-y-2">
            {(tomorrowJobs ?? []).map((j) => {
              const reminded = j.last_reminder_sent_at && j.last_reminder_sent_at >= todayStart
              return (
                <Link key={j.id} href={`/portal/jobs/${j.id}`} className="flex items-center justify-between bg-sage-50 rounded-lg px-4 py-3 hover:bg-sage-100 transition-colors text-sm">
                  <div>
                    <span className="font-medium text-sage-800">{j.job_number}</span>
                    {j.title && <span className="text-sage-600 ml-2">{j.title}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-sage-500">{j.assigned_to ?? 'Unassigned'}</span>
                    {j.scheduled_time && <span className="text-sage-500">{j.scheduled_time}</span>}
                    {reminded ? (
                      <span className="text-emerald-600 font-medium">Sent</span>
                    ) : (
                      <span className="text-amber-600 font-medium">Pending</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── 5. Overdue training ── */}
      <Section title={`Overdue Training (${overdueTrainingCount ?? 0})`} icon={BookOpen}>
        <div className="mb-4">
          <RunTrainingReminders />
        </div>
        {(overdueTraining ?? []).length === 0 ? (
          <p className="text-sage-500 text-sm">No overdue training items.</p>
        ) : (
          <div className="space-y-2">
            {(overdueTraining ?? []).map((t) => {
              const contractor = t.contractors as unknown as { full_name: string } | null
              const mod = t.training_modules as unknown as { title: string } | null
              const reminded = t.last_reminder_sent_at && t.last_reminder_sent_at >= todayStart
              return (
                <div key={t.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-4 py-3 text-sm">
                  <div>
                    <span className="font-medium text-sage-800">{mod?.title ?? '—'}</span>
                    <span className="text-sage-600 ml-2">{contractor?.full_name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-amber-700">Due {fmtDate(t.due_date)}</span>
                    {reminded ? <span className="text-emerald-600 font-medium">Reminded</span> : <span className="text-amber-600 font-medium">Pending</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      {/* ── Sales follow-ups & renewals due ── */}
      {(followUpRows.length > 0 || renewalRows.length > 0) && (
        <Section title={`Sales follow-ups & renewals (${followUpRows.length + renewalRows.length})`} icon={CalendarClock}>
          <div className="space-y-2">
            {followUpRows.map((l) => (
              <Link key={`f-${l.id}`} href={`/portal/leads/${l.id}`} className="flex items-center justify-between rounded-lg px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-sage-800">{l.company}</span>
                  {l.contact_name && <span className="text-sage-500"> · {l.contact_name}</span>}
                  <p className="text-xs text-sage-600 mt-0.5">Follow up due {l.next_follow_up}</p>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 flex-none">Follow up</span>
              </Link>
            ))}
            {renewalRows.map((l) => (
              <Link key={`r-${l.id}`} href={`/portal/leads/${l.id}`} className="flex items-center justify-between rounded-lg px-4 py-3 bg-sage-50 hover:bg-sage-100 transition-colors text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-sage-800">{l.company}</span>
                  {l.contact_name && <span className="text-sage-500"> · {l.contact_name}</span>}
                  <p className="text-xs text-sage-600 mt-0.5">Renewal / review {l.renewal_date}</p>
                </div>
                <span className="text-[11px] font-semibold text-sage-600 flex-none">Renewal</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ── 6. Compliance alerts — BOTTOM ── */}
      <Section title={`Compliance Alerts (${complianceFlaggedCount})`} icon={ShieldCheck}>
        {complianceFlagged.length === 0 ? (
          <p className="text-sage-500 text-sm">All active contractors are compliant.</p>
        ) : (
          <div className="space-y-2">
            {complianceFlagged.map(({ contractor, result }) => (
              <Link
                key={contractor.id}
                href={`/portal/contractors/${contractor.id}`}
                className={clsx(
                  'flex items-center justify-between rounded-lg px-4 py-3 transition-colors text-sm',
                  result.status === 'expired' ? 'bg-red-50 hover:bg-red-100' : 'bg-amber-50 hover:bg-amber-100',
                )}
              >
                <div className="min-w-0">
                  <span className="font-medium text-sage-800">{contractor.full_name}</span>
                  <p className="text-xs text-sage-600 truncate mt-0.5">{result.reasons.join(' · ')}</p>
                </div>
                <ComplianceBadge status={result.status} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, icon: Icon, children, headerRight }: { title: string; icon: React.ElementType; children: React.ReactNode; headerRight?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-sage-500" />
          <h2 className="text-lg font-semibold text-sage-800">{title}</h2>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent?: 'amber' | 'red' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={accent === 'red' ? 'text-red-500' : accent === 'amber' ? 'text-amber-500' : 'text-sage-500'} />
        <span className="text-sm font-medium text-sage-600">{label}</span>
      </div>
      <p className={clsx('text-2xl font-bold', accent === 'red' ? 'text-red-600' : accent === 'amber' ? 'text-amber-600' : 'text-sage-800')}>{value}</p>
    </div>
  )
}
