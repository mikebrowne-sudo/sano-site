// Phase D.1 — contractor assignment email template.
//
// Pure function: takes the input object and returns { subject, html }.
// No Resend calls, no env reads — the sender lives in
// notify-contractor.ts. Keeping the template in its own file means
// the Phase D.2 admin settings page can swap the body text in one
// edit without touching the send logic.
//
// The markup is intentionally plain HTML with inline styles so it
// renders reliably across mail clients (Gmail, Outlook, Apple Mail).
// No external CSS, no images, no custom fonts.

export interface ContractorEmailInput {
  contractorName: string
  jobNumber: string
  jobTitle: string | null
  address: string | null
  scheduledDate: string | null
  scheduledTime: string | null
  durationEstimate: string | null
  allowedHours: number | null
  accessInstructions: string | null
  notes: string | null
  scopeSummary: string | null
  jobUrl: string
}

export interface ContractorEmailOutput {
  subject: string
  html: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtHours(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null
  return `${n} hr${n === 1 ? '' : 's'}`
}

/**
 * Build the contractor assignment email. Returns the subject and
 * the HTML body. Does not send.
 */
export function buildContractorAssignmentEmail(input: ContractorEmailInput): ContractorEmailOutput {
  const firstName = input.contractorName.split(/\s+/)[0] || 'there'
  const titleSuffix = input.jobTitle ? ` — ${esc(input.jobTitle)}` : ''

  // "Details" row — each non-empty field renders as a line in the
  // details block. Skipping empty fields keeps the email tidy for
  // jobs that only have partial info.
  const details: string[] = []
  if (input.address) details.push(`<strong>Address:</strong> ${esc(input.address)}`)
  const date = fmtDate(input.scheduledDate)
  if (date) details.push(`<strong>Date:</strong> ${esc(date)}`)
  if (input.scheduledTime) details.push(`<strong>Time:</strong> ${esc(input.scheduledTime)}`)
  const hours = fmtHours(input.allowedHours)
  if (hours) details.push(`<strong>Allowed hours:</strong> ${esc(hours)}`)
  if (input.durationEstimate) details.push(`<strong>Duration estimate:</strong> ${esc(input.durationEstimate)}`)

  // Extra sections appear only when populated.
  const scopeBlock = input.scopeSummary?.trim()
    ? `<p style="margin:16px 0 4px;"><strong>Scope</strong></p><p style="margin:0 0 12px;white-space:pre-wrap;color:#374151;">${esc(input.scopeSummary.trim())}</p>`
    : ''
  const accessBlock = input.accessInstructions?.trim()
    ? `<p style="margin:16px 0 4px;"><strong>Access instructions</strong></p><p style="margin:0 0 12px;white-space:pre-wrap;color:#374151;">${esc(input.accessInstructions.trim())}</p>`
    : ''
  const notesBlock = input.notes?.trim()
    ? `<p style="margin:16px 0 4px;"><strong>Notes</strong></p><p style="margin:0 0 12px;white-space:pre-wrap;color:#374151;">${esc(input.notes.trim())}</p>`
    : ''

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#1F2937; line-height:1.55; max-width:560px;">
      <p>Hi ${esc(firstName)},</p>
      <p>You have been assigned a new job: <strong>${esc(input.jobNumber)}</strong>${titleSuffix}.</p>
      ${details.length > 0 ? `<p style="margin:0 0 12px;">${details.join('<br>')}</p>` : ''}
      ${scopeBlock}
      ${accessBlock}
      ${notesBlock}
      <p style="margin-top:20px;">
        <a href="${esc(input.jobUrl)}"
           style="display:inline-block;padding:12px 24px;background:#076653;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          View Job
        </a>
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
    </div>
  `

  return {
    subject: `New job assigned: ${input.jobNumber}`,
    html,
  }
}
