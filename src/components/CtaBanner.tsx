'use client'

import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { FadeIn } from './FadeIn'
import { QuoteButton } from './QuoteButton'

interface CtaBannerProps {
  headline?: string
  subtext?: string
}

/**
 * Site-wide closing CTA band. Sage-800 base with two palette-derived
 * corner glows (sage-300 / sage-500, heavily blurred) that respond in
 * three stages: they brighten as the band scrolls into view, step up
 * when the pointer is over the band, and peak while hovering the quote
 * button. Copy and API unchanged from the original.
 */
export function CtaBanner({
  headline = 'Ready for a cleaner home?',
  subtext = 'Get a free, no-obligation quote today.',
}: CtaBannerProps) {
  const ref = useRef<HTMLElement>(null)
  const [overBand, setOverBand] = useState(false)
  const [overButton, setOverButton] = useState(false)

  // 0 → band entering the viewport, 1 → page scrolled to the band's end.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const scrollGlow = useTransform(scrollYProgress, [0, 1], [0.4, 1])

  const glowLevel = overButton ? 1 : overBand ? 0.8 : 0.55
  const glowScale = overButton ? 1.25 : overBand ? 1.1 : 1

  return (
    <section
      ref={ref}
      onMouseEnter={() => setOverBand(true)}
      onMouseLeave={() => setOverBand(false)}
      className="relative overflow-hidden bg-sage-800 section-padding py-8 md:py-10 border-t border-white/10"
    >
      {/* Corner glows: scroll progress drives the layer, hover states
          drive each disc. Palette tokens only. */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: scrollGlow }}
        className="pointer-events-none absolute inset-0"
      >
        <motion.div
          animate={{ opacity: glowLevel, scale: glowScale }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sage-300/25 blur-3xl"
        />
        <motion.div
          animate={{ opacity: glowLevel, scale: glowScale }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-sage-500/30 blur-3xl"
        />
      </motion.div>

      <FadeIn className="relative container-max text-center">
        <h2 className="text-white mb-2.5">{headline}</h2>
        <p className="text-sage-100/90 mb-6 text-lg max-w-2xl mx-auto">{subtext}</p>
        <span
          className="inline-block"
          onMouseEnter={() => setOverButton(true)}
          onMouseLeave={() => setOverButton(false)}
        >
          <QuoteButton variant="white" className="px-8 py-3.5" />
        </span>
      </FadeIn>
    </section>
  )
}
