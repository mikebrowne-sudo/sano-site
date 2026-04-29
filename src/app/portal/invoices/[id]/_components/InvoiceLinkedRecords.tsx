// Phase 1 follow-up: when an invoice has a source quote and/or a
// linked job, surface them as clickable badges near the header so
// the operator can jump straight to the related record. Mirrors the
// QuoteLinkedRecords component on the quote detail page so the visual
// language stays consistent across detail surfaces.
//
// Server component (just renders <Link>s). Empty when no related
// records exist — keeps the header clean for standalone invoices.

import Link from 'next/link'
import clsx from 'clsx'
import { FileText, Briefcase, ArrowRight } from 'lucide-react'

interface LinkedQuote {
  id: string
  quote_number: string | null
  status: string | null
}

interface LinkedJob {
  id: string
  job_number: string | null
  status: string | null
  scheduled_date: string | null
}

const QUOTE_STATUS_TONE: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  viewed:    'bg-sky-50 text-sky-700',
  accepted:  'bg-emerald-50 text-emerald-700',
  declined:  'bg-red-50 text-red-700',
  converted: 'bg-sage-50 text-sage-700',
}

const JOB_STATUS_TONE: Record<string, string> = {
  draft:       'bg-gray-100 text-gray-700',
  assigned:    'bg-blue-50 text-blue-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed:   'bg-gray-100 text-gray-700',
  invoiced:    'bg-sage-50 text-sage-700',
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function InvoiceLinkedRecords({
  quote, job,
}: {
  quote?: LinkedQuote | null
  job?: LinkedJob | null
}) {
  if (!quote && !job) return null

  return (
    <section
      aria-label="Linked records"
      className="bg-sage-50/60 border border-sage-100 rounded-xl px-5 py-3 mb-4 flex flex-wrap items-center gap-3"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-sage-500 mr-1">
        Linked
      </span>

      {quote && (
        <Link
          href={`/portal/quotes/${quote.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-sage-100 hover:border-sage-200 hover:shadow-sm transition-all px-3 py-1.5 text-sm"
        >
          <FileText size={14} className="text-sage-600" />
          <span className="font-medium text-sage-800">Quote {quote.quote_number ?? '—'}</span>
          {quote.status && (
            <span className={clsx(
              'inline-block rounded-full text-[11px] font-medium px-2 py-0.5',
              QUOTE_STATUS_TONE[quote.status] ?? 'bg-sage-100 text-sage-700',
            )}>
              {quote.status}
            </span>
          )}
          <ArrowRight size={12} className="text-sage-400" />
        </Link>
      )}

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
    </section>
  )
}
