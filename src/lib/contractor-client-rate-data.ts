// Data access for per-client contractor rates. Thin DB layer over the pure
// resolver in `contractor-client-rate.ts` — all decision logic lives there.

import type { SupabaseClient } from '@supabase/supabase-js'
import { pickClientRate, type ClientRateRecord } from './contractor-client-rate'

/**
 * Run a query, returning null if it throws.
 *
 * Rate lookup is an ENHANCEMENT over the existing profile-rate behaviour: if
 * the client-rate table cannot be read (it has not been migrated yet, or the
 * caller's client is a partial stub), the correct outcome is to fall back to
 * the contractor's profile rate — exactly what happened before this feature —
 * rather than to fail job creation. Assigning a worker must never break because
 * an optional rate refinement was unavailable.
 */
async function safeQuery<T>(run: () => Promise<T[] | null>): Promise<T[] | null> {
  try {
    return await run()
  } catch {
    return null
  }
}

/** Per-contractor rate candidates for one client + service date. */
export interface RateCandidates {
  /** The client rate applicable on the service date, if any. */
  clientRate: number | null
  /** The contractor's profile hourly_rate. */
  contractorRate: number | null
}

/**
 * Load the rate candidates for a set of contractors on one job.
 *
 * Returns a map keyed by contractor id. `clientRate` is null when the job has
 * no client, when no rate is configured, or when none is in force on the
 * service date — callers then fall back to `contractorRate` via
 * `resolveWorkerRate`.
 */
export async function loadRateCandidates(
  supabase: SupabaseClient,
  contractorIds: string[],
  clientId: string | null | undefined,
  serviceDateIso: string,
): Promise<Record<string, RateCandidates>> {
  const ids = Array.from(new Set(contractorIds.filter(Boolean)))
  const map: Record<string, RateCandidates> = {}
  if (ids.length === 0) return map

  const contractors = await safeQuery(async () => {
    const { data } = await supabase.from('contractors').select('id, hourly_rate').in('id', ids)
    return data
  })

  for (const c of contractors ?? []) {
    map[c.id as string] = {
      clientRate: null,
      contractorRate: (c.hourly_rate as number | null) ?? null,
    }
  }
  // Any id with no contractors row still gets an entry, so callers never see
  // `undefined` for a requested contractor.
  for (const id of ids) {
    if (!map[id]) map[id] = { clientRate: null, contractorRate: null }
  }

  if (!clientId) return map

  // Fetch the whole history for these worker+client pairs and resolve the
  // applicable row in JS — the date logic is the pure resolver's job, and the
  // row counts here are tiny (one worker has a handful of rates per client).
  const rates = await safeQuery(async () => {
    const { data } = await supabase
      .from('contractor_client_rates')
      .select('contractor_id, hourly_rate, effective_from, effective_to, status')
      .in('contractor_id', ids)
      .eq('client_id', clientId)
      .eq('status', 'active')
    return data
  })

  const byContractor: Record<string, ClientRateRecord[]> = {}
  for (const r of rates ?? []) {
    const cid = r.contractor_id as string
    ;(byContractor[cid] ??= []).push({
      hourlyRate: r.hourly_rate as number | string | null,
      effectiveFrom: r.effective_from as string,
      effectiveTo: (r.effective_to as string | null) ?? null,
      status: (r.status as string | null) ?? null,
    })
  }

  for (const [cid, history] of Object.entries(byContractor)) {
    if (!map[cid]) map[cid] = { clientRate: null, contractorRate: null }
    map[cid].clientRate = pickClientRate(history, serviceDateIso)
  }

  return map
}

/** Today as yyyy-mm-dd — the service-date fallback when a job has no date. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
