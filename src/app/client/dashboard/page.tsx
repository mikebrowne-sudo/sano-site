// Phase 5.5.6 — Client portal dashboard (read-only basic view).
//
// Shows the authenticated client's recent quotes + invoices + upcoming
// jobs. Strictly read-only: no edits, no payments, no internal data.
// Pricing fields shown here (base_price, discount, gst_included) come
// from documents already issued to this client — they're not internal
// margins.
//
// Access flow:
//   middleware.ts has already verified the visitor is a client user
//   (clients.auth_user_id = auth.uid()) when reaching this route. The
//   user-scoped supabase client respects RLS (clients_self_read), so
//   the initial clients SELECT is RLS-safe. Quote / invoice / job
//   reads use service-role but are scoped by client_id, so we never
//   leak rows that don't belong to the signed-in client.
//
// If enable_customer_portal=false we render the "not available" state
// without querying anything.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { loadWorkforceSettings } from '@/lib/workforce-settings'
import { Calendar, FileText, Receipt, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

function fmtCurrency(dollars: number | null) {
  if (dollars == null) return '—'
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const QUOTE_STATUS_TONE: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-700',
  sent:     'bg-blue-50 text-blue-700',
  viewed:   'bg-violet-50 text-violet-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
  expired:  'bg-amber-50 text-amber-700',
}

const INVOICE_STATUS_TONE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const JOB_STATUS_TONE: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-amber-50 text-amber-700',
  completed:   'bg-emerald-50 text-emerald-700',
  invoiced:    'bg-purple-50 text-purple-700',
}

export default async function ClientDashboardPage() {
  const supabase = createClient()
  const settings = await loadWorkforceSettings(supabase)

  if (!settings.enable_customer_portal) {
    return (
      <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-sage-800 mb-2">Client portal access is not available yet.</h1>
        <p className="text-sage-600 text-sm leading-relaxed">
          The Sano client portal isn’t open yet. If you need anything in the meantime, please contact us directly.
        </p>
      </div>
    )
  }

  // RLS-safe self-read.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }
  const { data: client } = await supabase
    .from('clients')
    .select('id, name, company_name, email, phone')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!client) {
    return (
      <div className="bg-white rounded-2xl border border-sage-100 shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-sage-800 mb-2">Account not linked yet.</h1>
        <p className="text-sage-600 text-sm leading-relaxed">
          Your login isn’t connected to a client record yet. Please contact Sano so we can finish setting things up.
        </p>
      </div>
    )
  }

  // Service-role for the doc + job lookups, scoped to this client_id.
  // Quotes / invoices / jobs RLS is staff/contractor-tuned today; we
  // reach in with the service-role key but always filter by client_id.
  const service = getServiceSupabase()
  const todayISO = new Date().toISOString().slice(0, 10)

  const [{ data: quotes }, { data: invoices }, { data: upcomingJobs }] = await Promise.all([
    service
      .from('quotes')
      .select('id, quote_number, status, date_issued, valid_until, base_price, discount, gst_included, share_token')
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .order('date_issued', { ascending: false })
      .limit(5),
    service
      .from('invoices')
      .select('id, invoice_number, status, date_issued, due_date, base_price, discount, gst_included, share_token')
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .order('date_issued', { ascending: false })
      .limit(5),
    service
      .from('jobs')
      .select('id, job_number, title, scheduled_date, scheduled_time, address, status')
      .eq('client_id', client.id)
      .is('deleted_at', null)
      .gte('scheduled_date', todayISO)
      .not('status', 'in', '(completed,invoiced,cancelled)')
      .order('scheduled_date', { ascending: true })
      .limit(5),
  ])

  const firstName = (client.name as string).split(/\s+/)[0]

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-sage-800">Welcome, {firstName}</h1>
        <p className="text-sage-600 text-sm mt-0.5">
          Here&apos;s a quick view of your Sano account.
          {client.company_name && <> · {client.company_name as string}</>}
        </p>
      </header>

      <Section title="Bookings" icon={<Calendar size={16} className="text-sage-400" />}>
        {(upcomingJobs ?? []).length === 0 ? (
          <Empty text="You don’t have any upcoming bookings yet." />
        ) : (
          <ul className="divide-y divide-sage-50">
            {(upcomingJobs ?? []).map((j) => (
              <li key={j.id as string} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sage-800 font-medium truncate">{j.title || j.job_number}</p>
                  <p className="text-xs text-sage-500 mt-0.5">
                    {fmtDate(j.scheduled_date)}
                    {j.scheduled_time && <> · {j.scheduled_time}</>}
                    {j.address && <> · {j.address}</>}
                  </p>
                </div>
                <span className={clsx('shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                  JOB_STATUS_TONE[j.status as string] ?? JOB_STATUS_TONE.draft,
                )}>
                  {(j.status as string).replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Quotes" icon={<FileText size={16} className="text-sage-400" />}>
        {(quotes ?? []).length === 0 ? (
          <Empty text="You don’t have any quotes yet." />
        ) : (
          <ul className="divide-y divide-sage-50">
            {(quotes ?? []).map((q) => {
              const total = computeTotal(q.base_price as number | null, q.discount as number | null, q.gst_included as boolean | null)
              return (
                <li key={q.id as string} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sage-800 font-medium">{q.quote_number}</p>
                    <p className="text-xs text-sage-500 mt-0.5">
                      Issued {fmtDate(q.date_issued as string | null)}
                      {q.valid_until && <> · valid until {fmtDate(q.valid_until as string | null)}</>}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-sage-800 font-semibold tabular-nums">{fmtCurrency(total)}</span>
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                      QUOTE_STATUS_TONE[q.status as string] ?? QUOTE_STATUS_TONE.draft,
                    )}>
                      {(q.status as string)}
                    </span>
                    {q.share_token && (
                      <Link
                        href={`/share/quote/${q.share_token as string}`}
                        className="text-sage-500 hover:text-sage-800"
                        aria-label="View quote"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      <Section title="Invoices" icon={<Receipt size={16} className="text-sage-400" />}>
        {(invoices ?? []).length === 0 ? (
          <Empty text="You don’t have any invoices yet." />
        ) : (
          <ul className="divide-y divide-sage-50">
            {(invoices ?? []).map((inv) => {
              const total = computeTotal(inv.base_price as number | null, inv.discount as number | null, inv.gst_included as boolean | null)
              return (
                <li key={inv.id as string} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sage-800 font-medium">{inv.invoice_number}</p>
                    <p className="text-xs text-sage-500 mt-0.5">
                      Issued {fmtDate(inv.date_issued as string | null)}
                      {inv.due_date && <> · due {fmtDate(inv.due_date as string | null)}</>}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-sage-800 font-semibold tabular-nums">{fmtCurrency(total)}</span>
                    <span className={clsx('inline-block px-2 py-0.5 rounded-full text-[11px] font-medium capitalize',
                      INVOICE_STATUS_TONE[inv.status as string] ?? INVOICE_STATUS_TONE.draft,
                    )}>
                      {(inv.status as string)}
                    </span>
                    {inv.share_token && (
                      <Link
                        href={`/share/invoice/${inv.share_token as string}`}
                        className="text-sage-500 hover:text-sage-800"
                        aria-label="View invoice"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {(quotes ?? []).length === 0 && (invoices ?? []).length === 0 && (upcomingJobs ?? []).length === 0 && (
        <p className="text-center text-sage-500 text-sm">
          Your quotes, invoices and bookings will appear here.
        </p>
      )}
    </div>
  )
}

function computeTotal(base: number | null, discount: number | null, gstIncluded: boolean | null) {
  const lineTotal = (base ?? 0) - (discount ?? 0)
  if (gstIncluded) return lineTotal
  return lineTotal * 1.15
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-sage-100 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-sage-800 mb-2">
        {icon}{title}
      </h2>
      {children}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-sage-500 py-1">{text}</p>
}
