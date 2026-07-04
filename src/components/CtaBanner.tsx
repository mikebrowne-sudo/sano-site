import { FadeIn } from './FadeIn'
import { QuoteButton } from './QuoteButton'

interface CtaBannerProps {
  headline?: string
  subtext?: string
}

/**
 * Site-wide closing CTA band. Visual language: sage-800 base with two
 * soft palette-derived glows (sage-300 / sage-500 at low opacity, heavily
 * blurred) and a hairline top separator, content fading up on scroll via
 * the shared FadeIn. Copy and API unchanged from the original.
 */
export function CtaBanner({
  headline = 'Ready for a cleaner home?',
  subtext = 'Get a free, no-obligation quote today.',
}: CtaBannerProps) {
  return (
    <section className="relative overflow-hidden bg-sage-800 section-padding py-12 md:py-16 border-t border-white/10">
      {/* Soft ambient glows — palette tokens at low opacity, no new colours. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sage-300/10 blur-3xl" />
        <div className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-sage-500/20 blur-3xl" />
      </div>

      <FadeIn className="relative container-max text-center">
        <h2 className="text-white mb-3">{headline}</h2>
        <p className="text-sage-100/90 mb-8 text-lg max-w-2xl mx-auto">{subtext}</p>
        <QuoteButton variant="white" className="px-8 py-3.5" />
      </FadeIn>
    </section>
  )
}
