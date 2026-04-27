import { createClient } from '@/lib/supabase-server'
import { NewQuoteForm } from './_components/NewQuoteForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { CommercialCalculationRow } from '@/lib/commercialPricingMapping'
import { loadPricingSettings } from '@/lib/pricingSettings'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: { calc_id?: string }
}) {
  const supabase = createClient()

  // Parallel reads: client list + Phase 3A pricing settings. Settings
  // never throw (loader falls back to in-code constants on any error).
  const [clientsRes, pricingSettings] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, company_name, email, phone, service_address, billing_address, billing_same_as_service, payment_type, payment_terms, accounts_email')
      .eq('is_archived', false)
      .order('name'),
    loadPricingSettings(supabase),
  ])
  const clients = clientsRes.data

  let calc: CommercialCalculationRow | null = null
  if (searchParams?.calc_id) {
    const { data, error } = await supabase
      .from('commercial_calculations')
      .select('id, inputs, total_per_clean, monthly_value, extras_breakdown, selected_pricing_view, pricing_mode, estimated_hours')
      .eq('id', searchParams.calc_id)
      .maybeSingle()
    if (error) {
      console.warn('[new quote] failed to load commercial calc', error)
    } else if (data) {
      calc = data as unknown as CommercialCalculationRow
    }
  }

  return (
    <div>
      <Link
        href="/portal/quotes"
        className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 transition-colors mb-4"
      >
        <ArrowLeft size={14} />
        Back to quotes
      </Link>

      <h1 className="text-2xl font-bold text-sage-800 mb-8">New Quote</h1>

      <NewQuoteForm clients={clients ?? []} calc={calc} pricingSettings={pricingSettings} />
    </div>
  )
}
