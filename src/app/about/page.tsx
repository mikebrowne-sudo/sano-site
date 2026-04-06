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
              <h1 className="text-sage-800 mb-4">Built on trust.<br />Driven by care.</h1>
              <p className="text-gray-600 leading-relaxed mb-4">
                Sano was built on a simple belief — cleaning is about more than just the job. It&apos;s about looking after people and the spaces that matter to them.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                With over 20 years of experience across residential, commercial, and education environments, we understand that every client is different. What matters most is taking the time to listen, understand what&apos;s needed, and delivering a result you can genuinely rely on.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We&apos;re known for going the extra mile — whether that&apos;s picking up on the small details others miss, being flexible when things change, or simply making sure everything is done properly. Behind Sano is a trusted network of experienced cleaners who care about their work and the people they&apos;re working with.
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
              { title: 'Easy to deal with', body: "Clear communication, simple booking, and a team that actually shows up when they say they will. No chasing, no hassle." },
              { title: 'Tailored to you', body: "Every space is different. We work around your needs and focus on what matters most to you — not a one-size-fits-all checklist." },
              { title: 'Consistent results', body: "We take pride in doing the job properly, every time. No shortcuts, no rushed work. Just a standard you can rely on." },
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
