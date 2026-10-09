'use server'

// Send an overdue-invoice reminder (manual — staff click "Send reminder").
// Same delivery as Send Invoice: Resend from noreply@ with the customer
// reply-to and the invoice PDF attached. Under the staff-edited message sits a
// summary card — amount outstanding, due date, Sano's bank details + reference
// (bank transfer first: it's preferred and free) and the invoice link; card is
// mentioned quietly only where it's offered (never for on-account). Fail-fast:
// no PDF means no email. Each send is recorded in invoice_reminders (the
// history + stage count) and the audit log. Never touches invoice status.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { getCustomerReplyToEmail } from '@/lib/email-reply-to'
import { invoiceBalanceDue, loadAllocatedByInvoice, type InvoiceAmountFields } from '@/lib/invoice-balance'
import { nextReminderStage, renderReminderEmailHtml } from '@/lib/invoice-reminders'
import { canTakeRealPayments } from '@/lib/stripe'
import { clientCardSetting, invoiceOffersCard } from '@/lib/card-payments'
import { SANO_ACCOUNT_NAME, SANO_ACCOUNT_NUMBER } from '@/lib/sano-bank-details'

export interface SendReminderInput {
  invoice_id: string
  to: string
  cc?: string[]
  subject: string
  message: string
}

export async function sendInvoiceReminder(input: SendReminderInput): Promise<{ ok: true; stage: number } | { error: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.to.trim()) return { error: 'Recipient email is required.' }
  if (!input.subject.trim() || !input.message.trim()) return { error: 'Subject and message are required.' }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, share_token, deleted_at, due_date, client_reference, payment_type, allow_card_payment, base_price, discount, gst_included, invoice_items ( price ), clients ( allow_card_payment )')
    .eq('id', input.invoice_id)
    .maybeSingle()
  if (!invoice) return { error: 'Invoice not found.' }
  if (invoice.deleted_at) return { error: 'This invoice is archived.' }
  if (invoice.status !== 'sent') {
    return { error: invoice.status === 'paid' ? 'This invoice is already paid.' : 'Only sent, unpaid invoices can be chased.' }
  }

  const allocated = (await loadAllocatedByInvoice(supabase, [invoice.id as string])).get(invoice.id as string) ?? 0
  const amountDue = invoiceBalanceDue(invoice as InvoiceAmountFields, allocated)
  if (amountDue <= 0) return { error: 'Nothing is owed on this invoice — mark it paid instead.' }

  const { count: sentCount } = await supabase
    .from('invoice_reminders')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', invoice.id)
  const stage = nextReminderStage(sentCount ?? 0)

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
  const shareUrl = `${origin}/share/invoice/${invoice.share_token}`

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderPdfFromUrl(`${shareUrl}?pdf=1`, { anchorClosingBlock: true })
  } catch {
    return { error: 'PDF generation failed, so the reminder was not sent. Please try again.' }
  }

  const html = renderReminderEmailHtml({
    message: input.message,
    invoiceNumber: invoice.invoice_number as string,
    amountDue,
    dueDate: (invoice.due_date as string | null) ?? null,
    clientReference: (invoice.client_reference as string | null) ?? null,
    shareUrl,
    cardAvailable: canTakeRealPayments() && invoiceOffersCard({ ...invoice, client_allow_card_payment: clientCardSetting(invoice.clients) }),
    bankAccountName: SANO_ACCOUNT_NAME,
    bankAccountNumber: SANO_ACCOUNT_NUMBER,
  })
  const cc = (input.cc ?? [])
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.toLowerCase() !== input.to.trim().toLowerCase())

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailErr } = await resend.emails.send({
    from: 'Sano <noreply@sano.nz>',
    replyTo: getCustomerReplyToEmail(),
    to: input.to.trim(),
    ...(cc.length > 0 ? { cc } : {}),
    subject: input.subject.trim(),
    html,
    attachments: [{ filename: `${sanitizePdfFilename(`Sano Tax Invoice - ${invoice.invoice_number}`)}.pdf`, content: pdfBuffer }],
  })
  if (emailErr) return { error: `Failed to send email: ${emailErr.message}` }

  // The email is out — record it. A logging failure must not read as "not sent".
  const { error: logErr } = await supabase.from('invoice_reminders').insert({
    invoice_id: invoice.id,
    stage,
    sent_by: user?.id ?? null,
    to_email: input.to.trim(),
    cc_emails: cc.length > 0 ? cc : null,
    amount_due: amountDue,
    subject: input.subject.trim(),
  })
  if (logErr) console.error('[invoice-reminder] sent but not logged:', logErr.message)

  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null,
    actor_role: 'staff',
    action: 'invoice.reminder_sent',
    entity_table: 'invoices',
    entity_id: invoice.id,
    before: null,
    after: { stage, to: input.to.trim(), cc, amount_due: amountDue },
  })

  revalidatePath(`/portal/invoices/${invoice.id}`)
  revalidatePath('/portal/alerts')
  return { ok: true, stage }
}
