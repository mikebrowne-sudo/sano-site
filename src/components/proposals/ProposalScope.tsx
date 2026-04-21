import type { ScopeGroup } from '@/lib/proposals/types'
import { ProposalSection } from './ProposalSection'

type ProposalScopeProps = {
  groups: ScopeGroup[]
}

export function ProposalScope({ groups }: ProposalScopeProps) {
  return (
    <ProposalSection
      eyebrow="Scope of service"
      title="What's covered on each visit"
      subtitle="Grouped by area so it's easy to map to your site. A full checklist forms part of the service agreement."
    >
      <div className="space-y-6">
        {groups.map((group, i) => (
          <div
            key={i}
            className="rounded-xl border border-sage-100 bg-white p-5 lg:p-6 print:break-inside-avoid"
          >
            <h3 className="font-display text-sage-800 text-base lg:text-[1.0625rem] font-semibold tracking-tight mb-3">
              {group.title}
            </h3>
            <ul className="space-y-1.5">
              {group.items.map((item, j) => (
                <li
                  key={j}
                  className="flex gap-3 text-sage-700 text-[0.95rem] leading-relaxed"
                >
                  <span
                    aria-hidden
                    className="mt-2 inline-block w-1 h-1 rounded-full bg-sage-500 flex-shrink-0"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ProposalSection>
  )
}
