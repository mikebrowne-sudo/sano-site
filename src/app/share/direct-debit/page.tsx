import type { Metadata } from 'next'
import Image from 'next/image'

// Where a customer lands after saving their bank account for automatic
// payments (Stripe direct debit setup). Public, no data shown.

export const metadata: Metadata = {
  title: 'Automatic payments | Sano',
  robots: { index: false, follow: false },
}

export default function DirectDebitDonePage({ searchParams }: { searchParams?: { cancelled?: string } }) {
  const cancelled = searchParams?.cancelled === '1'
  return (
    <main className="min-h-screen bg-sage-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-sage-100 bg-white p-8 text-center shadow-sm">
        <Image src="/brand/sano-logo-horizontal.png" alt="Sano" width={160} height={48} className="mx-auto mb-6 h-10 w-auto" />
        {cancelled ? (
          <>
            <h1 className="text-xl font-semibold text-sage-800">No changes made</h1>
            <p className="mt-3 text-sm leading-relaxed text-sage-600">
              Your automatic payments weren&apos;t set up. If you&apos;d like to try again, just use the link in our email,
              or reply and we&apos;ll send a fresh one.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-sage-800">You&apos;re all set</h1>
            <p className="mt-3 text-sm leading-relaxed text-sage-600">
              Thanks — your automatic payments are set up. Each invoice we send you will now be paid automatically by
              direct debit from the account you entered, so there&apos;s nothing more you need to do.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-sage-600">
              We&apos;ll still email you every invoice for your records. If anything changes, just get in touch.
            </p>
          </>
        )}
        <p className="mt-6 text-xs text-sage-600/70">Sano Property Services Limited · hello@sano.nz</p>
      </div>
    </main>
  )
}
