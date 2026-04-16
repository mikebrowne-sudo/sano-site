import type { Metadata } from 'next'
import { PoliciesAccordion } from '@/components/PoliciesAccordion'
import { CtaBanner } from '@/components/CtaBanner'

export const metadata: Metadata = {
  title: 'Our Policies | Sano Cleaning Auckland',
  description:
    'Clear, fair policies that help keep everything simple and professional. Everything you need to know about booking with Sano Cleaning Auckland.',
}

export default function PoliciesPage() {
  return (
    <>
      {/*
        ── Hero ──
        CSS parallax via background-attachment: fixed.
        Falls back gracefully to a standard scroll on iOS Safari.
      */}
      <section
        className="relative flex items-center justify-center text-center"
        style={{
          minHeight: '500px',
          backgroundImage: 'url(/images/deep-cleaning.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundAttachment: 'fixed',
        }}
        aria-label="Policies hero"
      >
        {/* Layered dark overlay — top slightly lighter, bottom richer */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(160deg, rgba(6,35,29,0.68) 0%, rgba(52,76,61,0.76) 50%, rgba(6,35,29,0.82) 100%)',
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <div className="relative z-10 section-padding container-max max-w-2xl py-20 md:py-28">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55 mb-5">
            How we work
          </p>
          <h1 className="text-white mb-5" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
            Our Policies
          </h1>
          <p className="text-white/80 text-lg leading-[1.75] max-w-xl mx-auto">
            Clear, fair policies that help keep everything simple, professional, and easy to manage.
          </p>
        </div>
      </section>

      {/* ── Policies grid ── */}
      <section className="section-padding py-12 md:py-16 bg-white">
        <div className="container-max">

          {/* Section intro */}
          <div className="max-w-xl mx-auto text-center mb-10">
            <h2 className="text-sage-800 mb-3">What to know before booking</h2>
            <p className="body-text">
              We keep things simple. Click any section below to read our full policy on that topic.
            </p>
          </div>

          <PoliciesAccordion />
        </div>
      </section>

      <CtaBanner />
    </>
  )
}
