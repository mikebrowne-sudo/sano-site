import { Resend } from 'resend'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export async function sendJobReminder(contractor: { full_name: string; email: string }, job: { id: string; job_number: string; title: string | null; address: string | null; scheduled_date: string | null; scheduled_time: string | null }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const firstName = contractor.full_name.split(/\s+/)[0]
  const jobUrl = `${siteUrl}/contractor/jobs/${job.id}`

  const details: string[] = []
  if (job.address) details.push(`<strong>Address:</strong> ${esc(job.address)}`)
  const date = fmtDate(job.scheduled_date)
  if (date) details.push(`<strong>Date:</strong> ${esc(date)}`)
  if (job.scheduled_time) details.push(`<strong>Time:</strong> ${esc(job.scheduled_time)}`)

  const html = `
    <p>Hi ${esc(firstName)},</p>
    <p>Reminder: you have an upcoming job <strong>${esc(job.job_number)}</strong>${job.title ? ` — ${esc(job.title)}` : ''}.</p>
    ${details.length > 0 ? `<p>${details.join('<br>')}</p>` : ''}
    <p><a href="${esc(jobUrl)}" style="display:inline-block;padding:12px 24px;background:#076653;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Job</a></p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      to: contractor.email,
      subject: `Job reminder: ${job.job_number} — ${fmtDate(job.scheduled_date)}`,
      html,
    })
    if (error) {
      console.error(`[reminder] Job email failed for ${job.job_number}:`, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error(`[reminder] Job email error:`, err)
    return false
  }
}

export async function sendTrainingReminder(contractor: { full_name: string; email: string }, item: { title: string; due_date: string | null }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const firstName = contractor.full_name.split(/\s+/)[0]

  const html = `
    <p>Hi ${esc(firstName)},</p>
    <p>You have an overdue training item: <strong>${esc(item.title)}</strong>${item.due_date ? ` (due ${esc(fmtDate(item.due_date))})` : ''}.</p>
    <p>Please complete it as soon as possible.</p>
    <p><a href="${esc(siteUrl)}/contractor/training" style="display:inline-block;padding:12px 24px;background:#076653;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">View Training</a></p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Sano Property Services Limited</p>
  `

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'Sano <noreply@sano.nz>',
      to: contractor.email,
      subject: `Training reminder: ${item.title}`,
      html,
    })
    if (error) {
      console.error(`[reminder] Training email failed:`, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error(`[reminder] Training email error:`, err)
    return false
  }
}
