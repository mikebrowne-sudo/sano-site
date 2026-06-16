'use server'

// Email a saved CI-based remittance advice to the contractor.
//
// Renders the SAME server PDF used by the Download action (#228) and
// attaches it. Recipient is resolved from the contractors on the
// remittance's snapshotted invoice lines:
//   • single contractor            → that contractor's email
//   • combined, one shared email   → that email (e.g. a household account)
//   • combined, different emails    → blocked, admin must confirm
// On success it stamps sent_at / sent_by. V1 has no resend: an already-
// sent remittance is blocked unless force is passed. Admin-only. Never
// marks sent unless the email actually sends.

import { createClient } from '@/lib/supabase-server'
import { getServiceSupabase } from '@/lib/supabase-service'
import { isAdminUser } from '@/lib/is-admin'
import { renderPdfFromUrl } from '@/lib/pdf/render-pdf'
import { sanitizePdfFilename } from '@/lib/pdf/sanitize-filename'
import { getRemittanceBatchById } from '@/lib/contractor-remittance-data'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface SendRemittanceResult {
  ok?: true
  sentTo?: string
  sentAt?: string
  error?: string
  alreadySentAt?: string
}

export async function sendContractorRemittance(
  id: string,
  opts?: { force?: boolean },
): Promise<SendRemittanceResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const batch = await getRemittanceBatchById(id)
  if (!batch) return { error: 'Remittance not found.' }

  // Duplicate-send protection (V1: no resend unless explicitly forced).
  if (batch.sentAt && !opts?.force) {
    return {
      error: `This remittance was already sent on ${formatDateTime(batch.sentAt)}.`,
      alreadySentAt: batch.sentAt,
    }
  }

  const svc = getServiceSupabase()

  // Distinct contractors on the remittance's invoice lines.
  const { data: itemRows } = await svc
    .from('contractor_remittance_items')
    .select('contractor_id')
    .eq('remittance_id', id)
    .eq('kind', 'invoice')
  const contractorIds = Array.from(
    new Set((itemRows ?? []).map((r) => r.contractor_id as string | null).filter((x): x is string => !!x)),
  )
  if (contractorIds.length === 0) {
    return { error: 'No contractor is linked to this remittance, so there is no recipient email.' }
  }

  const { data: contractorRows } = await svc
    .from('contractors')
    .select('id, email, full_name')
    .in('id', contractorIds)
  const contractors = (contractorRows ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>

  // Resolve a single recipient. Distinct, case-insensitive emails.
  const distinctEmails = Array.from(
    new Set(contractors.map((c) => (c.email ?? '').trim().toLowerCase()).filter(Boolean)),
  )
  if (distinctEmails.length === 0) {
    return { error: 'No recipient email is on file for this contractor. Add an email to the contractor record before sending.' }
  }
  if (distinctEmails.length > 1) {
    return { error: 'This remittance covers contractors with different email addresses. Confirm a single recipient before sending — multiple recipients are not sent automatically.' }
  }
  const recipient = (contractors.find((c) => (c.email ?? '').trim().toLowerCase() === distinctEmails[0])?.email ?? '').trim()

  const combined = batch.contractorNames.length > 1
  const firstName = combined
    ? ''
    : (batch.contractorNames[0] || batch.payeeLabel || 'there').split(/\s+/)[0]

  // Render the server PDF from the public token route (same as #228).
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headers().get('host') ?? 'sano.nz'}`
  let pdf: Buffer
  try {
    pdf = await renderPdfFromUrl(`${origin}/remittance-batch/${batch.token}`)
  } catch {
    return { error: 'PDF generation failed, so the email was not sent. Please try again.' }
  }

  const filename = `${sanitizePdfFilename(`Sano Remittance - ${batch.remittanceNumber}`)}.pdf`
  const paymentDateLabel = formatDate(batch.paymentDate)
  const totalLabel = formatCurrency(batch.total)

  const bodyLines = [
    combined ? 'Hi,' : `Hi ${firstName},`,
    '',
    `Please find attached ${combined ? 'the' : 'your'} remittance advice for the payment made on ${paymentDateLabel}.`,
    '',
    ...(batch.reference ? [`Reference: ${batch.reference}`] : []),
    `Total paid: ${totalLabel}`,
    '',
    'If you have any questions, please contact the Sano team.',
    '',
    'Kind regards,',
    'Sano',
  ]
  const html = bodyLines
    .map((l) => (l === '' ? '' : `<p style="margin:0 0 10px;font-family:Inter,Arial,sans-serif;color:#3f4a3f;line-height:1.6">${escHtml(l)}</p>`))
    .join('')
  const text = bodyLines.join('\n')

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailErr } = await resend.emails.send({
    from: 'Sano <noreply@sano.nz>',
    replyTo: process.env.SANO_NOTIFY_EMAIL?.trim() || 'hello@sano.nz',
    to: recipient,
    subject: `Remittance advice from Sano - ${batch.remittanceNumber}`,
    html,
    text,
    attachments: [{ filename, content: pdf }],
  })
  if (emailErr) {
    return { error: `The email failed to send: ${emailErr.message}` }
  }

  const now = new Date().toISOString()
  await svc.from('contractor_remittances').update({ sent_at: now, sent_by: user.id }).eq('id', id)

  revalidatePath(`/portal/contractor-invoices/remittances/${id}`)
  revalidatePath('/portal/contractor-invoices/remittances')
  return { ok: true, sentTo: recipient, sentAt: now }
}
