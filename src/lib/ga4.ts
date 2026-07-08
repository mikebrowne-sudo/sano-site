// Server-only Google Analytics 4 Data API access for the in-portal dashboard.
//
// Reads two SERVER-ONLY env vars (never NEXT_PUBLIC_, so credentials are never
// shipped to the browser):
//   GA4_PROPERTY_ID   — the numeric GA4 property id (e.g. 123456789)
//   GA4_SA_KEY_BASE64 — the service-account JSON key, base64-encoded
//
// The whole JSON is base64-encoded so the private key's newlines survive the
// trip through an env var intact.
//
// Transport: gRPC (the default — pure-JS @grpc/grpc-js, fine on serverless).
// We deliberately do NOT use the REST `fallback` transport: with fallback,
// google-gax converts the response to proto3 JSON and throws
// "toProto3JSON: don't know how to convert value 8" on newer enum values the
// bundled descriptors don't know (value 8 = MetricType.TYPE_STANDARD, which
// the API returns in metric headers). gRPC passes those through untouched.
//
// This module imports a Node-only client, so it can never be bundled into a
// client component. Callers should additionally cache the result (the page
// wraps getGa4Stats in unstable_cache with a 1-hour revalidate).

import { BetaAnalyticsDataClient } from '@google-analytics/data'

export interface NameValue {
  label: string
  value: number
}
export interface TrendPoint {
  date: string // ISO yyyy-mm-dd
  value: number
}

export interface Ga4Stats {
  visitorsToday: number
  visitors7d: number
  visitors30d: number
  topSources: NameValue[]
  topLandingPages: NameValue[]
  topSuburbPages: NameValue[]
  deviceSplit: NameValue[]
  newVsReturning: NameValue[]
  topLocations: NameValue[]
  leads: number
  phoneClicks: number
  emailClicks: number
  trend30d: TrendPoint[]
}

export function isGa4Configured(): boolean {
  return !!(process.env.GA4_PROPERTY_ID && process.env.GA4_SA_KEY_BASE64)
}

function makeClient(): BetaAnalyticsDataClient {
  const json = JSON.parse(Buffer.from(process.env.GA4_SA_KEY_BASE64 as string, 'base64').toString('utf8'))
  return new BetaAnalyticsDataClient({
    credentials: { client_email: json.client_email, private_key: json.private_key },
    // gRPC transport (default). Do NOT set fallback: true — see file header.
  })
}

export async function getGa4Stats(): Promise<Ga4Stats> {
  const property = `properties/${process.env.GA4_PROPERTY_ID}`
  const client = makeClient()

  const usersSince = async (startDate: string): Promise<number> => {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    })
    return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0)
  }

  const topBy = async (dimension: string, beginsWith?: string): Promise<NameValue[]> => {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: dimension }],
      metrics: [{ name: 'sessions' }],
      ...(beginsWith
        ? { dimensionFilter: { filter: { fieldName: dimension, stringFilter: { matchType: 'BEGINS_WITH' as const, value: beginsWith } } } }
        : {}),
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    })
    return (res.rows ?? []).map((r) => ({
      label: r.dimensionValues?.[0]?.value || '(not set)',
      value: Number(r.metricValues?.[0]?.value ?? 0),
    }))
  }

  const eventCounts = async (): Promise<Map<string, number>> => {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
    })
    const map = new Map<string, number>()
    for (const r of res.rows ?? []) {
      map.set(r.dimensionValues?.[0]?.value ?? '', Number(r.metricValues?.[0]?.value ?? 0))
    }
    return map
  }

  const trend = async (): Promise<TrendPoint[]> => {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    })
    return (res.rows ?? []).map((r) => {
      const d = r.dimensionValues?.[0]?.value ?? '' // yyyymmdd
      return {
        date: d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d,
        value: Number(r.metricValues?.[0]?.value ?? 0),
      }
    })
  }

  const [
    visitorsToday, visitors7d, visitors30d,
    topSources, topLandingPages, topSuburbPages,
    deviceSplit, newVsReturning, topLocations,
    events, trend30d,
  ] = await Promise.all([
    usersSince('today'),
    usersSince('7daysAgo'),
    usersSince('30daysAgo'),
    topBy('sessionSourceMedium'),
    topBy('landingPage'),
    topBy('landingPage', '/service-area/'),
    topBy('deviceCategory'),
    topBy('newVsReturning'),
    topBy('city'),
    eventCounts(),
    trend(),
  ])

  return {
    visitorsToday,
    visitors7d,
    visitors30d,
    topSources,
    topLandingPages,
    topSuburbPages,
    deviceSplit,
    newVsReturning,
    topLocations,
    leads: events.get('generate_lead') ?? 0,
    phoneClicks: events.get('phone_click') ?? 0,
    emailClicks: events.get('email_click') ?? 0,
    trend30d,
  }
}
