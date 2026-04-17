'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createJobFromInvoice(invoiceId: string) {
  const supabase = createClient()

  // 1. Check if a job already exists for this invoice
  const { data: existingJob } = await supabase
    .from('jobs')
    .select('id')
    .eq('invoice_id', invoiceId)
    .maybeSingle()

  if (existingJob) {
    return { error: 'A job already exists for this invoice.' }
  }

  // 2. Load invoice + client name + first line item
  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .select('client_id, quote_id, service_address, scheduled_clean_date, base_price, notes, invoice_number, type_of_clean, clients ( name )')
    .eq('id', invoiceId)
    .single()

  if (iErr || !invoice) {
    return { error: `Invoice not found: ${iErr?.message}` }
  }

  const { data: items } = await supabase
    .from('invoice_items')
    .select('label')
    .eq('invoice_id', invoiceId)
    .order('sort_order')
    .limit(1)

  // 3. Build a useful title — prefer specific label, fall back through options
  const clientName = (invoice.clients as unknown as { name: string } | null)?.name
  const itemLabel = items?.[0]?.label
  const isGenericLabel = !itemLabel || itemLabel === 'Service' || itemLabel === 'Cleaning service'

  const title = !isGenericLabel
    ? itemLabel
    : invoice.type_of_clean
      ? `${invoice.type_of_clean}${clientName ? ` — ${clientName}` : ''}`
      : clientName
        ? `Cleaning — ${clientName}`
        : `Job for ${invoice.invoice_number}`

  // 4. Create job
  const { data: job, error: jErr } = await supabase
    .from('jobs')
    .insert({
      client_id: invoice.client_id,
      invoice_id: invoiceId,
      quote_id: invoice.quote_id || null,
      address: invoice.service_address || null,
      scheduled_date: invoice.scheduled_clean_date || null,
      job_price: invoice.base_price ?? null,
      title,
      description: invoice.notes || null,
      status: 'draft',
    })
    .select('id')
    .single()

  if (jErr || !job) {
    return { error: `Failed to create job: ${jErr?.message}` }
  }

  revalidatePath(`/portal/invoices/${invoiceId}`)
  revalidatePath('/portal/invoices')
  revalidatePath('/portal/jobs')

  redirect(`/portal/jobs/${job.id}`)
}
