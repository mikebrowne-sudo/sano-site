'use server'

// Mileage logbook actions. Distance is the actual driving route home base →
// stops → home base, via Mapbox (geocode each address, then Directions).
// Admin-only writes; the page is readable by finance/accountant users.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { revalidatePath } from 'next/cache'
import { tripAddresses, roundKm, HOME_BASE, type MileageStop } from '@/lib/mileage'

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
  personLabel?: string | null
}): Promise<{ ok?: true; error?: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }
  if (!isAdminUser(user)) return { error: 'Admin only.' }
  if (!input.logDate) return { error: 'Pick a date.' }
  const stops = (input.stops ?? []).filter((s) => s.address?.trim())
  if (stops.length === 0) return { error: 'Add at least one stop.' }
  if (!(input.distanceKm > 0)) return { error: 'Calculate the distance before saving.' }

  const { error } = await supabase.from('mileage_logs').insert({
    log_date: input.logDate,
    person_label: input.personLabel?.trim() || 'Carol',
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
