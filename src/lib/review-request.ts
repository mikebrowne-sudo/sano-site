// Review-request message templates (Google reviews). Shared by the email/SMS
// senders, the reviews tab and the preview page so wording lives in one place.
//
// The editable MESSAGE is kept separate from the review LINK: staff can tweak the
// message text before sending, and each channel adds the link itself (SMS appends
// it; email renders the branded "Leave a Google review" button). This way one
// edited message works for both channels.
//
// Two variants:
//   recent   — same-day / next-morning after a clean that went well.
//   previous — a past client (clean a while ago), gentle re-engagement.

export type ReviewVariant = 'recent' | 'previous'
export const REVIEW_REASK_MONTHS = 12

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function reviewFirstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] || 'there'
}

/** The default, editable message body (no link). Staff may edit before sending. */
export function reviewDefaultMessage(variant: ReviewVariant, name: string | null): string {
  const first = reviewFirstName(name)
  if (variant === 'previous') {
    return `Hi ${first}, it's the Sano team — we cleaned for you a little while back and hope everything's still looking great. If you were happy with how we did, a quick Google review would really help our small local team. Thank you!`
  }
  return `Hi ${first}, thanks for having Sano in today — we hope your place feels great. If you were happy with the clean, a quick Google review would mean a lot to our small local team, and it helps other Aucklanders find us. Thank you!`
}

export function reviewEmailSubject(variant: ReviewVariant): string {
  return variant === 'previous' ? 'A quick favour from the Sano team' : 'Hope your place is looking great'
}

/** Final SMS text = the (edited) message + the review link. */
export function reviewSmsText(message: string, reviewUrl: string): string {
  return `${message.trim()} ${reviewUrl}`.trim()
}

/** Final email HTML = the (edited) message + the branded button + sign-off. */
export function reviewEmailHtml(message: string, reviewUrl: string): string {
  const url = esc(reviewUrl)
  const paras = message
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const button =
    `<p style="margin:24px 0;"><a href="${url}" style="background:#076653;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">Leave a Google review</a></p>`
  return `<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2933;font-size:15px;line-height:1.6;max-width:560px;">${paras}${button}<p>Kind regards,<br>The Sano team</p></div>`
}
