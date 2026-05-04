'use server'

// Phase 5.5.X — Custom (legacy) invoice creation.
// Isolated from _actions.ts on purpose: the existing actions file
// covers send / mark-paid / archive flows that are well-trodden;
// keeping the new write path in its own file makes the diff small
// and revertible.

import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import {
  validateCustomInvoiceForm,
  type CustomInvoiceFormInput,
} from '@/lib/custom-invoice-validation'

const ADMIN_EMAIL = 'michael@sano.nz'

type ActionResult = {
  error: string
  fieldErrors?: Partial<Record<keyof CustomInvoiceFormInput, string>>
}

export async function createCustomInvoice(input: CustomInvoiceFormInput): Promise<ActionResult | never> {
  const supabase = createClient()

  // 1. Auth — admin only.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: 'Not authorised.' }
  }

  // 2. Server-side validation via the shared lib. Always run here so
  //    a hand-crafted POST can't bypass the form.
  const validation = validateCustomInvoiceForm(input)
  if (!validation.ok) {
    return { error: 'Please fix the highlighted fields.', fieldErrors: validation.errors }
  }
  const v = validation.value

  // 3. Verify the client exists and isn't archived.
  const { data: client, error: cErr } = await supabase
    .from('clients')
    .select('id, is_archived')
    .eq('id', v.client_id)
    .maybeSingle()
  if (cErr || !client) {
    return { error: 'Selected client not found.' }
  }
  if (client.is_archived) {
    return { error: 'Selected client is archived. Restore the client first.' }
  }

  // 4. Server-side uniqueness pre-check. Returns a clean field-level
  //    error before the DB unique index has to fire.
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('invoice_number', v.invoice_number)
    .maybeSingle()
  if (existing) {
    return {
      error: `Invoice number ${v.invoice_number} is already in use.`,
      fieldErrors: { invoice_number: `Invoice number ${v.invoice_number} is already in use.` },
    }
  }

  // 5. Resolve the client's primary contact. Phase 5.5.9 backfill
  //    guarantees one for existing clients; we tolerate absence.
  const { data: primaryContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('client_id', v.client_id)
    .eq('contact_type', 'primary')
    .maybeSingle()

  // 6. Insert. quote_id = job_id = null on purpose — keeps the row
  //    invisible to every quote/job converter and to the
  //    auto_create_job_on_invoice side effect.
  const { data: invoice, error: iErr } = await supabase
    .from('invoices')
    .insert({
      invoice_number: v.invoice_number,
      source: 'custom',
      client_id: v.client_id,
      contact_id: primaryContact?.id ?? null,
      quote_id: null,
      job_id: null,
      status: 'draft',
      date_issued: v.date_issued,
      due_date: v.due_date,
      service_address: v.service_address,
      service_description: v.service_description,
      notes: v.notes,
      base_price: v.base_price,
      gst_included: v.gst_included,
      payment_type: v.payment_type,
    })
    .select('id, invoice_number')
    .single()

  if (iErr || !invoice) {
    return { error: `Failed to create invoice: ${iErr?.message ?? 'unknown error'}` }
  }

  // 7. Audit log. actor_email goes in the `after` payload because
  //    audit_log doesn't have a dedicated email column.
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    actor_role: 'staff',
    action: 'invoice.created_custom',
    entity_table: 'invoices',
    entity_id: invoice.id,
    before: null,
    after: {
      actor_email: user.email,
      invoice_number: invoice.invoice_number,
      client_id: v.client_id,
      base_price: v.base_price,
      gst_included: v.gst_included,
      payment_type: v.payment_type,
      date_issued: v.date_issued,
      due_date: v.due_date,
    },
  })

  redirect(`/portal/invoices/${invoice.id}`)
}
