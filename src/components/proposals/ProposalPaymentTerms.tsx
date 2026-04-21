import { ProposalSection } from './ProposalSection'

type ProposalPaymentTermsProps = {
  terms: string[]
}

export function ProposalPaymentTerms({ terms }: ProposalPaymentTermsProps) {
  return (
    <ProposalSection eyebrow="Payment" title="Payment terms">
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
