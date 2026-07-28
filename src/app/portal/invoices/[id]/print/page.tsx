import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { InvoiceDocument } from '@/components/document/InvoiceDocument'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('id', params.id)
    .single()
  const number = data?.invoice_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Tax Invoice - ${number}`),
    robots: 'noindex, nofollow',
  }
}

/**
 * Staff portal invoice print page.
 *
 * Thin shell: fetches the invoice + line items, hands them to the
 * shared `<InvoiceDocument>` component which handles all rendering,
 * totals, GST logic, document layout, and the Payment Details block.
 * Same component is used by the public share page so the staff
 * preview and the email-attached PDF are pixel-identical.
 */
export default async function PrintInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: invoice, error }, { data: items }] = await Promise.all([
    supabase
      .from('invoices')
      .select(`
        id, invoice_number, status, date_issued, due_date, created_at,
        property_category, type_of_clean, frequency, scope_size,
        service_address, scheduled_clean_date, notes, service_description,
        base_price, discount, gst_included, payment_type,
        contact_name, contact_email, contact_phone,
        accounts_contact_name, accounts_email,
        client_reference, requires_po,
        clients ( name, company_name, service_address, phone, email )
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('invoice_items')
      .select('label, description, price, sort_order')
      .eq('invoice_id', params.id)
      .order('sort_order'),
  ])

  if (error || !invoice) notFound()

  return (
    <InvoiceDocument
      wrapper="print-overlay"
      invoice={invoice as unknown as Parameters<typeof InvoiceDocument>[0]['invoice']}
      items={items ?? []}
    />
  )
}
