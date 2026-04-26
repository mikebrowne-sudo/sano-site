'use server'

import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/send'

interface SendInvoiceInput {
  invoice_id: string
  invoice_number: string
  to: string
  cc?: string[]
  subject: string
  message: string
  print_url: string
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function sendInvoiceEmail(input: SendInvoiceInput) {
  if (!input.to.trim()) {
    return { error: 'Recipient email is required.' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const html = `
    <p>${esc(input.message).replace(/\n/g, '<br>')}</p>
    <p><a href="${esc(input.print_url)}" style="display:inline-block;padding:10px 20px;background:#076653;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View Invoice</a></p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
  `

  const ccList = (input.cc ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.toLowerCase() !== input.to.trim().toLowerCase())

  const { error: emailErr } = await resend.emails.send({
    from: 'Sano <noreply@sano.nz>',
    to: input.to.trim(),
    ...(ccList.length > 0 ? { cc: ccList } : {}),
    subject: input.subject,
    html,
  })

  if (emailErr) {
    return { error: `Failed to send email: ${emailErr.message}` }
  }

  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: invoice } = await supabase
    .from('invoices')
    .select('date_issued')
    .eq('id', input.invoice_id)
    .single()

  await supabase
    .from('invoices')
    .update({
      status: 'sent',
      date_issued: invoice?.date_issued || today,
    })
    .eq('id', input.invoice_id)

  // Phase H.2 — courtesy SMS to the client after the invoice email
  // succeeds. Wrapped so any failure here cannot revoke the email-
  // success contract above; sendNotification logs every outcome
  // (sent / failed / skipped) to notification_logs internally.
  try {
    const { data: full } = await supabase
      .from('invoices')
      .select(`
        client_id, due_date, base_price, discount,
        invoice_items ( price ),
        clients ( name, phone )
      `)
      .eq('id', input.invoice_id)
      .single()

    if (full?.client_id && full.clients) {
      const client = full.clients as unknown as { name: string | null; phone: string | null }
      const items  = (full.invoice_items ?? []) as { price: number }[]
      const addOns = items.reduce((s, i) => s + (i.price ?? 0), 0)
      const total  = (full.base_price ?? 0) + addOns - (full.discount ?? 0)

      const dueLabel = full.due_date
        ? new Date(full.due_date).toLocaleDateString('en-NZ', {
            day: 'numeric', month: 'short', year: 'numeric',
          })
        : ''

      await sendNotification(supabase, {
        type: 'invoice_sent',
        channel: 'sms',
        audience: 'customer',
        source: 'automated',
        recipientName: client.name,
        recipientPhone: client.phone,
        variables: {
          client_name:    (client.name ?? '').split(/\s+/)[0],
          invoice_number: input.invoice_number,
          invoice_total:  total.toFixed(2),
          due_date:       dueLabel,
          invoice_link:   input.print_url,
          business_name:  'Sano',
          business_phone: '0800 726 686',
        },
        clientId:  full.client_id,
        invoiceId: input.invoice_id,
      })
    }
  } catch {
    // Notification path must never break the email-success contract.
  }

  revalidatePath(`/portal/invoices/${input.invoice_id}`)
  revalidatePath('/portal/invoices')
  return { success: true }
}

export async function markInvoicePaid(invoiceId: string) {
  const supabase = createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'paid', date_paid: today })
    .eq('id', invoiceId)

  if (error) {
    return { error: `Failed to update invoice: ${error.message}` }
  }

  revalidatePath(`/portal/invoices/${invoiceId}`)
  revalidatePath('/portal/invoices')
  return { success: true }
}
