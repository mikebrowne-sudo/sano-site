// Read helper for the dated mileage rate config (server-side). Maps rows to
// the pure MileageRateConfig shape the resolver in payroll/mileage-rates.ts
// expects. Callers resolve the applicable rate with resolveMileageRate().

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MileageRateConfig, VehicleType, MileageTier } from '@/lib/payroll/mileage-rates'

export async function getMileageRateConfigs(supabase: SupabaseClient): Promise<MileageRateConfig[]> {
  const { data } = await supabase
    .from('mileage_rate_config')
    .select('effective_from, vehicle_type, tier, rate_per_km, source_label')
    .order('effective_from', { ascending: false })

  return (data ?? []).map((r) => ({
    effectiveFrom: r.effective_from as string,
    vehicleType: r.vehicle_type as VehicleType,
    tier: Number(r.tier) as MileageTier,
    ratePerKm: Number(r.rate_per_km),
    sourceLabel: r.source_label as string,
  }))
}
