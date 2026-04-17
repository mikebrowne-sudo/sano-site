import { Resend } from 'resend'

interface JobDetails {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_estimate: string | null
}

interface ContractorDetails {
  full_name: string
  email: string | null
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Send an assignment notification email to a contractor.
 * Fails silently — logs errors but never throws.
 */
export async function notifyContractorAssigned(
  contractor: ContractorDetails,
  job: JobDetails,
) {
  if (!contractor.email) {
    console.error(`[notify] Contractor "${contractor.full_name}" has no email — skipping notification`)
    return
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const jobUrl = `${siteUrl}/contractor/jobs/${job.id}`
  const firstName = contractor.full_name.split(/\s+/)[0]

  const details: string[] = []
  if (job.address) details.push(`<strong>Address:</strong> ${esc(job.address)}`)
  const date = fmtDate(job.scheduled_date)
  if (date) details.push(`<strong>Date:</strong> ${esc(date)}`)
  if (job.scheduled_time) details.push(`<strong>Time:</strong> ${esc(job.scheduled_time)}`)
  if (job.duration_estimate) details.push(`<strong>Duration:</strong> ${esc(job.duration_estimate)}`)

  const html = `
    <p>Hi ${esc(firstName)},</p>
    <p>You have been assigned a new job: <strong>${esc(job.job_number)}</strong>${job.title ? ` — ${esc(job.title)}` : ''}.</p>
    ${details.length > 0 ? `<p>${details.join('<br>')}</p>` : ''}
    <p><a href="${esc(jobUrl)}" style="display:inline-block;padding:12px 24px;background:#076653;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Job</a></p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      to: contractor.email,
      subject: `New job assigned: ${job.job_number}`,
      html,
    })
    if (error) {
      console.error(`[notify] Failed to send assignment email for ${job.job_number}:`, error.message)
    }
  } catch (err) {
    console.error(`[notify] Email send error for ${job.job_number}:`, err)
  }
}
