'use server'

// Bulk overdue reminders from Alerts. The browser calls this ONCE PER CUSTOMER
// (one recipient address), one after another, so each call renders at most a
// handful of PDFs and stays well inside the function time limit — and one
// customer's failure never stops the rest.
//
// One email per customer: a single overdue invoice gets the normal reminder
// wording; several get the combined email listing them all, every PDF
// attached. Fail-fast like the single send: if any PDF can't be rendered,
// nothing goes to that customer. Every invoice is re-checked here (still
// sent, still owing, same recipient) — the list on screen is never trusted.

import { createClient } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { assertAdminAction } from '@/lib/require-admin'
import { nzToday } from '@/lib/nz-date'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { getCustomerReplyToEmail } from '@/lib/email-reply-to'
import { loadReminderCandidates } from '@/lib/invoice-reminder-candidates'
import {
  buildCombinedReminderEmail,
  buildReminderEmail,
  reminderGroupKey,
  renderCombinedReminderEmailHtml,
  renderReminderEmailHtml,
  type ReminderStage,
} from '@/lib/invoice-reminders'
import { SANO_ACCOUNT_NAME, SANO_ACCOUNT_NUMBER } from '@/lib/sano-bank-details'

export async function sendCustomerReminders(
  invoiceIds: string[],
): Promise<{ ok: true; sent: string[] } | { error: string }> {
  await assertAdminAction()
  const ids = Array.from(new Set(invoiceIds)).slice(0, 10)
  if (ids.length === 0) return { error: 'No invoices selected.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const invoices = await loadReminderCandidates(supabase, nzToday(), ids)
  if (invoices.length !== ids.length) {
    return { error: 'Some of these invoices are no longer overdue or owing — refresh the page and try again.' }
  }
  const to = invoices[0].to
  if (!to) return { error: `No email address on file for ${invoices[0].clientName}.` }
  if (invoices.some((i) => reminderGroupKey(i.to) !== reminderGroupKey(to))) {
    return { error: 'These invoices go to different email addresses.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
  const withUrls = invoices.map((i) => ({ ...i, shareUrl: `${origin}/share/invoice/${i.shareToken}` }))

  // PDFs one at a time (each render boots its own browser).
  const attachments: { filename: string; content: Buffer }[] = []
  for (const i of withUrls) {
    try {
      attachments.push({
        filename: `${sanitizePdfFilename(`Sano Tax Invoice - ${i.invoiceNumber}`)}.pdf`,
        content: await renderPdfFromUrl(`${i.shareUrl}?pdf=1`, { anchorClosingBlock: true }),
      })
    } catch {
      return { error: `PDF generation failed for ${i.invoiceNumber}, so nothing was sent to ${i.clientName}. Please try again.` }
    }
  }

  const bank = { bankAccountName: SANO_ACCOUNT_NAME, bankAccountNumber: SANO_ACCOUNT_NUMBER }
  let subject: string
  let html: string
  if (withUrls.length === 1) {
    const i = withUrls[0]
    const draft = buildReminderEmail({
      stage: i.stage, greeting: i.greeting, invoiceNumber: i.invoiceNumber, amountDue: i.amountDue,
      dueDate: i.dueDate, daysOverdue: i.daysOverdue, cardAvailable: i.cardAvailable, clientReference: i.clientReference,
    })
    subject = draft.subject
    html = renderReminderEmailHtml({
      message: draft.message, invoiceNumber: i.invoiceNumber, amountDue: i.amountDue, dueDate: i.dueDate,
      clientReference: i.clientReference, shareUrl: i.shareUrl, cardAvailable: i.cardAvailable, ...bank,
    })
  } else {
    // Firmest stage among them sets the tone; greet a person only if every
    // invoice agrees on who that is.
    const stage = Math.max(...withUrls.map((i) => i.stage)) as ReminderStage
    const greetings = new Set(withUrls.map((i) => i.greeting))
    const greeting = greetings.size === 1 ? withUrls[0].greeting : 'Hi there,'
    const draft = buildCombinedReminderEmail({ stage, greeting, invoices: withUrls })
    subject = draft.subject
    html = renderCombinedReminderEmailHtml({
      message: draft.message,
      invoices: withUrls,
      cardAvailable: withUrls.every((i) => i.cardAvailable),
      ...bank,
    })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailErr } = await resend.emails.send({
    from: 'Sano <noreply@sano.nz>',
    replyTo: getCustomerReplyToEmail(),
    to,
    subject,
    html,
    attachments,
  })
  if (emailErr) return { error: `Failed to send to ${invoices[0].clientName}: ${emailErr.message}` }

  // The email is out — record each invoice's reminder (drives its stage count).
  const { error: logErr } = await supabase.from('invoice_reminders').insert(
    withUrls.map((i) => ({
      invoice_id: i.invoiceId,
      stage: i.stage,
      sent_by: user?.id ?? null,
      to_email: to,
      cc_emails: null,
      amount_due: i.amountDue,
      subject,
    })),
  )
  if (logErr) console.error('[bulk-reminders] sent but not logged:', logErr.message)

  await supabase.from('audit_log').insert(
    withUrls.map((i) => ({
      actor_id: user?.id ?? null,
      actor_role: 'staff',
      action: 'invoice.reminder_sent',
      entity_table: 'invoices',
      entity_id: i.invoiceId,
      before: null,
      after: { stage: i.stage, to, amount_due: i.amountDue, bulk: true, combined_with: withUrls.length > 1 ? withUrls.map((x) => x.invoiceNumber) : null },
    })),
  )

  for (const i of withUrls) revalidatePath(`/portal/invoices/${i.invoiceId}`)
  revalidatePath('/portal/alerts')
  return { ok: true, sent: withUrls.map((i) => i.invoiceNumber) }
}
