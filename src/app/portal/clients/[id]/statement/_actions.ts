'use server'

// Send a customer statement: ONE email listing the chosen outstanding invoices,
// each invoice's PDF + the statement PDF attached, one bank reference
// (STM-YYMMNN) for paying them all.
//
// Draft invoices on the statement are sent by it: their dates are stamped on
// first send (same rule as the Send panel), and they flip to 'sent' once the
// email is out. Fail-fast like the Send panel: if any PDF fails to render or
// the email fails, nothing is flipped and the statement record is removed.

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { assertAdminAction } from '@/lib/require-admin'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { getCustomerReplyToEmail } from '@/lib/email-reply-to'
import { stampInvoiceDatesOnFirstSend } from '@/lib/invoice-send-dates'
import { logInvoiceSent } from '@/lib/invoice-send-log'
import { invoiceCcList, parseCcEmails } from '@/lib/invoice-cc'
import { collectInvoiceByAutopay, autopayLinkUrl } from '@/lib/autopay'
import { loadOutstandingStatementLines, loadStatementLines } from '@/lib/statement-data'
import { nextStatementNumber, renderStatementEmailHtml, statementNumberPrefix, statementTotal } from '@/lib/statements'
import { SANO_ACCOUNT_NAME, SANO_ACCOUNT_NUMBER } from '@/lib/sano-bank-details'
import { nzToday } from '@/lib/nz-date'

export interface SendStatementInput {
  clientId: string
  invoiceIds: string[]
  to: string
  /** Typed "Also send to" list (commas etc.). */
  alsoTo: string
  subject: string
  message: string
  includeAutopay: boolean
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

export async function sendStatement(input: SendStatementInput): Promise<{ ok: true; statementNumber: string; to: string; cc: string[] } | { error: string }> {
  await assertAdminAction()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const to = input.to.trim()
  if (!EMAIL.test(to)) return { error: 'Enter a valid email address to send the statement to.' }
  const extra = parseCcEmails(input.alsoTo)
  if (extra.invalid.length > 0) return { error: `Not a valid email address: ${extra.invalid.join(', ')}` }
  const cc = invoiceCcList(to, extra.emails)
  if (input.invoiceIds.length === 0) return { error: 'Tick at least one invoice.' }
  if (!input.subject.trim()) return { error: 'Add a subject.' }

  const { data: client } = await supabase
    .from('clients')
    .select('id, name, autopay_status')
    .eq('id', input.clientId)
    .maybeSingle()
  if (!client) return { error: 'Client not found.' }

  // Only invoices that are still outstanding for THIS client.
  const outstanding = await loadOutstandingStatementLines(supabase, input.clientId)
  const chosen = outstanding.filter((l) => input.invoiceIds.includes(l.invoiceId))
  if (chosen.length !== new Set(input.invoiceIds).size) {
    return { error: 'Some of these invoices are no longer outstanding. Refresh the page and try again.' }
  }

  // Stamp first-send dates on drafts BEFORE the PDFs render (they read the DB).
  const draftIds = chosen.filter((l) => l.status === 'draft').map((l) => l.invoiceId)
  if (draftIds.length > 0) {
    const { data: drafts } = await supabase
      .from('invoices')
      .select('id, client_id, date_issued, payment_type, scheduled_clean_date')
      .in('id', draftIds)
    for (const d of drafts ?? []) {
      const r = await stampInvoiceDatesOnFirstSend(supabase, {
        id: d.id as string,
        client_id: (d.client_id as string | null) ?? null,
        date_issued: (d.date_issued as string | null) ?? null,
        payment_type: (d.payment_type as string | null) ?? null,
        scheduled_clean_date: (d.scheduled_clean_date as string | null) ?? null,
      })
      if (r.error) return { error: `Could not set the dates on a draft invoice, so nothing was sent. ${r.error}` }
    }
  }
  const lines = await loadStatementLines(supabase, chosen.map((l) => l.invoiceId))
  const total = statementTotal(lines)

  // Create the statement record (its page is the statement PDF). Numbers are
  // per month; retry if two sends race for the same one.
  const today = nzToday()
  type StatementRow = { id: string; statement_number: string; share_token: string }
  let created: StatementRow | null = null
  for (let attempt = 0; attempt < 3 && created === null; attempt++) {
    const { data: used } = await supabase
      .from('statements')
      .select('statement_number')
      .like('statement_number', `${statementNumberPrefix(today)}%`)
    const number = nextStatementNumber(today, ((used ?? []) as { statement_number: string }[]).map((r) => r.statement_number))
    const { data, error } = await supabase
      .from('statements')
      .insert({
        statement_number: number,
        client_id: input.clientId,
        invoice_ids: lines.map((l) => l.invoiceId),
        total,
        include_autopay: input.includeAutopay,
        sent_to: to,
        cc_emails: cc,
        subject: input.subject.trim(),
      })
      .select('id, statement_number, share_token')
      .single()
    if (data) created = data as StatementRow
    else if (error && error.code !== '23505') return { error: `Could not create the statement: ${error.message}` }
  }
  if (!created) return { error: 'Could not allocate a statement number. Please try again.' }
  const statement: StatementRow = created

  const discard = async () => { await supabase.from('statements').delete().eq('id', statement.id) }
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
  const statementUrl = `${origin}/share/statement/${statement.share_token}`

  // PDFs one at a time (each render boots its own browser).
  const attachments: { filename: string; content: Buffer }[] = []
  try {
    attachments.push({
      filename: `${sanitizePdfFilename(`Sano Statement - ${statement.statement_number}`)}.pdf`,
      content: await renderPdfFromUrl(`${statementUrl}?pdf=1`, { anchorClosingBlock: true }),
    })
    for (const l of lines) {
      attachments.push({
        filename: `${sanitizePdfFilename(`Sano Tax Invoice - ${l.invoiceNumber}`)}.pdf`,
        content: await renderPdfFromUrl(`${origin}/share/invoice/${l.shareToken}?pdf=1`, { anchorClosingBlock: true }),
      })
    }
  } catch {
    await discard()
    return { error: 'PDF generation failed, so the statement was not sent. Please try again.' }
  }

  const autopayActive = client.autopay_status === 'active'
  const html = renderStatementEmailHtml({
    message: input.message,
    statementNumber: statement.statement_number,
    lines: lines.map((l) => ({ ...l, shareUrl: `${origin}/share/invoice/${l.shareToken}` })),
    total,
    statementUrl,
    bankAccountName: SANO_ACCOUNT_NAME,
    bankAccountNumber: SANO_ACCOUNT_NUMBER,
    autopayUrl: input.includeAutopay ? autopayLinkUrl(origin, input.clientId) : null,
    autopayActive,
  })

  const { data: sent, error: emailErr } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: 'Sano <noreply@sano.nz>',
    replyTo: getCustomerReplyToEmail(),
    to,
    ...(cc.length > 0 ? { cc } : {}),
    subject: input.subject.trim(),
    html,
    attachments,
  })
  if (emailErr) {
    await discard()
    return { error: `Failed to send the statement: ${emailErr.message}` }
  }

  // The email is out. Drafts on it are now sent; a paid one stays paid.
  if (draftIds.length > 0) {
    const { error } = await supabase.from('invoices').update({ status: 'sent' }).in('id', draftIds).eq('status', 'draft')
    if (error) console.error('[statement] sent but drafts not flipped:', error.message)
  }
  await supabase
    .from('statements')
    .update({ sent_at: new Date().toISOString(), sent_by: user?.id ?? null, resend_id: sent?.id ?? null })
    .eq('id', statement.id)
  for (const l of lines) {
    await logInvoiceSent(supabase, {
      invoiceId: l.invoiceId,
      invoiceNumber: l.invoiceNumber,
      to,
      cc,
      subject: input.subject.trim(),
      resendId: sent?.id ?? null,
      source: 'statement',
      actorId: user?.id ?? null,
    })
  }
  await supabase.from('audit_log').insert({
    actor_id: user?.id ?? null, actor_role: 'staff', action: 'client.statement_sent',
    entity_table: 'clients', entity_id: input.clientId, before: null,
    after: { statement_number: statement.statement_number, to, cc, total, invoices: lines.map((l) => l.invoiceNumber), include_autopay: input.includeAutopay },
  })

  // Customer on automatic payments: newly sent drafts are collected, the same
  // as a normal send. No-op for everyone else; never fails the send.
  for (const id of draftIds) {
    try { await collectInvoiceByAutopay(getServiceSupabase(), id) }
    catch (e) { console.error('[statement] direct debit not started', e) }
  }

  revalidatePath(`/portal/clients/${input.clientId}`)
  revalidatePath('/portal/invoices')
  for (const l of lines) revalidatePath(`/portal/invoices/${l.invoiceId}`)
  return { ok: true, statementNumber: statement.statement_number, to, cc }
}
