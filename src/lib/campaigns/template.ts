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
  /** Recipient email — used to detect a generic/shared inbox for the greeting. */
  email?: string | null
}

/** Sender identity shown in the email body + signature. Lets a campaign send as
 *  Carol (or anyone) rather than a hardcoded name. */
export interface TemplateSender {
  /** Full name in the sign-off, e.g. "Carol Browne". */
  name: string
  /** Optional role/line under the name, e.g. omitted when the name stands alone. */
  roleLine?: string | null
  /** Absolute URL to a signature banner image. When set, the HTML email shows
   *  this image as the signature (linked to sano.nz) instead of the text block.
   *  The text/plain part always keeps the readable text signature. */
  bannerUrl?: string | null
}

const DEFAULT_SENDER: TemplateSender = { name: 'Michael Browne' }

export interface RenderedEmail {
  subject: string
  html: string
  text: string
  /** Which template variant was selected — 'named' or 'team' — for audit. */
  variant: 'named' | 'team'
}

function firstName(contactName: string | null): string {
  if (!contactName) return 'there'
  const first = contactName.trim().split(/\s+/)[0]
  return first || 'there'
}

/** A name is only usable for a personal greeting when it's a proper first +
 *  last name — not a bare first name, an inbox word, or junk. First-name-only
 *  ("Paul") reads as mail-merge, so those fall back to the team greeting. */
export function hasUsableFullName(contactName: string | null | undefined): boolean {
  if (!contactName) return false
  const parts = contactName.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return false
  // each part looks like a name (letters, hyphen, apostrophe), not "there"/"info"
  const junk = /^(there|team|info|office|admin|reception|enquiries|sales|accounts|hello|contact|manager|owner)$/i
  return parts.every((p) => /^[A-Za-zĀ-ſ'’.-]{2,}$/.test(p)) && !parts.some((p) => junk.test(p))
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Assemble the final HTML + text from a set of body paragraphs. Shared by the
 *  intro and the follow-up so they look identical. The website link in the
 *  signature is a PLAIN https://sano.nz (NOT tracked/redirected) — a tracked
 *  link adds a redirect domain and makes a personal email read as a campaign. */
function assembleEmail(opts: {
  paragraphs: string[]
  sender: TemplateSender
  token: string
  siteUrl: string
  subject: string
  variant: 'named' | 'team'
}): RenderedEmail {
  const { paragraphs, sender, token, siteUrl, subject, variant } = opts
  const openPixel = `${siteUrl}/api/campaigns/track/open/${token}`

  const signatureText = [
    sender.name,
    ...(sender.roleLine ? [sender.roleLine] : []),
    `Sano | Clean spaces - Healthy living`,
    `sano.nz | 0800 726 686`,
    `Auckland, New Zealand`,
  ]
  const text = [...paragraphs, '', ...signatureText].join('\n\n').replace(/\n\n\n+/g, '\n\n')

  const htmlParas = paragraphs.map((p) => `<p style="margin:0 0 14px 0;">${esc(p)}</p>`).join('\n      ')
  const roleHtml = sender.roleLine ? `<p style="margin:0 0 4px 0;color:#5c6b64;">${esc(sender.roleLine)}</p>\n      ` : ''

  // Signature: banner image when explicitly provided; otherwise Carol's plain
  // text block with an untracked sano.nz link.
  const signatureHtml = sender.bannerUrl
    ? `<a href="https://sano.nz" style="display:block;text-decoration:none;">
        <img src="${esc(sender.bannerUrl)}" alt="${esc(sender.name)} — Sano | sano.nz" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;margin:6px 0 0;" />
      </a>`
    : `<p style="margin:0 0 4px 0;">${esc(sender.name)}</p>
      ${roleHtml}<p style="margin:0 0 4px 0;color:#5c6b64;">Sano | Clean spaces - Healthy living</p>
      <p style="margin:0 0 4px 0;color:#5c6b64;">
        <a href="https://sano.nz" style="color:#076653;">sano.nz</a> | 0800 726 686
      </p>
      <p style="margin:0;color:#5c6b64;">Auckland, New Zealand</p>`

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="max-width:560px;margin:0 auto;padding:24px 20px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#333d38;">
      ${htmlParas}
      ${signatureHtml}
      <img src="${openPixel}" width="1" height="1" alt="" style="display:block;border:0;" />
    </div>
  </body>
</html>`

  return { subject, html, text, variant }
}

export function renderCommercialIntro(opts: {
  lead: TemplateLead
  token: string
  siteUrl: string
  subject?: string
  sender?: TemplateSender
}): RenderedEmail {
  const { lead, token, siteUrl } = opts
  const company = lead.company
  const sender = opts.sender ?? DEFAULT_SENDER
  const senderFirst = sender.name.trim().split(/\s+/)[0] || 'Carol'
  const subject = opts.subject || `Cleaning at ${company}`

  // Two templates, selected on the ONE thing that changes whether the email
  // sounds personal or automated: do we have a reliable full name?
  //   named  → greet by first name, ask if they're the right person
  //   team   → "Hi team", just ask to be pointed to whoever looks after it
  const named = hasUsableFullName(lead.contact_name)
  const greetName = named ? firstName(lead.contact_name) : 'team'

  const intro = `I'm ${senderFirst} and I run Sano. We're an Auckland cleaning company, and I wanted to see whether there might be an opportunity to provide a quote for the cleaning at ${company}, either now or when you next review your cleaning arrangements.`
  const askLine = named
    ? `Would you happen to be the right person to speak with? If not, I'd really appreciate you pointing me in the direction of whoever looks after that side of the business.`
    : `I'd really appreciate it if you could point me in the direction of whoever looks after that side of the business.`

  return assembleEmail({
    paragraphs: [
      `Hi ${greetName},`,
      `I hope you don't mind me reaching out.`,
      intro,
      askLine,
      `If you're already well sorted in this space, feel free to let me know and I won't follow up again.`,
      `Kind regards,`,
    ],
    sender, token, siteUrl, subject, variant: named ? 'named' : 'team',
  })
}

/** One light follow-up to a non-replier, ~5 business days after the intro. Same
 *  named/team split. Subject prefixed "Re:" so it threads as a follow-up. */
export function renderCommercialFollowup(opts: {
  lead: TemplateLead
  token: string
  siteUrl: string
  /** The original subject sent to this lead — the follow-up re-uses it as "Re: ...". */
  originalSubject: string
  sender?: TemplateSender
}): RenderedEmail {
  const { lead, token, siteUrl, originalSubject } = opts
  const company = lead.company
  const sender = opts.sender ?? DEFAULT_SENDER
  const named = hasUsableFullName(lead.contact_name)
  const greetName = named ? firstName(lead.contact_name) : 'team'
  const subject = /^re:/i.test(originalSubject) ? originalSubject : `Re: ${originalSubject}`

  const paragraphs = [
    `Hi ${greetName},`,
    `I just wanted to follow up on my email below in case it was missed.`,
    `I'd appreciate the opportunity to provide a quote for the cleaning at ${company}, either now or when you next review your arrangements.`,
    // Named leads get the "someone else?" line; team inboxes don't.
    ...(named ? [`If there's someone else I'd be better speaking with, I'd really appreciate you pointing me in the right direction.`] : []),
    `Kind regards,`,
  ]

  return assembleEmail({ paragraphs, sender, token, siteUrl, subject, variant: named ? 'named' : 'team' })
}

/** Belt-and-braces unsubscribe header alongside the human reply-to-opt-out. */
export function listUnsubscribeHeader(replyTo: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<mailto:${replyTo}?subject=unsubscribe>`,
  }
}
