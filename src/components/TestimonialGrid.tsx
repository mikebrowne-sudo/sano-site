const TESTIMONIALS = [
  {
    id: 1,
    quote: "Sano transformed our home. The team was thorough, professional, and used products that were safe for our kids and dog. We've been with them for 6 months now.",
    name: 'Sarah M.',
    location: 'Ponsonby, Auckland',
    rating: 5,
  },
  {
    id: 2,
    quote: "We used Sano for an end of tenancy clean and got our full bond back. They were detailed, on time, and the price was exactly what was quoted.",
    name: 'James T.',
    location: 'Mt Eden, Auckland',
    rating: 5,
  },
  {
    id: 3,
    quote: "Our office looks incredible after every weekly visit. The staff are always friendly and nothing is ever missed. Highly recommend for commercial cleaning.",
    name: 'Priya K.',
    location: 'CBD, Auckland',
    rating: 5,
  },
]

export function TestimonialGrid() {
  return (
    <section className="section-padding py-16 bg-sage-50">
      <div className="container-max">
        <h2 className="text-center text-sage-800 mb-12">What our clients say</h2>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <li key={t.id} className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100">
              <div className="flex gap-0.5 mb-4" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <span key={i} className="text-sage-500 text-lg" aria-hidden="true">★</span>
                ))}
              </div>
              <blockquote className="text-gray-700 text-sm leading-relaxed mb-4">
                "{t.quote}"
              </blockquote>
              <footer>
                <p className="font-semibold text-sm text-sage-800">{t.name}</p>
                <p className="text-xs text-gray-500">{t.location}</p>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
