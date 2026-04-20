import { Users } from 'lucide-react'

export function CareersHero() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div>
            <p className="eyebrow mb-4">Careers</p>
            <h1 className="mb-6">Join Our Team</h1>
            <p className="body-text max-w-xl">
              We&apos;re always looking for reliable, detail-focused people who take pride in their work. If you have cleaning experience and want flexible opportunities with a growing team, we&apos;d love to hear from you.
            </p>
          </div>

          {/* Placeholder block (swap for <Image> later — same wrapper, same classes) */}
          <div className="relative rounded-2xl ring-1 ring-sage-100/60 shadow-sm overflow-hidden aspect-video lg:aspect-[4/5] bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center">
            <Users className="w-16 h-16 text-sage-500/40" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
