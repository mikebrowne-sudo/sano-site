import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { businessSchema } from '@/lib/seo-schema'

// Every public page gets a self-referencing canonical and og:url. './'
// resolves against each page's own pathname (Next metadata), so query-string
// variants like /contact?service=commercial canonicalise to /contact.
// og:title / og:description are left unset so share previews fall back to the
// page's own <title> and description instead of the homepage's.
export const metadata: Metadata = {
  alternates: { canonical: './' },
  openGraph: {
    url: './',
    siteName: 'Sano Cleaning',
    locale: 'en_NZ',
    type: 'website',
    images: [
      {
        url: '/og/sano-og.jpg',
        width: 1200,
        height: 630,
        alt: 'Sano — Clean spaces, healthy living. Reliable cleaning in Auckland.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og/sano-og.jpg'],
  },
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessSchema()) }}
      />
    </>
  )
}
