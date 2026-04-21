'use server'

import { createClient } from '@/lib/supabase-server'
import { calculateCommercialPrice, type CommercialInputs, type PricingView } from '@/lib/commercialPricing'

export async function saveCommercialCalculation(
  input: CommercialInputs,
  selected_pricing_view: PricingView,
): Promise<{ id: string } | { error: string }> {
  const supabase = createClient()

  // Re-run the calculation server-side so the stored values are authoritative.
  const result = calculateCommercialPrice(input)

  const { data, error } = await supabase
    .from('commercial_calculations')
    .insert({
      inputs: input,
      pricing_mode: input.pricing_mode,
      selected_pricing_view,
      total_per_clean: result.total_per_clean,
      monthly_value: result.monthly_value,
      extras_total: result.extras_total,
      extras_breakdown: result.extras_breakdown,
      estimated_hours: result.estimated_hours,
      estimated_cost: result.estimated_cost,
      profit: result.profit,
      margin: result.margin,
      effective_hourly_rate: result.effective_hourly_rate,
      below_target_margin: result.below_target_margin,
      suggested_price: result.suggested_price,
      minimum_applied: result.minimum_applied,
      pricing_status: result.pricing_status,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: `Failed to save calculation: ${error?.message ?? 'unknown'}` }
  }
  return { id: data.id }
}
