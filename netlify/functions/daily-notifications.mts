// Phase H.4 — Netlify Scheduled Function.
//
// Daily wrapper around /api/cron/daily-notifications. The route
// handler does all the work; this file only exists so Netlify has
// a cron entry to invoke and so the schedule is co-located with
// the deployment (also configured in netlify.toml).
//
// Schedule: 0 21 UTC daily = 09:00 NZST (winter) / 10:00 NZDT (summer).

export default async () => {
  const baseUrl = process.env.URL ?? process.env.DEPLOY_URL
  const secret  = process.env.CRON_SECRET

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

  const res = await fetch(`${baseUrl}/api/cron/daily-notifications`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${secret}`,
      'Content-Type':   'application/json',
    },
  })
  const body = await res.text()
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  schedule: '0 21 * * *',
}
