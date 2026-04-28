// Tab strip for the Pricing engine settings page (Commercial /
// Residential). Server component — just renders <Link>s.

import Link from 'next/link'
import clsx from 'clsx'

export function PricingEngineTabs({ activeTab }: { activeTab: 'commercial' | 'residential' }) {
  const tabs: { value: 'commercial' | 'residential'; label: string }[] = [
    { value: 'commercial',  label: 'Commercial' },
    { value: 'residential', label: 'Residential' },
  ]
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 bg-sage-50 border border-sage-100 rounded-lg p-0.5">
      {tabs.map((t) => {
        const active = t.value === activeTab
        return (
          <Link
            key={t.value}
            href={`/portal/settings/pricing-engine?tab=${t.value}`}
            role="tab"
            aria-selected={active}
            className={clsx(
              'px-4 py-1.5 rounded text-sm font-medium transition-colors',
              active
                ? 'bg-white text-sage-800 shadow-sm'
                : 'text-sage-600 hover:text-sage-800 hover:bg-white/50',
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
