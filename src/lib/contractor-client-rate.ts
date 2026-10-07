// Per-client contractor pay-rate resolution — pure + testable.
//
// Extends the snapshot rule in `contractor-rate-snapshot.ts` with a middle tier:
// a rate agreed for a worker at a specific CLIENT. Resolution order, highest
// priority first:
//
//   1. an existing positive job_workers.pay_rate snapshot  → always preserved
//   2. the client rate in force on the job's service date  → 'client'
//   3. the contractor's profile hourly_rate                → 'contractor'
//   4. nothing usable                                      → null / 'none'
//
// Rule 1 is why a rate change never silently repays an already-assigned job:
// historical pay must stay stable. A deliberate change to an existing snapshot
// goes through the audited setJobWorkerPayRate action, never through here.
//
// Rule 3 is a deliberate FALL BACK rather than a block. Blocking job creation
// when no client rate exists would stop every one-off residential job — most of
// the book. The rate source is surfaced in the UI instead, so an unconfigured
// rate is visible rather than silent.
//
// DATE BASIS: the job's scheduled_date (the day the work happens), not the day
// the row is created. A rate effective from a future date does not apply to an
// earlier job, and a closed rate does not apply after its effective_to.

import { toPositiveRate } from './contractor-rate-snapshot'

export type RateSource = 'existing' | 'client' | 'contractor' | 'none'

/** A per-client rate row as stored in `contractor_client_rates`. */
export interface ClientRateRecord {
  hourlyRate: number | string | null | undefined
  /** ISO date (yyyy-mm-dd) the rate takes effect. */
  effectiveFrom: string
  /** ISO date the rate stops applying (inclusive), or null for open-ended. */
  effectiveTo?: string | null
  status?: string | null
}

export interface ResolvedRate {
  rate: number | null
  source: RateSource
}

/**
 * Pick the client rate applicable on `serviceDateIso` from a worker's rate
 * history. Returns null when none applies.
 *
 * Boundaries are INCLUSIVE at both ends: a job exactly on `effectiveFrom` uses
 * the new rate, and a job exactly on `effectiveTo` still uses the closing one.
 * Where rows overlap (which the partial unique index prevents for current rows,
 * but history can still contain), the latest `effectiveFrom` wins.
 */
export function pickClientRate(
  rates: ReadonlyArray<ClientRateRecord>,
  serviceDateIso: string,
): number | null {
  if (!serviceDateIso) return null

  let best: { rate: number; from: string } | null = null

  for (const r of rates) {
    if (r.status === 'superseded') continue
    const rate = toPositiveRate(r.hourlyRate)
    if (rate == null) continue
    if (!r.effectiveFrom) continue
    if (serviceDateIso < r.effectiveFrom) continue
    if (r.effectiveTo && serviceDateIso > r.effectiveTo) continue
    if (best == null || r.effectiveFrom > best.from) {
      best = { rate, from: r.effectiveFrom }
    }
  }

  return best?.rate ?? null
}

/**
 * Resolve the pay_rate to store on a job_workers row, and say where it came
 * from so the UI can label it.
 *
 * @param existingPayRate the row's current pay_rate (if any) — always wins
 * @param clientRate      the client rate applicable on the service date
 * @param contractorRate  the contractor's profile hourly_rate
 */
export function resolveWorkerRate(
  existingPayRate: number | string | null | undefined,
  clientRate: number | string | null | undefined,
  contractorRate: number | string | null | undefined,
): ResolvedRate {
  const existing = toPositiveRate(existingPayRate)
  if (existing != null) return { rate: existing, source: 'existing' }

  const client = toPositiveRate(clientRate)
  if (client != null) return { rate: client, source: 'client' }

  const contractor = toPositiveRate(contractorRate)
  if (contractor != null) return { rate: contractor, source: 'contractor' }

  return { rate: null, source: 'none' }
}

/** Human label for a resolved rate's source, for the job UI. */
export function rateSourceLabel(source: RateSource, clientName?: string | null): string {
  switch (source) {
    case 'client':
      return clientName ? `${clientName} rate` : 'client rate'
    case 'contractor':
      return 'profile default'
    case 'existing':
      return 'set on this job'
    default:
      return 'no rate set'
  }
}
