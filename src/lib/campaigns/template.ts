/**
 * Sales-campaign email templates.
 *
 * Deliverability rules baked in:
 * - Plain, personal-looking HTML (system fonts, no images except the 1px
 *   open-tracking pixel, no heavy styling) + a full text/plain part.
 * - One tracked link only (sano.nz via the click redirect).
 * - Human opt-out ("reply no thanks") — this is a functional unsubscribe
 *   facility under the NZ Unsolicited Electronic Messages Act 2007, and a
 *   List-Unsubscribe header is added as belt-and-braces.
 * - Accurate sender identity in the signature (UEMA requirement).
 *
 * Copy rules: NZ English, no em dashes, no "premium"/"eco-friendly"/
 * "industry-leading", no pricing, no invented claims. The vetting/insurance
 * and satisfaction-guarantee claims are Mike-verified (2026-07-04).
 */

export interface TemplateLead {
  company: string
  contact_name: string | null
}

/** Sender identity shown in the email body + signature. Lets a campaign send as
 *  Carol (or anyone) rather than a hardcoded name. */
export interface TemplateSender {
  /** Full name in the sign-off, e.g. "Carol Browne". */
  name: string
  /** Optional role/line under the name, e.g. omitted when the name stands alone. */
  roleLine?: string | null
}

const DEFAULT_SENDER: TemplateSender = { name: 'Michael Browne' }

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

function firstName(contactName: string | null): string {
  if (!contactName) return 'there'
  const first = contactName.trim().split(/\s+/)[0]
  return first || 'there'
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderCommercialIntro(opts: {
  lead: TemplateLead
  /** Recipient tracking token (sales_campaign_recipients.token). */
  token: string
  /** Absolute site origin, e.g. https://sano.nz */
  siteUrl: string
  /** Subject override from the campaign row. */
  subject?: string
  /** Who the email is from — drives the sign-off. Defaults to Michael Browne. */
  sender?: TemplateSender
}): RenderedEmail {
  const { lead, token, siteUrl } = opts
  const name = firstName(lead.contact_name)
  const company = lead.company
  const sender = opts.sender ?? DEFAULT_SENDER
  const senderFirst = sender.name.trim().split(/\s+/)[0] || 'Carol'

  const subject = opts.subject || `Cleaning at ${company}`

  const trackedSiteLink = `${siteUrl}/api/campaigns/track/click/${token}?to=${encodeURIComponent(
    `${siteUrl}/services/commercial-cleaning`
  )}`
  const openPixel = `${siteUrl}/api/campaigns/track/open/${token}`

  // Carol-voiced cold intro. Reads as a genuine one-to-one email; opt-out is the
  // "let me know and I won't follow up" line, backed by the List-Unsubscribe
  // header + a reply-to that reaches the sender. NZ English, no pricing, no
  // forbidden phrases.
  const paragraphs = [
    `Hi ${name},`,
    `I hope you don't mind me reaching out.`,
    `I'm ${senderFirst} and I run Sano. We're an Auckland cleaning company, and I wanted to see whether there might be an opportunity to provide a quote for the cleaning at ${company}, either now or when you next review your cleaning arrangements.`,
    `Would you happen to be the right person to speak with? If not, I'd really appreciate you pointing me in the direction of whoever looks after that side of the business.`,
    `If you're already well sorted in this space, feel free to let me know and I won't follow up again.`,
    `Kind regards,`,
  ]

  const signatureText = [
    sender.name,
    ...(sender.roleLine ? [sender.roleLine] : []),
    `Sano | Clean spaces - Healthy living`,
    `sano.nz | 0800 726 686`,
    `Auckland, New Zealand`,
  ]

  const text = [
    ...paragraphs,
    '',
    ...signatureText,
  ].join('\n\n').replace(/\n\n\n+/g, '\n\n')

  const htmlParas = paragraphs
    .map((p) => `<p style="margin:0 0 14px 0;">${esc(p)}</p>`)
    .join('\n      ')

  const roleHtml = sender.roleLine ? `<p style="margin:0 0 4px 0;color:#5c6b64;">${esc(sender.roleLine)}</p>\n      ` : ''

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="max-width:560px;margin:0 auto;padding:24px 20px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#333d38;">
      ${htmlParas}
      <p style="margin:0 0 4px 0;">${esc(sender.name)}</p>
      ${roleHtml}<p style="margin:0 0 4px 0;color:#5c6b64;">Sano | Clean spaces - Healthy living</p>
      <p style="margin:0 0 4px 0;color:#5c6b64;">
        <a href="${trackedSiteLink}" style="color:#076653;">sano.nz</a> | 0800 726 686
      </p>
      <p style="margin:0;color:#5c6b64;">Auckland, New Zealand</p>
      <img src="${openPixel}" width="1" height="1" alt="" style="display:block;border:0;" />
    </div>
  </body>
</html>`

  return { subject, html, text }
}

/** Belt-and-braces unsubscribe header alongside the human reply-to-opt-out. */
export function listUnsubscribeHeader(replyTo: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<mailto:${replyTo}?subject=unsubscribe>`,
  }
}
