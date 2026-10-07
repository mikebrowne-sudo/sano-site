// Auto-send a recurring invoice to the client (service-role safe — callable
// from the cron with no user session). Mirrors sendInvoiceEmail's core: stamp
// dates on first send, render the share-page PDF, email via Resend, flip
// status to 'sent'. Fail-safe: on any problem it returns an error and the
// invoice stays a draft (so it still surfaces in the "Send draft invoices"
// to-do). Only ever called when the contract has invoice_auto_send on.

import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { computeInvoiceDueDate, resolveServiceDate } from '@/lib/invoice-dates'
import { getCustomerReplyToEmail } from '@/lib/email-reply-to'
import { nzToday } from '@/lib/nz-date'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function sendRecurringInvoiceEmail(
  svc: SupabaseClient,
  invoiceId: string,
): Promise<{ sent?: true; error?: string }> {
  const { data: invoice } = await svc
    .from('invoices')
    .select('share_token, invoice_number, date_issued, due_date, payment_type, scheduled_clean_date, client_id, contact_name, accounts_email')
    .eq('id', invoiceId)
    .single()
  if (!invoice?.share_token || !invoice?.invoice_number) return { error: 'invoice not ready to send' }

  const { data: client } = await svc
    .from('clients')
    .select('email, accounts_email, payment_terms')
    .eq('id', invoice.client_id)
    .maybeSingle()
  // Same routing as the manual Send panel: invoice accounts email, then the
  // client's accounts email, then the client's main email.
  const to = (
    (invoice.accounts_email as string | null)?.trim() ||
    (client?.accounts_email as string | null)?.trim() ||
    (client?.email as string | null)?.trim()
  )
  if (!to) return { error: 'no client email on file' }

  // Stamp issue + due dates on the first send (sticky thereafter). NZ date:
  // the cron fires at 21:00 UTC, which is the 1st in NZ but the 31st in UTC.
  const today = nzToday()
  if (!invoice.date_issued) {
    const dueDate = computeInvoiceDueDate({
      payment_type: (invoice.payment_type as string | null) ?? 'on_account',
      payment_terms: (client?.payment_terms as string | null) ?? null,
      date_issued: today,
      service_date: resolveServiceDate({
        quote_scheduled_clean_date: (invoice.scheduled_clean_date as string | null) ?? null,
      }),
    })
    const patch: Record<string, string> = { date_issued: today }
    if (dueDate) patch.due_date = dueDate
    const { error } = await svc.from('invoices').update(patch).eq('id', invoiceId)
    if (error) return { error: `could not stamp dates: ${error.message}` }
  }

  // "Hi Kelsey," when the invoice carries a contact, otherwise "Hi,".
  const firstName = ((invoice.contact_name as string | null) ?? '').trim().split(/\s+/)[0]
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const shareUrl = `${origin}/share/invoice/${invoice.share_token}`

  let pdf: Buffer
  try {
    pdf = await renderPdfFromUrl(`${shareUrl}?pdf=1`, { anchorClosingBlock: true })
  } catch (err) {
    return { error: `PDF render failed: ${err instanceof Error ? err.message : 'unknown'}` }
  }

  const html = `
    <p>${esc(greeting)}</p>
    <p>Please find attached your Sano tax invoice ${esc(invoice.invoice_number as string)}.</p>
    <p><a href="${esc(shareUrl)}" style="display:inline-block;padding:10px 20px;background:#076653;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View invoice</a></p>
    <p>If you have any questions, just reply to this email.</p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
  `

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailErr } = await resend.emails.send({
    from: 'Sano <noreply@sano.nz>',
    replyTo: getCustomerReplyToEmail(),
    to,
    subject: `Sano tax invoice ${invoice.invoice_number}`,
    html,
    attachments: [{ filename: `${sanitizePdfFilename(`Sano Tax Invoice - ${invoice.invoice_number}`)}.pdf`, content: pdf }],
  })
  if (emailErr) return { error: `email failed: ${emailErr.message}` }

  const { error: statusErr } = await svc.from('invoices').update({ status: 'sent' }).eq('id', invoiceId)
  if (statusErr) return { error: `sent but status update failed: ${statusErr.message}` }

  return { sent: true }
}
