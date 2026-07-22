'use server'

// Mileage logbook actions. Distance is the actual driving route home base →
// stops → home base, via Mapbox (geocode each address, then Directions).
// Admin-only writes; the page is readable by finance/accountant users.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { tripAddresses, roundKm, HOME_BASE, type MileageStop } from '@/lib/mileage'
import { getMileageRateConfigs } from '@/lib/mileage-rate-data'
import { resolveMileageRate, computeMileageReimbursement, type VehicleType, type MileageTier } from '@/lib/payroll/mileage-rates'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

async function geocode(address: string): Promise<[number, number] | null> {
  if (!MAPBOX_TOKEN) return null
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=nz&limit=1&access_token=${MAPBOX_TOKEN}`
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    const data = await r.json()
    const center = data?.features?.[0]?.center
    return Array.isArray(center) && center.length === 2 ? [center[0], center[1]] : null
  } catch {
    return null
  }
}

export async function computeTripDistanceKm(stops: MileageStop[]): Promise<{ km?: number; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!MAPBOX_TOKEN) return { error: 'Address lookup isn’t configured (no Mapbox token).' }

  const addresses = tripAddresses(stops)
  if (addresses.length < 3) return { error: 'Add at least one stop.' }
  if (addresses.length > 25) return { error: 'Too many stops in one trip (max ~23).' }

  const coords = await Promise.all(addresses.map(geocode))
  const missingAt = coords.findIndex((c) => !c)
  if (missingAt >= 0) {
    const which = missingAt === 0 || missingAt === addresses.length - 1 ? 'home base' : `stop ${missingAt}`
    return { error: `Couldn’t locate the ${which} address — check the spelling.` }
  }

  const coordStr = (coords as [number, number][]).map(([lng, lat]) => `${lng},${lat}`).join(';')
  try {
    const r = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?overview=false&access_token=${MAPBOX_TOKEN}`)
    if (!r.ok) return { error: 'Couldn’t calculate the driving route. Try again.' }
    const data = await r.json()
    const meters = data?.routes?.[0]?.distance
    if (typeof meters !== 'number') return { error: 'No driving route found between those stops.' }
    return { km: roundKm(meters / 1000) }
  } catch {
    return { error: 'Couldn’t reach the routing service. Try again.' }
  }
}

export async function saveMileageLog(input: {
  logDate: string
  stops: MileageStop[]
  distanceKm: number
  notes?: string | null
  contractorId: string
  businessPurpose: string
  vehicleType: VehicleType
  tier: MileageTier
}): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.logDate) return { error: 'Pick a date.' }
  if (!input.contractorId) return { error: 'Choose the employee.' }
  if (!input.businessPurpose?.trim()) return { error: 'Enter the business purpose.' }
  if (input.tier !== 1 && input.tier !== 2) return { error: 'Choose the rate tier.' }
  const stops = (input.stops ?? []).filter((s) => s.address?.trim())
  if (stops.length === 0) return { error: 'Add at least one stop.' }
  if (!(input.distanceKm > 0)) return { error: 'Calculate the distance before saving.' }

  // Resolve the reimbursement rate SERVER-SIDE (authoritative) from the dated
  // config, by vehicle type + the manually-chosen tier, effective on the trip
  // date. The tier is the operator's choice (Tier 1 tracks the vehicle's total
  // annual km incl. private, which we can't know) — never inferred here.
  const configs = await getMileageRateConfigs(supabase)
  const rate = resolveMileageRate(configs, { vehicleType: input.vehicleType, tier: input.tier, onDate: input.logDate })
  if (!rate) return { error: `No ${input.vehicleType} Tier ${input.tier} rate is configured for ${input.logDate}.` }
  const reimbursement = computeMileageReimbursement(input.distanceKm, rate.ratePerKm)

  // Keep person_label in sync for display continuity with legacy rows.
  const { data: emp } = await supabase.from('contractors').select('full_name').eq('id', input.contractorId).maybeSingle()

  const { error } = await supabase.from('mileage_logs').insert({
    log_date: input.logDate,
    contractor_id: input.contractorId,
    person_label: (emp?.full_name as string | null)?.trim() || null,
    business_purpose: input.businessPurpose.trim(),
    vehicle_type: input.vehicleType,
    tier: input.tier,
    rate_per_km: rate.ratePerKm,
    reimbursement_amount: reimbursement,
    status: 'draft',
    home_base: HOME_BASE,
    stops,
    distance_km: input.distanceKm,
    notes: input.notes?.trim() || null,
    created_by: user.id,
  })
  if (error) return { error: `Couldn’t save the log: ${error.message}` }

  revalidatePath('/portal/mileage')
  return { ok: true }
}

// Approve a draft mileage log for reimbursement. Records the approver + time
// (the audit trail). Only approved, unreimbursed logs are pulled into a pay
// run (PR2c). Amount is NOT recomputed here — it's locked at save.
export async function approveMileageLog(id: string): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { error } = await supabase
    .from('mileage_logs')
    .update({ status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'draft') // only a draft can be approved (idempotent-safe)
  if (error) return { error: `Couldn’t approve: ${error.message}` }

  revalidatePath('/portal/mileage')
  return { ok: true }
}

export async function deleteMileageLog(id: string): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }

  const { error } = await supabase.from('mileage_logs').delete().eq('id', id)
  if (error) return { error: `Couldn’t delete: ${error.message}` }
  revalidatePath('/portal/mileage')
  return { ok: true }
}
