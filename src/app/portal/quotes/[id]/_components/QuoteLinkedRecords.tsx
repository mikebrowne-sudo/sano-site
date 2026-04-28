// Phase quote-flow-clarity: when a quote has a linked job and/or
// invoice, surface them as clickable badges at the top of the detail
// page so an operator can jump straight to the downstream record
// without navigating through Jobs / Invoices.
//
// Server component (just renders <Link>s). Empty when no children
// exist; the "Create job / Create invoice" CTAs in the next-step
// panel handle that case.

import Link from 'next/link'
import clsx from 'clsx'
import { Briefcase, Receipt, ArrowRight } from 'lucide-react'

interface LinkedJob {
  id: string
  job_number: string | null
  status: string | null
  scheduled_date: string | null
}

interface LinkedInvoice {
  id: string
  invoice_number: string | null
  status: string | null
  due_date: string | null
}

const JOB_STATUS_TONE: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed:   'bg-gray-100 text-gray-700',
  invoiced:    'bg-sage-50 text-sage-700',
}

const INVOICE_STATUS_TONE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-red-50 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function QuoteLinkedRecords({
  job, invoice,
}: {
  job?: LinkedJob | null
  invoice?: LinkedInvoice | null
}) {
  if (!job && !invoice) return null

  return (
    <section
      aria-label="Linked records"
      className="bg-sage-50/60 border border-sage-100 rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center gap-3"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-sage-500 mr-1">
        Linked
      </span>

      {job && (
        <Link
          href={`/portal/jobs/${job.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-sage-100 hover:border-sage-200 hover:shadow-sm transition-all px-3 py-1.5 text-sm"
        >
          <Briefcase size={14} className="text-sage-600" />
          <span className="font-medium text-sage-800">Job {job.job_number ?? '—'}</span>
          {job.status && (
            <span className={clsx(
              'inline-block rounded-full text-[11px] font-medium px-2 py-0.5',
              JOB_STATUS_TONE[job.status] ?? 'bg-sage-100 text-sage-700',
            )}>
              {job.status.replace('_', ' ')}
            </span>
          )}
          {job.scheduled_date && (
            <span className="text-[11px] text-sage-500">· {fmtDate(job.scheduled_date)}</span>
          )}
          <ArrowRight size={12} className="text-sage-400" />
        </Link>
      )}

      {invoice && (
        <Link
          href={`/portal/invoices/${invoice.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-sage-100 hover:border-sage-200 hover:shadow-sm transition-all px-3 py-1.5 text-sm"
        >
          <Receipt size={14} className="text-sage-600" />
          <span className="font-medium text-sage-800">Invoice {invoice.invoice_number ?? '—'}</span>
          {invoice.status && (
            <span className={clsx(
              'inline-block rounded-full text-[11px] font-medium px-2 py-0.5',
              INVOICE_STATUS_TONE[invoice.status] ?? 'bg-sage-100 text-sage-700',
            )}>
              {invoice.status}
            </span>
          )}
          {invoice.due_date && (
            <span className="text-[11px] text-sage-500">· due {fmtDate(invoice.due_date)}</span>
          )}
          <ArrowRight size={12} className="text-sage-400" />
        </Link>
      )}
    </section>
  )
}
