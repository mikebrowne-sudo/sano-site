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
}): RenderedEmail {
  const { lead, token, siteUrl } = opts
  const name = firstName(lead.contact_name)
  const company = lead.company

  const subject = opts.subject || `Quick question about office cleaning at ${company}`

  const trackedSiteLink = `${siteUrl}/api/campaigns/track/click/${token}?to=${encodeURIComponent(
    `${siteUrl}/services/commercial-cleaning`
  )}`
  const openPixel = `${siteUrl}/api/campaigns/track/open/${token}`

  const paragraphs = [
    `Hi ${name},`,
    `I'll keep this short. I run Sano, an Auckland cleaning company, and over the last while we've been taking on more commercial work: offices and professional practices that want the place consistently sharp without having to chase their cleaners.`,
    `If ${company} is happy with its current arrangement, no worries at all. But if the cleaning has become one of those quietly annoying things (details getting missed, different faces every week, standards drifting), I'd genuinely like the chance to quote it. Our teams are background-checked and insured, and we stand behind the work with a satisfaction guarantee.`,
    `A quick walkthrough is usually all it takes: fifteen minutes, and you'll have a clear, practical quote to weigh up whenever the timing suits.`,
    `Two honest notes to finish. If you're not the right person for this, sorry for the interruption, and if you can point me at whoever looks after the office I'd really appreciate it. And if you'd simply rather not hear from me, reply "no thanks" and that's the last email you'll get from us.`,
    `Cheers,`,
  ]

  const signatureText = [
    `Michael Browne`,
    `Sano | Clean spaces - Healthy living`,
    `sano.nz | 0800 726 686`,
    `Auckland, New Zealand`,
  ]

  const text = [
    ...paragraphs,
    '',
    ...signatureText,
    '',
    `More on our commercial cleaning: ${siteUrl}/services/commercial-cleaning`,
  ].join('\n\n').replace(/\n\n\n+/g, '\n\n')

  const htmlParas = paragraphs
    .map((p) => `<p style="margin:0 0 14px 0;">${esc(p)}</p>`)
    .join('\n      ')

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="max-width:560px;margin:0 auto;padding:24px 20px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#333d38;">
      ${htmlParas}
      <p style="margin:0 0 4px 0;">Michael Browne</p>
      <p style="margin:0 0 4px 0;color:#5c6b64;">Sano | Clean spaces - Healthy living</p>
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
