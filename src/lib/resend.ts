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
  const { error } = await resend.emails.send({
    from: 'Sano Cleaning <noreply@sano.nz>',
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
  if (error) throw new Error(error.message)
}

export async function sendQuoteNotification(params: QuoteEmailParams) {
  const notifyEmail = process.env.SANO_NOTIFY_EMAIL
  if (!notifyEmail) {
    console.error('SANO_NOTIFY_EMAIL is not set — skipping admin notification')
    return
  }
  const resend = getResendClient()
  const { error } = await resend.emails.send({
    from: 'Sano Website <noreply@sano.nz>',
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
  if (error) throw new Error(error.message)
}

// ── Phase 5.5.1 — Auth transactional emails ──────────────────────
//
// Branded invite + reset password emails. Sent server-side only;
// callers use the orchestration helpers in lib/auth-invites.ts which
// handle Supabase generateLink + email send + error surface.

interface AuthEmailParams {
  to: string
  name: string
  link: string
}

function authEmailFrame(opts: { headline: string; body: string; ctaLabel: string; ctaLink: string; footerNote?: string }): string {
  // Sage palette + simple, mobile-friendly. Inline styles only — most
  // mail clients strip <style> blocks.
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; color: #1f2a25;">
      <div style="background: #3a7a6e; color: #ffffff; padding: 18px 24px; border-radius: 12px 12px 0 0;">
        <strong style="font-size: 16px; letter-spacing: 0.5px;">SANO</strong>
      </div>
      <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #e6efe9; border-top: 0; border-radius: 0 0 12px 12px;">
        <h1 style="margin: 0 0 12px; font-size: 20px; color: #1f2a25;">${escHtml(opts.headline)}</h1>
        <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.55; color: #3a4a44;">${opts.body}</p>
        <p style="margin: 0 0 24px;">
          <a href="${opts.ctaLink}" style="display: inline-block; background: #3a7a6e; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 600; font-size: 14px;">${escHtml(opts.ctaLabel)}</a>
        </p>
        ${opts.footerNote ? `<p style="margin: 0 0 8px; font-size: 12px; color: #6e7d77;">${opts.footerNote}</p>` : ''}
        <p style="margin: 16px 0 0; font-size: 12px; color: #6e7d77;">If the button doesn&apos;t work, paste this link into your browser:<br/><span style="word-break: break-all; color: #3a7a6e;">${opts.ctaLink}</span></p>
      </div>
      <p style="margin: 16px 0 0; font-size: 11px; color: #9aa9a3; text-align: center;">Sano Cleaning · 0800 726 686 · hello@sano.nz</p>
    </div>
  `
}

export async function sendInviteEmail(params: AuthEmailParams) {
  const resend = getResendClient()
  const greeting = params.name ? `Hi ${escHtml(params.name.split(/\s+/)[0])},` : 'Hi,'
  const html = authEmailFrame({
    headline: 'You&apos;re invited to the Sano portal',
    body: `${greeting} you&apos;ve been invited to the Sano team portal. Click the button below to set your password and sign in. The link is valid for 24 hours.`,
    ctaLabel: 'Set your password',
    ctaLink: params.link,
    footerNote: 'If you weren&apos;t expecting this invite, you can safely ignore the email.',
  })
  const text = `${params.name ? `Hi ${params.name.split(/\s+/)[0]}` : 'Hi'},

You've been invited to the Sano team portal. Open this link to set your password and sign in (valid for 24 hours):

${params.link}

If you weren't expecting this, ignore this email.

— The Sano team`

  const { error } = await resend.emails.send({
    from: 'Sano Portal <noreply@sano.nz>',
    to: params.to,
    subject: 'You’re invited to the Sano portal',
    html,
    text,
  })
  if (error) throw new Error(error.message)
}

export async function sendResetEmail(params: AuthEmailParams) {
  const resend = getResendClient()
  const greeting = params.name ? `Hi ${escHtml(params.name.split(/\s+/)[0])},` : 'Hi,'
  const html = authEmailFrame({
    headline: 'Reset your Sano portal password',
    body: `${greeting} we received a request to reset the password on your Sano portal account. Click the button below to choose a new password. The link is valid for 24 hours.`,
    ctaLabel: 'Reset your password',
    ctaLink: params.link,
    footerNote: 'If you didn&apos;t request this, you can safely ignore the email — your existing password stays the same.',
  })
  const text = `${params.name ? `Hi ${params.name.split(/\s+/)[0]}` : 'Hi'},

We received a request to reset the password on your Sano portal account. Open this link to choose a new password (valid for 24 hours):

${params.link}

If you didn't request this, ignore this email — your existing password stays the same.

— The Sano team`

  const { error } = await resend.emails.send({
    from: 'Sano Portal <noreply@sano.nz>',
    to: params.to,
    subject: 'Reset your Sano portal password',
    html,
    text,
  })
  if (error) throw new Error(error.message)
}
