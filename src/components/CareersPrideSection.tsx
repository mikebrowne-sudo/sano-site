import { Sparkles } from 'lucide-react'

export function CareersPrideSection() {
  return (
    <section className="section-padding section-y bg-white">
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
          {/* Text column */}
          <div>
            <h2 className="mb-6">A team that takes pride in the work</h2>
            <p className="body-text mb-4">
              At Sano, we&apos;re focused on creating clean, healthy spaces for the people we work with.
            </p>
            <p className="body-text">
              It&apos;s simple work done well — and it&apos;s something we take pride in every day.
            </p>
          </div>

          {/* Placeholder image block (swap for <Image> later) */}
          <div className="relative rounded-2xl ring-1 ring-sage-100/60 shadow-sm overflow-hidden aspect-[4/3] bg-gradient-to-br from-sage-50 to-sage-100 flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-sage-500/40" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  )
}
