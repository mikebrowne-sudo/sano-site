'use server'

import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { sendNotification } from '@/lib/notifications/send'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { computeInvoiceDueDate, resolveServiceDate } from '@/lib/invoice-dates'
import { getCustomerReplyToEmail } from '@/lib/email-reply-to'

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

  const supabase = createClient()

  // Single upfront fetch — collect every column we'll need for date
  // computation, PDF rendering, and the final status flip in one
  // round-trip.
  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      'share_token, invoice_number, date_issued, due_date, payment_type, scheduled_clean_date, client_id',
    )
    .eq('id', input.invoice_id)
    .single()

  if (!invoice?.share_token || !invoice?.invoice_number) {
    return { error: 'PDF generation failed, so the email was not sent. Please try again.' }
  }

  // Stamp missing dates BEFORE rendering the PDF. The PDF is generated
  // by Puppeteer hitting the share page, which reads these fields
  // straight from the DB — render-then-stamp leaves the attachment
  // showing blanks. due_date computation reuses the canonical helper
  // from src/lib/invoice-dates so quote-conversion / send / Stripe
  // checkout all agree on the formula.
  // Stamp the issue + due dates on the FIRST send and keep them sticky
  // thereafter. `date_issued` reflects the day the invoice actually went
  // out (a re-send never changes it), and `due_date` is computed from that
  // send date — so an invoice sent AFTER the clean gets a send-based due
  // date (cash sale: due on the send date; on account: send + 14), while
  // one sent BEFORE the clean is still due the day before the job.
  const today = new Date().toISOString().slice(0, 10)
  const isFirstSend = !invoice.date_issued
  const effectiveDateIssued = (invoice.date_issued as string | null) || today

  let effectiveDueDate: string | null = (invoice.due_date as string | null) ?? null
  if (isFirstSend) {
    const { data: client } = await supabase
      .from('clients')
      .select('payment_terms')
      .eq('id', invoice.client_id)
      .maybeSingle()

    // Recompute from the actual send date, overriding any provisional
    // value written at creation.
    effectiveDueDate = computeInvoiceDueDate({
      payment_type: (invoice.payment_type as string | null) ?? 'cash_sale',
      payment_terms: (client?.payment_terms as string | null) ?? null,
      date_issued: effectiveDateIssued,
      service_date: resolveServiceDate({
        quote_scheduled_clean_date: (invoice.scheduled_clean_date as string | null) ?? null,
      }),
    })
  }

  const datePatch: Record<string, string> = {}
  if (isFirstSend) {
    datePatch.date_issued = effectiveDateIssued
    if (effectiveDueDate) datePatch.due_date = effectiveDueDate
  }

  if (Object.keys(datePatch).length > 0) {
    const { error: dateUpdErr } = await supabase
      .from('invoices')
      .update(datePatch)
      .eq('id', input.invoice_id)
    if (dateUpdErr) {
      return {
        error: 'PDF generation failed, so the email was not sent. Please try again.',
        detail: dateUpdErr.message,
      }
    }
  }

  // Phase J — render the share-page PDF and attach it. Fail-fast:
  // if rendering fails, do NOT send the email and do NOT flip status.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `https://${headers().get('host') ?? 'sano.nz'}`

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderPdfFromUrl(
      `${origin}/share/invoice/${invoice.share_token}?pdf=1`,
      {},
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'unknown error'
    return {
      error: 'PDF generation failed, so the email was not sent. Please try again.',
      detail,
    }
  }

  const pdfFilename = `${sanitizePdfFilename(`Sano Tax Invoice - ${invoice.invoice_number}`)}.pdf`

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
    replyTo: getCustomerReplyToEmail(),
    to: input.to.trim(),
    ...(ccList.length > 0 ? { cc: ccList } : {}),
    subject: input.subject,
    html,
    attachments: [{ filename: pdfFilename, content: pdfBuffer }],
  })

  if (emailErr) {
    return { error: `Failed to send email: ${emailErr.message}` }
  }

  // Email sent → flip status. Dates are already stamped above, so
  // they're not re-set here.
  const { error: updateErr } = await supabase
    .from('invoices')
    .update({ status: 'sent' })
    .eq('id', input.invoice_id)

  if (updateErr) {
    return { error: `Email sent but failed to update invoice status: ${updateErr.message}` }
  }

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
