// Weekly payroll auto-draft — Netlify Scheduled Function.
//
// Weekly wrapper around /api/cron/weekly-payroll. The route handler does all
// the work (auth, draft creation, notify); this file only gives Netlify a cron
// entry and co-locates the schedule (also mirrored in netlify.toml).
//
// Schedule: 0 21 * * 0 = Sunday 21:00 UTC = Monday ~09:00 NZ. Drafts the week
// that just ended so Mike can review it Monday morning. Draft only — never
// approves or pays.

export default async () => {
  const baseUrl = process.env.URL ?? process.env.DEPLOY_URL
  const secret = process.env.CRON_SECRET

  if (!baseUrl) {
    return new Response(
      JSON.stringify({ error: 'URL / DEPLOY_URL not set' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
  if (!secret) {
    return new Response(
      JSON.stringify({ error: 'CRON_SECRET not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const res = await fetch(`${baseUrl}/api/cron/weekly-payroll`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
  })
  const body = await res.text()
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  schedule: '0 21 * * 0',
}
