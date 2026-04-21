import type { ProposalMeta, ProposalPricing } from '@/lib/proposals/types'
import {
  formatNzd,
  formatProposalDate,
  formatServiceLevelLabel,
} from '@/lib/proposals/format'
import { ProposalSection } from './ProposalSection'

type ProposalAgreementSummaryProps = {
  proposalMeta: ProposalMeta
  pricing: ProposalPricing
}

type Row = {
  label: string
  value: string
}

export function ProposalAgreementSummary({
  proposalMeta,
  pricing,
}: ProposalAgreementSummaryProps) {
  const rows: Row[] = [
    {
      label: 'Service start date',
      value: formatProposalDate(proposalMeta.startDate),
    },
    {
      label: 'Service frequency',
      value: proposalMeta.frequencyLabel ?? '—',
    },
    {
      label: 'Selected service level',
      value: formatServiceLevelLabel(proposalMeta.selectedServiceLevel),
    },
    {
      label: 'Monthly charge',
      value:
        pricing.monthlyCharge != null
          ? `${formatNzd(pricing.monthlyCharge)} + GST`
          : '—',
    },
    {
      label: 'Term',
      value: proposalMeta.termLabel ?? '—',
    },
  ]

  return (
    <ProposalSection
      eyebrow="Agreement summary"
      title="At a glance"
      subtitle="The key terms of what we're proposing — confirmed in writing on acceptance."
    >
      <div className="rounded-xl border border-sage-100 bg-white overflow-hidden print:break-inside-avoid">
        <dl className="divide-y divide-sage-100">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-6 px-5 lg:px-6 py-4"
            >
              <dt className="text-sage-500 text-[0.8125rem] font-medium uppercase tracking-[0.08em]">
                {row.label}
              </dt>
              <dd className="sm:col-span-2 text-sage-800 text-[0.95rem]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </ProposalSection>
  )
}
