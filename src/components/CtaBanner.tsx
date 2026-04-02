import { QuoteButton } from './QuoteButton'

interface CtaBannerProps {
  headline?: string
  subtext?: string
}

export function CtaBanner({
  headline = 'Ready for a cleaner home?',
  subtext = 'Get a free, no-obligation quote today.',
}: CtaBannerProps) {
  return (
    <section className="bg-sage-800 section-padding py-16">
      <div className="container-max text-center">
        <h2 className="text-white mb-3">{headline}</h2>
        <p className="text-sage-100 mb-8 text-lg">{subtext}</p>
        <QuoteButton variant="white" />
      </div>
    </section>
  )
}
