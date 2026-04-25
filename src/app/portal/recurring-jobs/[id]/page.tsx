import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { GenerateJobButton } from './_components/GenerateJobButton'
import { GenerateUpcomingButton } from './_components/GenerateUpcomingButton'
import { RemindersPanel, type ReminderRow } from './_components/RemindersPanel'
import { ExtendContractButton } from './_components/ExtendContractButton'
import { isAdminEmail } from '@/lib/is-admin'
import clsx from 'clsx'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

export default async function RecurringJobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = isAdminEmail(user?.email)

  const { data: rec, error } = await supabase
    .from('recurring_jobs')
    .select('*, clients ( name, company_name )')
    .eq('id', params.id)
    .single()

  if (error || !rec) notFound()

  const client = rec.clients as unknown as { name: string; company_name: string | null } | null

  // Recent generated jobs
  const { data: recentJobs, count: totalJobs } = await supabase
    .from('jobs')
    .select('id, job_number, scheduled_date, status', { count: 'exact' })
    .eq('recurring_job_id', params.id)
    .order('scheduled_date', { ascending: false })
    .limit(5)

  // Phase F — reminders.
  const { data: remindersRaw } = await supabase
    .from('recurring_contract_reminders')
    .select('id, reminder_type, due_date, status, completed_at')
    .eq('recurring_job_id', params.id)
    .order('due_date', { ascending: true })
  const reminders = (remindersRaw ?? []) as ReminderRow[]

  const isActive = rec.status === 'active'
  const isPastEnd = rec.end_date && rec.next_due_date && rec.next_due_date > rec.end_date

  return (
    <div>
      <Link href="/portal/recurring-jobs" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4">
        <ArrowLeft size={14} /> Back to recurring jobs
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">{rec.title || 'Recurring Job'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={clsx('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600')}>{rec.status}</span>
            <span className="text-sage-500 text-xs capitalize">{rec.frequency}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/portal/recurring-jobs/${params.id}/edit`} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors">
            <Pencil size={14} /> Edit
          </Link>
          {isActive && !isPastEnd && (
            <>
              <GenerateJobButton recurringId={rec.id} nextDueDate={rec.next_due_date} />
              <GenerateUpcomingButton recurringId={rec.id} />
            </>
          )}
          {isAdmin && (
            <ExtendContractButton
              recurringId={rec.id}
              currentEndDate={rec.end_date ?? null}
              currentTermMonths={rec.contract_term_months ?? null}
            />
          )}
        </div>
      </div>

      <div className="max-w-2xl space-y-8">

        <Section title="Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-sage-500">Next due</span><p className="text-sage-800 font-semibold">{fmtDate(rec.next_due_date)}</p></div>
            <div><span className="text-sage-500">Last generated</span><p className="text-sage-800 font-medium">{fmtDate(rec.last_generated_date)}</p></div>
            <div><span className="text-sage-500">Frequency</span><p className="text-sage-800 font-medium capitalize">{rec.frequency}</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mt-3">
            <div><span className="text-sage-500">Start date</span><p className="text-sage-800 font-medium">{fmtDate(rec.start_date)}</p></div>
            <div><span className="text-sage-500">End date</span><p className="text-sage-800 font-medium">{fmtDate(rec.end_date)}</p></div>
            <div><span className="text-sage-500">Time</span><p className="text-sage-800 font-medium">{rec.scheduled_time ?? '—'}</p></div>
          </div>
        </Section>

        {/* Phase F — contract terms (only when populated). */}
        {(rec.contract_term_months || rec.notice_period_days || rec.monthly_value || rec.renewal_status) && (
          <Section title="Contract terms">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-sage-500">Term</span>
                <p className="text-sage-800 font-medium">
                  {rec.contract_term_months ? `${rec.contract_term_months} months` : '—'}
                </p>
              </div>
              <div>
                <span className="text-sage-500">Notice period</span>
                <p className="text-sage-800 font-medium">
                  {rec.notice_period_days ? `${rec.notice_period_days} days` : '—'}
                </p>
              </div>
              <div>
                <span className="text-sage-500">Monthly value</span>
                <p className="text-sage-800 font-medium">{fmtCurrency(rec.monthly_value)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-sage-500">Renewal status</span>
                <p className="text-sage-800 font-medium capitalize">
                  {(rec.renewal_status ?? 'not_started').replace('_', ' ')}
                </p>
              </div>
              {rec.service_category && (
                <div>
                  <span className="text-sage-500">Service category</span>
                  <p className="text-sage-800 font-medium capitalize">{rec.service_category}</p>
                </div>
              )}
            </div>
            {rec.renewal_notes && (
              <div className="mt-3">
                <span className="text-sage-500 text-sm">Renewal notes</span>
                <p className="text-sage-700 text-sm whitespace-pre-wrap mt-1">{rec.renewal_notes}</p>
              </div>
            )}
          </Section>
        )}

        {/* Phase F — renewal reminders. */}
        <Section title="Renewal reminders">
          <RemindersPanel reminders={reminders} />
        </Section>

        <Section title="Client">
          <p className="font-medium text-sage-800">{client?.name ?? '—'}</p>
          {client?.company_name && <p className="text-sage-600 text-sm">{client.company_name}</p>}
        </Section>

        {rec.address && (
          <Section title="Address">
            <p className="text-sage-800 text-sm">{rec.address}</p>
          </Section>
        )}

        {rec.description && (
          <Section title="Description">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{rec.description}</p>
          </Section>
        )}

        <Section title="Assignment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-sage-500">Contractor</span><p className="text-sage-800 font-medium">{rec.assigned_to || 'Unassigned'}</p></div>
            <div><span className="text-sage-500">Contractor price</span><p className="text-sage-800 font-medium">{fmtCurrency(rec.contractor_price)}</p></div>
          </div>
        </Section>

        <Section title={`Generated Jobs${totalJobs != null ? ` (${totalJobs})` : ''}`}>
          {(!recentJobs || recentJobs.length === 0) ? (
            <p className="text-sage-500 text-sm">No jobs generated yet.</p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((j) => (
                <Link key={j.id} href={`/portal/jobs/${j.id}`} className="flex items-center justify-between bg-sage-50 rounded-lg px-4 py-3 hover:bg-sage-100 transition-colors text-sm">
                  <span className="font-medium text-sage-800">{j.job_number}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-sage-500">{fmtDate(j.scheduled_date)}</span>
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full font-medium capitalize',
                      j.status === 'completed' || j.status === 'invoiced' ? 'bg-emerald-50 text-emerald-700' :
                      j.status === 'in_progress' ? 'bg-amber-50 text-amber-700' :
                      j.status === 'assigned' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    )}>{j.status.replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
              {(totalJobs ?? 0) > 5 && <p className="text-xs text-sage-500 pt-1">Showing 5 of {totalJobs}</p>}
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-lg font-semibold text-sage-800 mb-3">{title}</h2>{children}</div>
}
