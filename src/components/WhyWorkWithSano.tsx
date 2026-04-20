import { Clock3, TrendingUp, Users } from 'lucide-react'
import type React from 'react'

interface Benefit {
  icon: React.ReactNode
  title: string
  body: string
}

const BENEFITS: Benefit[] = [
  {
    icon: <Clock3 className="w-6 h-6" />,
    title: 'Flexible Work',
    body: 'Choose work that suits your schedule. We offer flexible opportunities across different types of cleaning jobs.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Supportive Team',
    body: 'We keep things straightforward and back our team. Clear communication and support matter to us.',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Consistent Opportunities',
    body: "We're growing and have regular work available. We're looking for people we can rely on long term.",
  },
]

export function WhyWorkWithSano() {
  return (
    <section className="section-padding section-y bg-[#faf9f6]">
      <div className="container-max">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2>Why work with Sano</h2>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-3 gap-6">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-sage-100 bg-white p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-sage-50 text-sage-600">
                {b.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-sage-800">{b.title}</h3>
              <p className="text-sm leading-relaxed text-sage-600">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
