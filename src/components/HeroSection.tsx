import Image from 'next/image'
import { QuoteButton } from './QuoteButton'

interface HeroSectionProps {
  badge?: string
  headline: string
  subtext: string
  imageUrl: string
  imageAlt: string
  showSecondaryButton?: boolean
  secondaryLabel?: string
  secondaryHref?: string
}

export function HeroSection({
  badge,
  headline,
  subtext,
  imageUrl,
  imageAlt,
  showSecondaryButton = true,
  secondaryLabel = 'Our Services',
  secondaryHref = '/services',
}: HeroSectionProps) {
  return (
    <section className="relative min-h-[520px] flex items-center">
      {/* Background image */}
      <Image
        src={imageUrl}
        alt={imageAlt}
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />
      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(45,90,61,0.82) 40%, rgba(45,90,61,0.25))',
        }}
        aria-hidden="true"
      />
      {/* Content */}
      <div className="relative z-10 container-max section-padding py-20 w-full">
        {badge && (
          <span className="inline-block mb-4 rounded-full border border-white/30 bg-white/15 backdrop-blur-sm px-4 py-1 text-xs font-medium text-white">
            {badge}
          </span>
        )}
        <h1 className="text-white text-4xl sm:text-5xl lg:text-6xl mb-4 max-w-xl leading-tight">
          {headline}
        </h1>
        <p className="text-white/90 text-base sm:text-lg mb-8 max-w-md leading-relaxed">
          {subtext}
        </p>
        <div className="flex flex-wrap gap-3">
          <QuoteButton variant="white" />
          {showSecondaryButton && (
            <QuoteButton
              label={secondaryLabel}
              href={secondaryHref}
              variant="ghost"
            />
          )}
        </div>
      </div>
    </section>
  )
}
