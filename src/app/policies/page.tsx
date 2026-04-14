import type { Metadata } from 'next'
import { PoliciesAccordion } from '@/components/PoliciesAccordion'
import { CtaBanner } from '@/components/CtaBanner'

export const metadata: Metadata = {
  title: 'Our Policies | Sano Cleaning Auckland',
  description:
    'Clear and fair policies covering access, cancellations, payment, privacy, and more. Everything you need to know before booking with Sano.',
}

export default function PoliciesPage() {
  return (
    <>
      <section className="section-padding py-10 md:py-14 bg-gradient-to-b from-white to-sage-50">
        <div className="container-max">
          <p className="text-xs font-semibold text-sage-300 uppercase tracking-widest text-center mb-2">
            How we work
          </p>
          <h1 className="text-center text-sage-800 mb-3">Our Policies</h1>
          <p className="text-center text-gray-600 max-w-lg mx-auto mb-10">
            Clear and fair across the board. These cover the key things to know when booking with
            Sano.
          </p>
          <PoliciesAccordion />
        </div>
      </section>

      <CtaBanner />
    </>
  )
}
