import { Resend } from 'resend'

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
      <p>Hi ${params.name},</p>
      <p>Thanks for getting in touch! We've received your quote request for <strong>${params.service}</strong> and will be in contact within a few hours.</p>
      <p><strong>Your details:</strong><br>
      Service: ${params.service}<br>
      Postcode: ${params.postcode}<br>
      ${params.preferredDate ? `Preferred date: ${params.preferredDate}<br>` : ''}
      ${params.message ? `Message: ${params.message}` : ''}
      </p>
      <p>In the meantime, feel free to reply to this email with any questions.</p>
      <p>The Sano team</p>
    `,
  })
}

export async function sendQuoteNotification(params: QuoteEmailParams) {
  const notifyEmail = process.env.SANO_NOTIFY_EMAIL!
  const resend = getResendClient()
  await resend.emails.send({
    from: 'Sano Website <noreply@sano.co.nz>',
    to: notifyEmail,
    subject: `New quote request: ${params.service} — ${params.name}`,
    html: `
      <h2>New quote request</h2>
      <table>
        <tr><td><strong>Name:</strong></td><td>${params.name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${params.email}</td></tr>
        <tr><td><strong>Phone:</strong></td><td>${params.phone || '—'}</td></tr>
        <tr><td><strong>Service:</strong></td><td>${params.service}</td></tr>
        <tr><td><strong>Postcode:</strong></td><td>${params.postcode}</td></tr>
        <tr><td><strong>Preferred date:</strong></td><td>${params.preferredDate || '—'}</td></tr>
        <tr><td><strong>Message:</strong></td><td>${params.message || '—'}</td></tr>
      </table>
    `,
  })
}
