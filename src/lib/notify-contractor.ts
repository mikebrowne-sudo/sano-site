// Phase D.1 — contractor assignment notification.
//
// Thin wrapper around Resend + the template in
// contractor-email-template.ts. Fails silently: logs errors but
// never throws so a send failure doesn't break the assignment
// transaction in the calling server action.
//
// Extended in Phase D.1 to accept allowed_hours, access_instructions,
// notes, and scope_summary so the email carries everything the
// contractor needs on site.

import { Resend } from 'resend'
import { buildContractorAssignmentEmail } from './contractor-email-template'

interface JobDetails {
  id: string
  job_number: string
  title: string | null
  address: string | null
  scheduled_date: string | null
  scheduled_time: string | null
  duration_estimate: string | null
  /** Phase D.1 — optional extras. Older callers that don't pass
   *  these still get a valid (shorter) email. */
  allowed_hours?: number | null
  access_instructions?: string | null
  notes?: string | null
  scope_summary?: string | null
}

interface ContractorDetails {
  full_name: string
  email: string | null
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

  const { subject, html } = buildContractorAssignmentEmail({
    contractorName: contractor.full_name,
    jobNumber: job.job_number,
    jobTitle: job.title,
    address: job.address,
    scheduledDate: job.scheduled_date,
    scheduledTime: job.scheduled_time,
    durationEstimate: job.duration_estimate,
    allowedHours: job.allowed_hours ?? null,
    accessInstructions: job.access_instructions ?? null,
    notes: job.notes ?? null,
    scopeSummary: job.scope_summary ?? null,
    jobUrl,
  })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      to: contractor.email,
      subject,
      html,
    })
    if (error) {
      console.error(`[notify] Failed to send assignment email for ${job.job_number}:`, error.message)
    }
  } catch (err) {
    console.error(`[notify] Email send error for ${job.job_number}:`, err)
  }
}
