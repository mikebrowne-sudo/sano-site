'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

const HERO_IMAGE = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=80'

const ease = [0.22, 1, 0.36, 1] as const

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.2 } },
}

const item = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease } },
}

export function HomeHero() {
  return (
    <section className="relative flex h-[560px] overflow-hidden">
      {/* Full-bleed background image */}
      <Image
        src={HERO_IMAGE}
        alt="Bright, clean modern home"
        fill
        className="object-cover object-center"
        priority
        sizes="100vw"
      />

      {/* Gradient overlay: dark on left → transparent on right */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, rgba(6,35,29,0.88) 0%, rgba(6,35,29,0.72) 35%, rgba(6,35,29,0.30) 65%, rgba(6,35,29,0.05) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Content — left-aligned over the dark side */}
      <motion.div
        className="relative z-10 flex w-full flex-col justify-center section-padding py-8"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <div className="container-max w-full">
        <div className="max-w-lg pl-8 lg:pl-16">
          {/* Eyebrow */}
          <motion.p
            variants={item}
            className="mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-white/55"
          >
            Auckland Cleaning Services, Done Properly
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="mb-5 text-white"
            style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 1.08, letterSpacing: '-0.025em' }}
          >
            Clean spaces that feel better to be in.
          </motion.h1>

          {/* Subtext */}
          <motion.p
            variants={item}
            className="mb-2 text-[1rem] leading-[1.7] text-white/80 max-w-[24rem]"
          >
            Sano means healthy. That&apos;s how we approach cleaning. Not just how a space looks, but how it feels. Fresh, consistent, and properly cared for.
          </motion.p>

          {/* Support line */}
          <motion.p
            variants={item}
            className="mb-7 text-[0.8125rem] leading-[1.6] text-white/50 max-w-[24rem]"
          >
            Residential and commercial cleaning across Auckland.
          </motion.p>

          {/* CTA */}
          <motion.div variants={item}>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full bg-white px-7 py-3 text-[0.875rem] font-semibold text-sage-800 transition-all duration-300 hover:bg-sage-100 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Request a Quote
            </Link>
          </motion.div>
        </div>
        </div>
      </motion.div>
    </section>
  )
}
