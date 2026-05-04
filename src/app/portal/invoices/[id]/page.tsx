import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { SendInvoicePanel } from './_components/SendInvoicePanel'
import { MarkAsPaidButton } from './_components/MarkAsPaidButton'
import { RegenerateShareLink } from '../../_components/RegenerateShareLink'
import { ArchiveInvoiceButton } from './_components/ArchiveInvoiceButton'
import { InvoiceJobButton } from './_components/InvoiceJobButton'
import { InvoiceLinkBanner } from './_components/InvoiceLinkBanner'
import { InvoiceLinkedRecords } from './_components/InvoiceLinkedRecords'
import { LifecycleActions } from '../../_components/LifecycleActions'
import { getCleanupAccess } from '@/lib/cleanup-mode'
import { firstName } from '@/lib/doc-helpers'
import { StatusBadge } from '../../_components/StatusBadge'
import { computeInvoiceDisplayStatus } from '@/lib/quote-status'
import { CustomInvoiceBadge } from '../_components/CustomInvoiceBadge'
import clsx from 'clsx'

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = user?.email === 'michael@sano.nz'
  // Phase 5.5.14 — cleanup mode gates the per-record lifecycle UI.
  const cleanup = await getCleanupAccess(supabase)
  const canCleanup = cleanup.canCleanup

  const [{ data: invoice, error }, { data: items }] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id, invoice_number, quote_id, client_id, status,
        property_category, type_of_clean, service_type,
        frequency, scope_size, service_address, notes,
        base_price, discount, gst_included, payment_type, share_token,
        date_issued, due_date, date_paid,
        created_at,
        is_price_overridden, override_price, override_reason, override_confirmed,
        override_confirmed_by, override_confirmed_at, calculated_price,
        contact_name, contact_email, contact_phone,
        accounts_contact_name, accounts_email,
        client_reference, requires_po,
        job_id, source,
        deleted_at,
        is_test,
        source,
        clients ( name, company_name )
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('invoice_items')
      .select('id, label, price, sort_order')
      .eq('invoice_id', params.id)
      .order('sort_order'),
  ])

  if (error || !invoice) notFound()

  const [{ data: clientRecord }, { data: linkedJob }, { data: linkedQuote }, { data: candidateJobs }] = await Promise.all([
    supabase
      .from('clients')
      .select('name, email')
      .eq('id', invoice.client_id)
      .single(),
    supabase
      .from('jobs')
      .select('id, job_number, status, scheduled_date')
      .eq('invoice_id', params.id)
      .maybeSingle(),
    // Phase 1 follow-up: fetch the source quote for the linked-record
    // strip near the header. invoice.quote_id is the one-way pointer
    // populated by both convertToInvoice and createInvoiceFromJob.
    invoice.quote_id
      ? supabase
          .from('quotes')
          .select('id, quote_number, status')
          .eq('id', invoice.quote_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Phase 5.5.10 — for the unlinked-invoice banner: jobs that belong
    // to the same client and aren't already attached to another invoice.
    supabase
      .from('jobs')
      .select('id, job_number, status, scheduled_date')
      .eq('client_id', invoice.client_id)
      .is('deleted_at', null)
      .or(`invoice_id.is.null,invoice_id.eq.${params.id}`)
      .order('scheduled_date', { ascending: false, nullsFirst: false }),
  ])
  const invoiceUnlinked = !((invoice as { job_id?: string | null }).job_id)
  const linkCandidates = (candidateJobs ?? []) as { id: string; job_number: string; status: string; scheduled_date: string | null }[]

  const client = invoice.clients as unknown as { name: string; company_name: string | null } | null
  const addons = items ?? []
  const addonsTotal = addons.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const total = (invoice.base_price ?? 0) + addonsTotal - (invoice.discount ?? 0)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const shareUrl = `${siteUrl}/share/invoice/${invoice.share_token}`

  const serviceLines: { label: string; value: string }[] = []
  if (invoice.property_category) serviceLines.push({ label: 'Property', value: invoice.property_category })
  if (invoice.type_of_clean) serviceLines.push({ label: 'Clean type', value: invoice.type_of_clean })
  if (invoice.service_type) serviceLines.push({ label: 'Service', value: invoice.service_type })
  if (invoice.frequency) serviceLines.push({ label: 'Frequency', value: invoice.frequency })
  if (invoice.scope_size) serviceLines.push({ label: 'Size', value: invoice.scope_size })
  if (invoice.service_address) serviceLines.push({ label: 'Address', value: invoice.service_address })

  // Overdue logic (UI only)
  const displayStatus = computeInvoiceDisplayStatus(invoice.status, invoice.due_date)
  const isOverdue = displayStatus === 'overdue'
  const showMarkPaid = displayStatus !== 'paid' && displayStatus !== 'cancelled'

  return (
    <div>
      <Link
        href="/portal/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to invoices
      </Link>

      {isAdmin && invoiceUnlinked && (
        <InvoiceLinkBanner invoiceId={invoice.id as string} jobs={linkCandidates} />
      )}

      {isAdmin && canCleanup && (
        <div className="mb-4">
          <LifecycleActions
            entity="invoice"
            id={invoice.id as string}
            isArchived={!!invoice.deleted_at}
            isTest={!!(invoice as { is_test?: boolean }).is_test}
          />
        </div>
      )}

      {/* Phase 1 follow-up: clickable linked-record chips (source
          quote + linked job). Mirrors the QuoteLinkedRecords strip on
          the quote detail page so the visual language stays consistent
          across detail surfaces. Empty when no related records exist. */}
      <InvoiceLinkedRecords
        quote={linkedQuote ? {
          id: (linkedQuote as { id: string }).id,
          quote_number: (linkedQuote as { quote_number: string | null }).quote_number ?? null,
          status: (linkedQuote as { status: string | null }).status ?? null,
        } : null}
        job={linkedJob ? {
          id: (linkedJob as { id: string }).id,
          job_number: (linkedJob as { job_number: string | null }).job_number ?? null,
          status: (linkedJob as { status: string | null }).status ?? null,
          scheduled_date: (linkedJob as { scheduled_date: string | null }).scheduled_date ?? null,
        } : null}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl tracking-tight font-bold text-sage-800">{invoice.invoice_number}</h1>
          {(invoice as { source?: string | null }).source === 'custom' && <CustomInvoiceBadge size="md" />}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge kind="invoice" status={displayStatus} size="md" />
          {showMarkPaid && <MarkAsPaidButton invoiceId={invoice.id} />}
          <InvoiceJobButton invoiceId={invoice.id} linkedJob={linkedJob ?? null} />
          <a
            href={`/portal/invoices/${params.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-sage-200 text-sage-700 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-sage-50 transition-colors"
          >
            <Printer size={16} />
            Print / PDF
          </a>
          <SendInvoicePanel
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            clientEmail={clientRecord?.email ?? ''}
            clientName={firstName(clientRecord?.name)}
            printUrl={shareUrl}
            accountsEmail={invoice.accounts_email ?? ''}
            primaryContactEmail={invoice.contact_email ?? ''}
            clientReference={invoice.client_reference ?? ''}
            requiresPo={invoice.requires_po ?? false}
          />
        </div>
      </div>
      <div className="flex justify-end mb-6 gap-2">
        <RegenerateShareLink table="invoices" id={invoice.id} />
        {isAdmin && !invoice.deleted_at && (
          <ArchiveInvoiceButton
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoice_number}
            invoiceStatus={displayStatus}
          />
        )}
      </div>

      {invoice.deleted_at && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm text-red-900 font-semibold">This invoice is archived.</p>
          <p className="text-xs text-red-800 mt-0.5">
            Archived on {new Date(invoice.deleted_at).toLocaleString('en-NZ')}.
            Restore it from <strong>Settings → Archived Records</strong>.
          </p>
        </div>
      )}

      {(invoice as { source?: string | null }).source === 'custom'
        && (displayStatus === 'sent' || displayStatus === 'paid' || displayStatus === 'overdue') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <p className="text-sm text-amber-900 font-semibold">Custom invoice — already {displayStatus}.</p>
          <p className="text-xs text-amber-800 mt-0.5">
            This is a custom (legacy) invoice. Edits won&apos;t notify the customer automatically — confirm any wording changes are reflected in the next send.
          </p>
        </div>
      )}

      <div className="max-w-2xl space-y-8">
        {/* Client */}
        <Section title="Client">
          <p className="font-medium text-sage-800">{client?.name ?? '—'}</p>
          {client?.company_name && <p className="text-sage-600 text-sm">{client.company_name}</p>}

          {(invoice.contact_name || invoice.contact_email || invoice.accounts_email || invoice.client_reference || invoice.requires_po) && (
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {invoice.contact_name && (
                <div>
                  <dt className="text-sage-500">Primary contact</dt>
                  <dd className="text-sage-800">{invoice.contact_name}</dd>
                </div>
              )}
              {invoice.contact_email && (
                <div>
                  <dt className="text-sage-500">Primary contact email</dt>
                  <dd className="text-sage-800 break-all">{invoice.contact_email}</dd>
                </div>
              )}
              {invoice.accounts_contact_name && (
                <div>
                  <dt className="text-sage-500">Accounts contact</dt>
                  <dd className="text-sage-800">{invoice.accounts_contact_name}</dd>
                </div>
              )}
              {invoice.accounts_email && (
                <div>
                  <dt className="text-sage-500">Accounts email</dt>
                  <dd className="text-sage-800 break-all">{invoice.accounts_email}</dd>
                </div>
              )}
              {invoice.client_reference && (
                <div className="sm:col-span-2">
                  <dt className="text-sage-500">Client reference / PO</dt>
                  <dd className="text-sage-800 font-medium">{invoice.client_reference}</dd>
                </div>
              )}
              {invoice.requires_po && !invoice.client_reference && (
                <div className="sm:col-span-2">
                  <dt className="text-sage-500">PO status</dt>
                  <dd className="text-amber-700 font-medium">PO required — none captured on quote</dd>
                </div>
              )}
            </dl>
          )}
        </Section>

        {/* Dates */}
        <Section title="Dates">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-sage-500">Created</span>
              <p className="text-sage-800 font-medium">{fmtDate(invoice.created_at)}</p>
            </div>
            <div>
              <span className="text-sage-500">Issued</span>
              <p className="text-sage-800 font-medium">{fmtDate(invoice.date_issued)}</p>
            </div>
            <div>
              <span className="text-sage-500">Due</span>
              <p className={clsx('font-medium', isOverdue ? 'text-amber-600' : 'text-sage-800')}>{fmtDate(invoice.due_date)}</p>
            </div>
            <div>
              <span className="text-sage-500">Paid</span>
              <p className={clsx('font-medium', invoice.date_paid ? 'text-emerald-700' : 'text-sage-800')}>{fmtDate(invoice.date_paid)}</p>
            </div>
          </div>
        </Section>

        {/* Service details */}
        {serviceLines.length > 0 && (
          <Section title="Service">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {serviceLines.map((l) => (
                <div key={l.label}>
                  <span className="text-sage-500">{l.label}</span>
                  <p className="text-sage-800">{l.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Pricing */}
        <Section title="Pricing">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between text-sm text-sage-600 mb-1">
              <span>Base price</span>
              <span>{fmt(invoice.base_price ?? 0)}</span>
            </div>
            {addons.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm text-sage-600 mb-1">
                <span>{a.label}</span>
                <span>{fmt(a.price)}</span>
              </div>
            ))}
            {(invoice.discount ?? 0) > 0 && (
              <div className="flex items-center justify-between text-sm text-sage-600 mb-1">
                <span>Discount</span>
                <span>-{fmt(invoice.discount)}</span>
              </div>
            )}
            <div className="border-t border-sage-100 mt-3 pt-3 flex items-center justify-between">
              <span className="font-semibold text-sage-800">
                Total{invoice.gst_included ? ' (GST incl.)' : ' (excl. GST)'}
              </span>
              <span className="text-xl font-bold text-sage-800">{fmt(total)}</span>
            </div>
          </div>
        </Section>

        {/* Manual override audit block */}
        {invoice.is_price_overridden && (
          <Section title="Manual override applied">
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 space-y-2">
              <p className="text-sm text-amber-800 font-medium">
                This invoice was created with a manual price override.
              </p>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {invoice.calculated_price != null && (
                  <div>
                    <dt className="text-sage-500">Original calculated price</dt>
                    <dd className="text-sage-800">{fmt(invoice.calculated_price)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sage-500">Final invoiced price</dt>
                  <dd className="text-sage-800 font-semibold">{fmt(invoice.override_price ?? invoice.base_price ?? 0)}</dd>
                </div>
                {invoice.override_reason && (
                  <div className="sm:col-span-2">
                    <dt className="text-sage-500">Reason</dt>
                    <dd className="text-sage-800 whitespace-pre-wrap">{invoice.override_reason}</dd>
                  </div>
                )}
                {invoice.override_confirmed_at && (
                  <div className="sm:col-span-2">
                    <dt className="text-sage-500">Confirmed</dt>
                    <dd className="text-sage-800">
                      {invoice.override_confirmed_by ? `By user ${invoice.override_confirmed_by.slice(0, 8)}…` : 'By unknown user'}
                      {' on '}
                      {new Date(invoice.override_confirmed_at).toLocaleString('en-NZ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </Section>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Section title="Notes">
            <p className="text-sage-600 text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-sage-800 mb-3">{title}</h2>
      {children}
    </div>
  )
}
