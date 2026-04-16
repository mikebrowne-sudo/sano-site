import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { SendInvoicePanel } from './_components/SendInvoicePanel'
import { MarkAsPaidButton } from './_components/MarkAsPaidButton'
import { RegenerateShareLink } from '../../_components/RegenerateShareLink'
import clsx from 'clsx'

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-50 text-blue-700',
  paid:      'bg-emerald-50 text-emerald-700',
  overdue:   'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
}

function fmt(dollars: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(dollars)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

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

  const { data: clientRecord } = await supabase
    .from('clients')
    .select('email')
    .eq('id', invoice.client_id)
    .single()

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
  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = invoice.status === 'sent' && invoice.due_date && invoice.due_date < today
  const displayStatus = isOverdue ? 'overdue' : invoice.status
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

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-sage-800">{invoice.invoice_number}</h1>
          {invoice.quote_id && (
            <Link href={`/portal/quotes/${invoice.quote_id}`} className="text-sm text-sage-500 hover:text-sage-700">
              From quote
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx('inline-block px-3 py-1 rounded-full text-sm font-medium capitalize', STATUS_STYLES[displayStatus] ?? STATUS_STYLES.draft)}>
            {displayStatus}
          </span>
          {showMarkPaid && <MarkAsPaidButton invoiceId={invoice.id} />}
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
            printUrl={shareUrl}
          />
        </div>
      </div>
      <div className="flex justify-end mb-6">
        <RegenerateShareLink table="invoices" id={invoice.id} />
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Client */}
        <Section title="Client">
          <p className="font-medium text-sage-800">{client?.name ?? '—'}</p>
          {client?.company_name && <p className="text-sage-600 text-sm">{client.company_name}</p>}
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
          <div className="bg-white rounded-xl border border-sage-100 p-5">
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
