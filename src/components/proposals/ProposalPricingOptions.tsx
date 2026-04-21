import type { ProposalPricing, ServiceOption } from '@/lib/proposals/types'
import { ProposalSection } from './ProposalSection'
import { ProposalPriceCard } from './ProposalPriceCard'

type ProposalPricingOptionsProps = {
  pricing: ProposalPricing
  options: ServiceOption[]
}

const TIER_KEYS: Array<'essential' | 'standard' | 'premium'> = [
  'essential',
  'standard',
  'premium',
]

export function ProposalPricingOptions({ pricing, options }: ProposalPricingOptionsProps) {
  const titleFor = (key: string) => {
    const match = options.find(
      (o) => o.title.toLowerCase() === key.toLowerCase()
    )
    return match?.title ?? key
  }

  const descriptionFor = (key: string) => {
    const match = options.find(
      (o) => o.title.toLowerCase() === key.toLowerCase()
    )
    return match?.description
  }

  return (
    <ProposalSection
      eyebrow="Pricing"
      title="Your investment"
      subtitle="All prices are monthly, in NZD, and exclude GST. They cover labour, supervision, and standard commercial consumables."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIER_KEYS.map((key) => (
          <ProposalPriceCard
            key={key}
            title={titleFor(key)}
            price={pricing[key]}
            description={descriptionFor(key)}
            recommended={pricing.recommendedOption === key}
          />
        ))}
      </div>
    </ProposalSection>
  )
}
