import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock3 } from 'lucide-react'

export function CareersHero() {
  return (
    <section className="relative flex items-center justify-center min-h-[60vh] overflow-hidden bg-sage-800">
      {/* Background image */}
      <Image
        src="/images/careers/sano-team-hero.jpg"
        alt="The Sano team standing together"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Dark overlay for text legibility */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 w-full section-padding py-20 lg:py-28 text-center text-white">
        <h1 className="text-white font-sans font-bold mb-6 [text-shadow:0_2px_8px_rgba(0,0,0,0.35)]">
          Join Our Team
        </h1>
        <p className="body-text !text-sage-100 max-w-xl mx-auto mb-8 [text-shadow:0_1px_4px_rgba(0,0,0,0.3)]">
          We&apos;re always looking for reliable, detail-focused people who take pride in their work. If you have cleaning experience and want flexible opportunities with a growing team, we&apos;d love to hear from you.
        </p>
        <Link
          href="/join-our-team/apply"
          className="inline-flex items-center gap-2 rounded-full bg-sage-500 px-6 py-3 text-sm font-medium text-white hover:bg-sage-800 transition-colors"
        >
          Apply Now
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-sage-100">
          <Clock3 className="w-4 h-4" aria-hidden="true" />
          Takes 7+ minutes
        </p>
      </div>
    </section>
  )
}
