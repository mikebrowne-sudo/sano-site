'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  UserCheck,
  MapPin,
  BadgeCheck,
  Home,
  Building2,
  KeyRound,
  ClipboardCheck,
} from 'lucide-react'

const HERO_IMAGE = '/images/herne-bay-residential.jpg'

const ease = [0.22, 1, 0.36, 1] as const

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
}

const item = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.75, ease } },
}

const TRUST_BADGES = [
  { label: 'Insured',                Icon: ShieldCheck },
  { label: 'Vetted teams',           Icon: UserCheck },
  { label: 'Auckland wide',          Icon: MapPin },
  { label: 'Satisfaction guarantee', Icon: BadgeCheck },
]

const SERVICE_CHIPS = [
  { label: 'Homes',          Icon: Home },
  { label: 'Offices',        Icon: Building2 },
  { label: 'Rentals',        Icon: KeyRound },
  { label: 'End of tenancy', Icon: ClipboardCheck },
]

export function HomeHero() {
  return (
    <section className="relative flex h-[560px] overflow-hidden">
      {/* Full-bleed background image (real Sano residential shot, Herne Bay).
          Decorative — the headline + body carry the semantic meaning. */}
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        className="object-cover object-center md:object-right"
        priority
        sizes="100vw"
      />

      {/* Base gradient — strong dark sage on the left for white text legibility,
          fades softer through the centre, minimal on the right so the warm
          interior stays visible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(6,35,29,0.88) 0%, rgba(6,35,29,0.72) 30%, rgba(6,35,29,0.38) 55%, rgba(6,35,29,0.06) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Mobile-only overlay top-up — the image fills the full viewport behind
          the text on small screens, so a slightly stronger overlay keeps the
          white type readable against any lighter areas of the photograph. */}
      <div
        className="absolute inset-0 md:hidden"
        style={{
          background:
            'linear-gradient(to right, rgba(6,35,29,0.25) 0%, rgba(6,35,29,0.18) 50%, rgba(6,35,29,0.10) 100%)',
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
          <div className="max-w-2xl pl-2 lg:pl-4">
            {/* Eyebrow */}
            <motion.p
              variants={item}
              className="mb-4 text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-white/90"
            >
              Residential and commercial cleaning across Auckland
            </motion.p>

            {/* Headline */}
            <motion.h1
              variants={item}
              className="mb-5 text-white"
              style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', lineHeight: 1.08, letterSpacing: '-0.025em' }}
            >
              Clean spaces that feel better to be in.
            </motion.h1>

            {/* Body */}
            <motion.p
              variants={item}
              className="mb-7 text-[1rem] leading-[1.6] text-white/85 max-w-[26rem]"
            >
              Sano means healthy. For us, that means reliable cleaning, carefully vetted teams, clear quotes, and spaces properly cared for.
            </motion.p>

            {/* CTA row */}
            <motion.div variants={item} className="mb-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-white px-6 py-2.5 text-[0.875rem] font-semibold text-sage-800 transition-all duration-300 hover:bg-sage-100 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get a Free Quote
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center rounded-full border border-white/40 px-6 py-2.5 text-[0.875rem] font-semibold text-white transition-all duration-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Explore Services
              </Link>
            </motion.div>

            {/* Trust row — inline icon row with subtle separators, lighter
                visual weight than the boxed service chips below */}
            <motion.div
              variants={item}
              className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-semibold text-white/95"
            >
              {TRUST_BADGES.map(({ label, Icon }, i) => (
                <span key={label} className="inline-flex items-center gap-x-3">
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="hidden h-3 w-px bg-white/40 sm:inline-block"
                    />
                  )}
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={14} strokeWidth={2} aria-hidden="true" />
                    {label}
                  </span>
                </span>
              ))}
            </motion.div>

            {/* Service chips — soft white card chips, sage text and icons.
                More visible than the inline trust row above, with enough weight
                to read as a clear category row without competing with the CTAs. */}
            <motion.div variants={item} className="flex flex-wrap gap-2">
              {SERVICE_CHIPS.map(({ label, Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/50 bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-sage-800 shadow-sm backdrop-blur-sm"
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" className="text-sage-600" />
                  {label}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
