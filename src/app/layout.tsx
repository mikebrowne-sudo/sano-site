import type { Metadata, Viewport } from 'next'
import { poppins, notoSerif } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sano Cleaning — Professional Cleaning in Auckland',
  description: 'Professional, eco-friendly cleaning services in Auckland. Regular, deep, end of tenancy, commercial, and more. Vetted cleaners. Free quotes.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Sano',
  },
  icons: {
    icon: '/brand/sano-mark.svg',
    apple: '/brand/sano-logo-stacked.png',
  },
  openGraph: {
    title: 'Sano Cleaning — Professional Cleaning in Auckland',
    description: 'Professional, eco-friendly cleaning services in Auckland.',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'Sano Cleaning',
    locale: 'en_NZ',
    type: 'website',
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
      <body>{children}</body>
    </html>
  )
}
