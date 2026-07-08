// Server-only Google Search Console (Search Analytics) access for the portal.
//
// Reuses the GA4 service-account key (GA4_SA_KEY_BASE64) for auth — the same
// service account just needs to be added as a user on the Search Console
// property, and the Search Console API enabled in the Cloud project. Plus:
//   GSC_SITE_URL — the property, e.g. 'sc-domain:sano.nz' (domain property)
//                  or 'https://sano.nz/' (URL-prefix property).
//
// Node-only (imports google-auth-library); never bundled to the client. Callers
// should cache (the page wraps this in unstable_cache, 1-hour revalidate).

import { JWT } from 'google-auth-library'

export interface GscQueryRow {
  query: string
  clicks: number
  impressions: number
  ctr: number // 0..1
  position: number
}

export interface GscStats {
  totalClicks: number
  totalImpressions: number
  avgCtr: number // 0..1
  avgPosition: number
  topQueries: GscQueryRow[]
  startDate: string
  endDate: string
}

export function isGscConfigured(): boolean {
  return !!(process.env.GA4_SA_KEY_BASE64 && process.env.GSC_SITE_URL)
}

interface ApiRow { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }
interface ApiResp { rows?: ApiRow[] }

// GSC data lags ~2–3 days; use a 28-day window ending 3 days ago.
function dateRange(): { startDate: string; endDate: string } {
  const d = new Date()
  d.setDate(d.getDate() - 3)
  const endDate = d.toISOString().slice(0, 10)
  d.setDate(d.getDate() - 27)
  const startDate = d.toISOString().slice(0, 10)
  return { startDate, endDate }
}

async function runQuery(token: string, site: string, body: Record<string, unknown>): Promise<ApiResp> {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300)
    throw new Error(`Search Console API ${res.status}: ${detail}`)
  }
  return res.json() as Promise<ApiResp>
}

export async function getGscStats(): Promise<GscStats> {
  const json = JSON.parse(Buffer.from(process.env.GA4_SA_KEY_BASE64 as string, 'base64').toString('utf8'))
  const auth = new JWT({
    email: json.client_email,
    key: json.private_key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const { token } = await auth.getAccessToken()
  if (!token) throw new Error('Could not obtain a Search Console access token.')

  const site = process.env.GSC_SITE_URL as string
  const { startDate, endDate } = dateRange()

  const [totals, queries] = await Promise.all([
    runQuery(token, site, { startDate, endDate }),
    runQuery(token, site, { startDate, endDate, dimensions: ['query'], rowLimit: 10 }),
  ])

  const t = totals.rows?.[0] ?? {}
  const topQueries: GscQueryRow[] = (queries.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? '(unknown)',
    clicks: Math.round(r.clicks ?? 0),
    impressions: Math.round(r.impressions ?? 0),
    ctr: r.ctr ?? 0,
    position: Number((r.position ?? 0).toFixed(1)),
  }))

  return {
    totalClicks: Math.round(t.clicks ?? 0),
    totalImpressions: Math.round(t.impressions ?? 0),
    avgCtr: t.ctr ?? 0,
    avgPosition: Number((t.position ?? 0).toFixed(1)),
    topQueries,
    startDate,
    endDate,
  }
}
