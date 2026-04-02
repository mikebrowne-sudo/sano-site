import type { Metadata } from 'next'
import Image from 'next/image'
import { CtaBanner } from '@/components/CtaBanner'
import { TrustBar } from '@/components/TrustBar'

export const metadata: Metadata = {
  title: 'About Sano Cleaning | Auckland',
  description: "Meet the Sano team. We're a passionate, eco-conscious cleaning company based in Auckland, committed to delivering exceptional results with every clean.",
}

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="section-padding py-16 bg-gradient-to-b from-white to-sage-50">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest mb-3">About us</p>
              <h1 className="text-sage-800 mb-4">We care about clean — and the planet.</h1>
              <p className="text-gray-600 leading-relaxed mb-6">
                Sano was founded with a simple belief: cleaning should be professional, safe, and kind to the environment. We work with vetted, passionate cleaners who take pride in their work — and we use products that are gentle on your home and the planet.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Based in Auckland, we serve homes and businesses across the city, from the North Shore to South Auckland and everywhere in between.
              </p>
            </div>
            <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
                alt="Sano cleaner at work"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      <TrustBar />

      {/* Values */}
      <section className="section-padding py-16 bg-white">
        <div className="container-max">
          <h2 className="text-center text-sage-800 mb-12">Our values</h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Trust', body: "Every cleaner is background-checked and interviewed in person. You're opening your home to us — we take that seriously." },
              { title: 'Eco-first', body: "We use biodegradable, non-toxic products that are safe for children, pets, and waterways." },
              { title: 'Guaranteed', body: "Not happy? We'll come back and make it right — no questions, no fuss." },
            ].map((value) => (
              <li key={value.title} className="bg-sage-50 rounded-2xl p-8 border border-sage-100">
                <h3 className="text-sage-800 mb-3">{value.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{value.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBanner headline="Want to know more?" subtext="Get in touch — we're happy to chat." />
    </>
  )
}
