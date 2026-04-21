import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Proposal not available — Sano',
  robots: 'noindex, nofollow',
}

export default function ProposalNotFound() {
  return (
    <div className="min-h-screen bg-sage-50/60 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white border border-sage-100 rounded-2xl p-8 lg:p-10 text-center shadow-sm">
        <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500 mb-4">
          Sano Property Services
        </div>
        <h1 className="font-display font-bold text-sage-800 text-2xl leading-tight tracking-tight mb-3">
          This proposal isn&apos;t available
        </h1>
        <p className="text-sage-600 text-[0.95rem] leading-relaxed mb-6">
          The link may have expired or been replaced with a newer version. If
          you were expecting to see a proposal here, let us know and we&apos;ll send
          you a fresh link.
        </p>
        <a
          href="mailto:hello@sano.nz"
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors"
        >
          Email hello@sano.nz
        </a>
      </div>
    </div>
  )
}
