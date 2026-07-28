import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { QuoteDocument } from '@/components/document/QuoteDocument'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase
    .from('quotes')
    .select('quote_number')
    .eq('id', params.id)
    .single()
  const number = data?.quote_number ?? 'unknown'
  return {
    title: sanitizePdfFilename(`Sano Quote - ${number}`),
    robots: 'noindex, nofollow',
  }
}

/**
 * Staff portal quote print page.
 *
 * Thin shell: fetches the quote + line items, hands them to the shared
 * `<QuoteDocument>` component which handles all rendering, totals,
 * GST logic, and document layout. Same component is used by the
 * public share page so the staff preview and the email-attached PDF
 * are pixel-identical.
 */
export default async function PrintQuotePage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: quote, error }, { data: items }] = await Promise.all([
    supabase
      .from('quotes')
      .select(`
        id, quote_number, status, date_issued, valid_until, created_at,
        property_category, type_of_clean, frequency, scope_size,
        generated_scope,
        service_address, scheduled_clean_date, notes,
        base_price, discount, gst_included, payment_type,
        contact_name, contact_email, contact_phone,
        accounts_contact_name, accounts_email,
        client_reference,
        clients ( name, company_name, service_address, phone, email )
      `)
      .eq('id', params.id)
      .single(),
    supabase
      .from('quote_items')
      .select('label, description, price, sort_order')
      .eq('quote_id', params.id)
      .order('sort_order'),
  ])

  if (error || !quote) notFound()

  return (
    <QuoteDocument
      wrapper="print-overlay"
      quote={quote as unknown as Parameters<typeof QuoteDocument>[0]['quote']}
      items={items ?? []}
    />
  )
}
