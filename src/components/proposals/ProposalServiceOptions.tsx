import type { ServiceOption } from '@/lib/proposals/types'
import { ProposalSection } from './ProposalSection'

type ProposalServiceOptionsProps = {
  options: ServiceOption[]
}

export function ProposalServiceOptions({ options }: ProposalServiceOptionsProps) {
  return (
    <ProposalSection
      eyebrow="Service levels"
      title="Three ways we can run this site"
      subtitle="Pick the level that matches how visible the space is and how much upkeep it needs. You can move between levels as things change."
    >
      <div className="space-y-3">
        {options.map((option, i) => (
          <div
            key={i}
            className="rounded-xl border border-sage-100 bg-white p-5 lg:p-6 print:break-inside-avoid"
          >
            <h3 className="font-display text-sage-800 text-[1.0625rem] font-semibold tracking-tight mb-2">
              {option.title}
            </h3>
            <p className="text-sage-600 text-[0.95rem] leading-relaxed">
              {option.description}
            </p>
          </div>
        ))}
      </div>
    </ProposalSection>
  )
}
