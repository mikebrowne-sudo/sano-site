import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { poppins, notoSerif } from '@/lib/fonts'
import { Analytics } from '@/components/Analytics'
import './globals.css'

export const metadata: Metadata = {
  // Absolute base so canonical + OG/Twitter image URLs always resolve to
  // the live domain (falls back to the production host in dev/build).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sano.nz'),
  title: 'Sano Cleaning — Professional Cleaning in Auckland',
  description: 'Professional cleaning services in Auckland. Regular, deep, end of tenancy, commercial, and more. Vetted cleaners. Free quotes.',
  manifest: '/manifest.json',
  // Google Search Console verification — rendered only when the env var is set.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sano',
  },
  icons: {
    // 2026-05-14 — switched off the placeholder `sano-mark.svg` to the
    // real Sano logomark PNG (source: 10-Branding/Logos/Logomark/logo4).
    // The Apple touch icon points at the same 192px square the PWA uses.
    icon: '/brand/sano-logomark.png',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'Sano Cleaning — Professional Cleaning in Auckland',
    description: 'Professional cleaning services in Auckland.',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'Sano Cleaning',
    locale: 'en_NZ',
    type: 'website',
    images: [
      {
        url: '/brand/sano-logomark.png',
        width: 512,
        height: 512,
        alt: 'Sano',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sano Cleaning — Professional Cleaning in Auckland',
    description: 'Professional cleaning services in Auckland.',
    images: ['/brand/sano-logomark.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#076653',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${notoSerif.variable}`}>
      <body>
        {children}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}
