import { ProposalSection } from './ProposalSection'

type ProposalInclusionsProps = {
  included: string[]
  excluded: string[]
}

function List({
  items,
  tone,
}: {
  items: string[]
  tone: 'included' | 'excluded'
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-3 text-sage-700 text-[0.95rem] leading-relaxed"
        >
          <span
            aria-hidden
            className={
              tone === 'included'
                ? 'mt-2 inline-block w-1.5 h-1.5 rounded-full bg-sage-500 flex-shrink-0'
                : 'mt-2 inline-block w-1.5 h-1.5 rounded-full bg-sage-200 flex-shrink-0'
            }
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function ProposalInclusions({ included, excluded }: ProposalInclusionsProps) {
  return (
    <ProposalSection
      eyebrow="What's in, what's not"
      title="Included and excluded"
      subtitle="A clear line between what your monthly fee covers and what sits outside this proposal."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2">
        <div className="rounded-xl border border-sage-100 bg-white p-5 lg:p-6">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-500 mb-4">
            Included
          </div>
          <List items={included} tone="included" />
        </div>
        <div className="rounded-xl border border-sage-100 bg-sage-50/40 p-5 lg:p-6">
          <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-sage-600 mb-4">
            Not included
          </div>
          <List items={excluded} tone="excluded" />
        </div>
      </div>
    </ProposalSection>
  )
}
