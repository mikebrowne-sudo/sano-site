import type { Metadata } from 'next'
import { poppins, notoSerif } from '@/lib/fonts'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sano Cleaning — Professional Cleaning in Auckland',
  description: 'Professional, eco-friendly cleaning services in Auckland. Regular, deep, end of tenancy, commercial, and more. Vetted cleaners. Free quotes.',
  openGraph: {
    title: 'Sano Cleaning — Professional Cleaning in Auckland',
    description: 'Professional, eco-friendly cleaning services in Auckland.',
    url: process.env.NEXT_PUBLIC_SITE_URL,
    siteName: 'Sano Cleaning',
    locale: 'en_NZ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${notoSerif.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
