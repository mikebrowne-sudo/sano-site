import type { HowWeWorkBlock } from '@/lib/proposals/types'
import { ProposalSection } from './ProposalSection'

type ProposalHowWeWorkProps = {
  blocks: HowWeWorkBlock[]
}

export function ProposalHowWeWork({ blocks }: ProposalHowWeWorkProps) {
  return (
    <ProposalSection eyebrow="How we work" title="What you can expect from us">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
        {blocks.map((block, i) => (
          <div
            key={i}
            className="rounded-xl border border-sage-100 bg-sage-50/40 p-5 lg:p-6"
          >
            <h3 className="font-display text-sage-800 text-lg font-semibold tracking-tight mb-2">
              {block.title}
            </h3>
            <p className="text-sage-600 text-[0.95rem] leading-relaxed">
              {block.body}
            </p>
          </div>
        ))}
      </div>
    </ProposalSection>
  )
}
