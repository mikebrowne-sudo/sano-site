import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { CIStatusActions } from './_components/CIStatusActions'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-gray-100 text-gray-700',
  approved: 'bg-blue-50 text-blue-700',
  paid:     'bg-emerald-50 text-emerald-700',
}

function fmt(d: number) { return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(d) }
function fmtDate(iso: string | null) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }

export default async function ContractorInvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: ci, error } = await supabase
    .from('contractor_invoices')
    .select('id, invoice_number, contractor_id, job_id, amount, date_submitted, date_paid, status, notes, created_at, contractors ( full_name, hourly_rate ), jobs ( job_number, title, job_price, allowed_hours )')
    .eq('id', params.id)
    .single()

  if (error || !ci) notFound()

  const contractor = ci.contractors as unknown as { full_name: string; hourly_rate: number | null } | null
  const job = ci.jobs as unknown as { job_number: string; title: string | null; job_price: number | null; allowed_hours: number | null } | null

  // Calculate expected labour cost if job is linked
  let expectedCost: number | null = null
  if (ci.job_id && job) {
    const { data: workers } = await supabase
      .from('job_workers')
      .select('contractor_id, hours_allocated, contractors ( hourly_rate )')
      .eq('job_id', ci.job_id)

    if (workers && workers.length > 0) {
      const totalHours = job.allowed_hours ?? 0
      expectedCost = workers.reduce((sum, w) => {
        const rate = (w.contractors as unknown as { hourly_rate: number | null } | null)?.hourly_rate ?? 0
        const hours = w.hours_allocated ?? (totalHours / workers.length)
        return sum + (rate * hours)
      }, 0)
    } else if (contractor?.hourly_rate && job.allowed_hours) {
      expectedCost = contractor.hourly_rate * job.allowed_hours
    }
  }

  const variance = expectedCost != null ? ci.amount - expectedCost : null

  return (
    <div>
      <Link href="/portal/contractor-invoices" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"><ArrowLeft size={14} /> Back</Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">{ci.invoice_number}</h1>
          <p className="text-sage-600 text-sm mt-1">{contractor?.full_name ?? '—'}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', STATUS_STYLES[ci.status])}>{ci.status}</span>
          <CIStatusActions id={ci.id} status={ci.status} />
          <Link href={`/portal/contractor-invoices/${params.id}/edit`} className="inline-flex items-center gap-2 bg-sage-500 text-white font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"><Pencil size={14} /> Edit</Link>
        </div>
      </div>

      <div className="max-w-2xl space-y-8">
        <Section title="Amount">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-sage-500 text-sm">Invoice amount</span>
              <p className="text-2xl font-bold text-sage-800">{fmt(ci.amount)}</p>
            </div>
            {expectedCost != null && (
              <div>
                <span className="text-sage-500 text-sm">Expected labour cost</span>
                <p className="text-lg font-medium text-sage-700">{fmt(expectedCost)}</p>
              </div>
            )}
            {variance != null && (
              <div>
                <span className="text-sage-500 text-sm">Variance</span>
                <p className={clsx('text-lg font-bold', variance > 0 ? 'text-red-600' : variance < 0 ? 'text-emerald-700' : 'text-sage-800')}>
                  {variance > 0 ? '+' : ''}{fmt(variance)}
                  <span className="text-xs font-normal ml-1">{variance > 0 ? 'over' : variance < 0 ? 'under' : 'exact'}</span>
                </p>
              </div>
            )}
          </div>
        </Section>

        <Section title="Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-sage-500">Contractor</span><p className="text-sage-800 font-medium">{contractor?.full_name ?? '—'}</p></div>
            <div><span className="text-sage-500">Date submitted</span><p className="text-sage-800 font-medium">{fmtDate(ci.date_submitted)}</p></div>
            {job && (
              <div><span className="text-sage-500">Linked job</span><p className="text-sage-800 font-medium"><Link href={`/portal/jobs/${ci.job_id}`} className="hover:text-sage-500">{job.job_number}{job.title ? ` — ${job.title}` : ''}</Link></p></div>
            )}
            <div><span className="text-sage-500">Date paid</span><p className="text-sage-800 font-medium">{fmtDate(ci.date_paid)}</p></div>
          </div>
        </Section>

        {ci.notes && (
          <Section title="Notes">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{ci.notes}</p>
          </Section>
        )}

        <div className="text-xs text-sage-400 pt-4 border-t border-sage-100">Created {fmtDate(ci.created_at)}</div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><h2 className="text-lg font-semibold text-sage-800 mb-3">{title}</h2>{children}</div>
}
