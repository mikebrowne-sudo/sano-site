import { Resend } from 'resend'

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

export interface QuoteEmailParams {
  name: string
  email: string
  phone: string
  service: string
  postcode: string
  preferredDate: string
  message: string
}

export async function sendQuoteConfirmation(params: QuoteEmailParams) {
  const resend = getResendClient()
  await resend.emails.send({
    from: 'Sano Cleaning <noreply@sano.co.nz>',
    to: params.email,
    subject: 'We received your quote request — Sano Cleaning',
    html: `
      <p>Hi ${escHtml(params.name)},</p>
      <p>Thanks for getting in touch! We've received your quote request for <strong>${escHtml(params.service)}</strong> and will be in contact within a few hours.</p>
      <p><strong>Your details:</strong><br>
      Service: ${escHtml(params.service)}<br>
      Postcode: ${escHtml(params.postcode)}<br>
      ${params.preferredDate ? `Preferred date: ${escHtml(params.preferredDate)}<br>` : ''}
      ${params.message ? `Message: ${escHtml(params.message)}` : ''}
      </p>
      <p>In the meantime, feel free to reply to this email with any questions.</p>
      <p>The Sano team</p>
    `,
  })
}

export async function sendQuoteNotification(params: QuoteEmailParams) {
  const notifyEmail = process.env.SANO_NOTIFY_EMAIL
  if (!notifyEmail) {
    console.error('SANO_NOTIFY_EMAIL is not set — skipping admin notification')
    return
  }
  const resend = getResendClient()
  await resend.emails.send({
    from: 'Sano Website <noreply@sano.co.nz>',
    to: notifyEmail,
    subject: `New quote request: ${params.service} — ${params.name}`,
    html: `
      <h2>New quote request</h2>
      <table>
        <tr><td><strong>Name:</strong></td><td>${escHtml(params.name)}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${escHtml(params.email)}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${params.phone ? escHtml(params.phone) : '—'}</td></tr>
        <tr><td><strong>Service:</strong></td><td>${escHtml(params.service)}</td></tr>
        <tr><td><strong>Postcode:</strong></td><td>${escHtml(params.postcode)}</td></tr>
        <tr><td><strong>Preferred date:</strong></td><td>${params.preferredDate ? escHtml(params.preferredDate) : '—'}</td></tr>
        <tr><td><strong>Message:</strong></td><td>${params.message ? escHtml(params.message) : '—'}</td></tr>
      </table>
    `,
  })
}
