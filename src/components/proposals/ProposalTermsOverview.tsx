import { ProposalSection } from './ProposalSection'

type ProposalTermsOverviewProps = {
  terms: string[]
}

export function ProposalTermsOverview({ terms }: ProposalTermsOverviewProps) {
  return (
    <ProposalSection
      eyebrow="The basics"
      title="Terms overview"
      subtitle="A plain-English summary — the full service agreement follows on acceptance."
    >
      <ul className="space-y-2.5 print:break-inside-avoid">
        {terms.map((term, i) => (
          <li
            key={i}
            className="flex gap-3 text-sage-700 text-[0.95rem] leading-relaxed"
          >
            <span
              aria-hidden
              className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-sage-500 flex-shrink-0"
            />
            <span>{term}</span>
          </li>
        ))}
      </ul>
    </ProposalSection>
  )
}
