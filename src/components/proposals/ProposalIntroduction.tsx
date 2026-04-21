import { ProposalSection } from './ProposalSection'

type ProposalIntroductionProps = {
  body: string
}

export function ProposalIntroduction({ body }: ProposalIntroductionProps) {
  const paragraphs = body.split('\n\n').filter(Boolean)

  return (
    <ProposalSection eyebrow="Introduction" title="A quick word before we get into the detail">
      <div className="space-y-4 text-sage-700 text-[1.0625rem] leading-[1.75]">
        {paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </ProposalSection>
  )
}
