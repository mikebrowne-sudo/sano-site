import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { monthRange, visitDate } from '@/lib/monthly-invoice'
import { MonthlyInvoiceForm, type MonthlyJobRow } from './_components/MonthlyInvoiceForm'
import { scheduleInvoiceNote, scheduleRateIncludesGst } from '@/lib/monthly-invoice-create'

// Monthly invoice from completed jobs — pick client → month → visits.
// Only completed, un-invoiced, live jobs are offered, so a visit can't be
// billed twice (the action re-checks all of this server-side).

export default async function NewMonthlyInvoicePage({
  searchParams,
}: {
  searchParams?: { client?: string; month?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) redirect('/portal/invoices')

  const { data: pending } = await supabase
    .from('jobs')
    .select('id, job_number, title, client_id, scheduled_date, completed_at, allowed_hours, job_price, assigned_to, clients ( name, company_name )')
    .eq('status', 'completed')
    .is('invoice_id', null)
    .is('deleted_at', null)
    .eq('is_test', false)
    .order('scheduled_date')

  type PendingRow = {
    id: string; job_number: string | null; title: string | null; client_id: string
    scheduled_date: string | null; completed_at: string | null
    allowed_hours: number | null; job_price: number | null; assigned_to: string | null
    clients: { name: string; company_name: string | null } | null
  }
  const rows = (pending ?? []) as unknown as PendingRow[]

  // Client dropdown: only clients with completed visits waiting to be billed.
  const clientMap = new Map<string, { id: string; label: string; count: number }>()
  for (const r of rows) {
    const c = clientMap.get(r.client_id)
    if (c) { c.count++; continue }
    const name = r.clients?.name ?? 'Unknown client'
    const company = r.clients?.company_name
    clientMap.set(r.client_id, {
      id: r.client_id,
      label: company && company !== name ? `${name} (${company})` : name,
      count: 1,
    })
  }
  const clients = Array.from(clientMap.values()).sort((a, b) => a.label.localeCompare(b.label))

  const clientId = searchParams?.client && clientMap.has(searchParams.client) ? searchParams.client : null
  const clientRows = clientId ? rows.filter((r) => r.client_id === clientId) : []

  const monthCounts = new Map<string, number>()
  for (const r of clientRows) {
    const d = visitDate(r)
    if (d) monthCounts.set(d.slice(0, 7), (monthCounts.get(d.slice(0, 7)) ?? 0) + 1)
  }
  const months = Array.from(monthCounts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: `${monthRange(value)?.label ?? value} (${count})` }))

  const month = searchParams?.month && monthCounts.has(searchParams.month) ? searchParams.month : null
  const monthJobs: MonthlyJobRow[] = month
    ? clientRows
        .filter((r) => visitDate(r)?.slice(0, 7) === month)
        .map((r) => ({
          id: r.id,
          jobNumber: r.job_number,
          title: r.title,
          date: visitDate(r)!,
          hours: r.allowed_hours != null ? Number(r.allowed_hours) : null,
          jobPrice: r.job_price != null ? Number(r.job_price) : null,
          assignedTo: r.assigned_to,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : []

  // Prefills: per-visit rate from the client's most recent priced job, the
  // heading from their most recent quote, and the note from their recurring
  // schedule (e.g. the weekly contract rate). All editable on the form.
  let defaultRate: number | null = null
  let defaultLabel = ''
  let defaultNotes = ''
  let defaultGstIncluded = false
  if (clientId) {
    defaultNotes = (await scheduleInvoiceNote(supabase, { clientId })) ?? ''
    defaultGstIncluded = await scheduleRateIncludesGst(supabase, clientId)
    const [{ data: pricedJob }, { data: lastQuote }] = await Promise.all([
      supabase.from('jobs').select('job_price').eq('client_id', clientId).is('deleted_at', null)
        .not('job_price', 'is', null).gt('job_price', 0)
        .order('scheduled_date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('quotes').select('type_of_clean').eq('client_id', clientId).is('deleted_at', null)
        .not('type_of_clean', 'is', null)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    defaultRate = pricedJob?.job_price != null ? Number(pricedJob.job_price) : null
    defaultLabel = (lastQuote?.type_of_clean as string | null) ?? ''
  }

  return (
    <div>
      <Link
        href="/portal/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to invoices
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sage-800">Monthly invoice from completed visits</h1>
        <p className="text-sm text-sage-600 mt-1 max-w-2xl">
          One invoice for all the visits a client had in a month. The invoice shows the number of
          visits × the rate and the visit dates on one line, and the jobs are marked invoiced so
          they can&apos;t be billed twice.
          The invoice is created as a draft — review it, then send.
        </p>
      </div>

      <MonthlyInvoiceForm
        key={`${clientId ?? ''}|${month ?? ''}`}
        clients={clients}
        clientId={clientId}
        months={months}
        month={month}
        monthLabel={month ? monthRange(month)?.label ?? month : null}
        jobs={monthJobs}
        defaultRate={defaultRate}
        defaultLabel={defaultLabel}
        defaultNotes={defaultNotes}
        defaultGstIncluded={defaultGstIncluded}
      />
    </div>
  )
}
