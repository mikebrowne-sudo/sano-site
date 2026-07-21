// Sends a contractor-statement review reminder and logs it to notification_logs.
// Dedup is the caller's job (by statement_id + reminder_no); this just sends +
// records the outcome. Never changes statement state.

import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public'>

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
function fmtNzDate(iso: string | null): string {
  if (!iso) return 'soon'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Pacific/Auckland' })
}

export interface ReminderArgs {
  statementId: string
  statementNumber: string
  contractorId: string
  contactName: string | null
  email: string | null
  reviewDueAt: string | null
  reminderNo: 1 | 2
}

export async function sendStatementReminder(svc: SB, a: ReminderArgs): Promise<{ ok: boolean; error?: string }> {
  const logBase = {
    type: 'contractor_statement_reminder', channel: 'email', audience: 'contractor',
    recipient_name: a.contactName, recipient_email: a.email, related_contractor_id: a.contractorId,
    payload: { statement_id: a.statementId, statement_number: a.statementNumber, reminder_no: a.reminderNo, review_due_at: a.reviewDueAt },
  }
  const recipient = (a.email ?? '').trim()
  if (!recipient) {
    await svc.from('notification_logs').insert({ ...logBase, status: 'failed', error_message: 'No email on file.' })
    return { ok: false, error: 'No email on file.' }
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sano.nz'
  const link = `${origin}/contractor/statements/${a.statementId}`
  const lines = [
    `Hi ${(a.contactName || 'there').split(/\s+/)[0]},`,
    '',
    `A quick reminder to review your Sano payment statement ${a.statementNumber} by ${fmtNzDate(a.reviewDueAt)}.`,
    '',
    `View your statement: ${link}`,
    '',
    'If everything looks right you can confirm it there. If anything is wrong, please contact the Sano team.',
    '',
    'This is a contractor payment statement, not a tax invoice.',
  ]
  const html = lines.map((l) => (l === '' ? '' : `<p style="margin:0 0 10px;font-family:Inter,Arial,sans-serif;color:#3f4a3f;line-height:1.6">${escHtml(l)}</p>`)).join('')

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      replyTo: process.env.SANO_NOTIFY_EMAIL?.trim() || 'hello@sano.nz',
      to: recipient,
      subject: `Reminder: review your Sano payment statement ${a.statementNumber}`,
      html,
      text: lines.join('\n'),
    })
    if (error) {
      await svc.from('notification_logs').insert({ ...logBase, status: 'failed', error_message: error.message })
      return { ok: false, error: error.message }
    }
    await svc.from('notification_logs').insert({ ...logBase, status: 'sent', sent_at: new Date().toISOString() })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'send failed'
    await svc.from('notification_logs').insert({ ...logBase, status: 'failed', error_message: msg })
    return { ok: false, error: msg }
  }
}
