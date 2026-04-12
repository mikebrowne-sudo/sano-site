'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SERVICES } from '@/lib/services'
import { QuoteButton } from './QuoteButton'

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const els = document.querySelectorAll('.fade-up')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-sage-100 shadow-sm">
      <div className="container-max section-padding">
        <div className="grid grid-cols-3 items-center h-24">

          {/* Logo — left */}
          <Link href="/" aria-label="Sano — home" className="justify-self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/sano-logo.jpg"
              alt="Sano"
              style={{ height: '67px', width: 'auto' }}
            />
          </Link>

          {/* Nav — centre */}
          <nav className="hidden md:flex items-center justify-center gap-10" aria-label="Main navigation">
            <div className="relative">
              <button
                onClick={() => setServicesOpen(!servicesOpen)}
                onBlur={() => setTimeout(() => setServicesOpen(false), 150)}
                className={`flex items-center gap-1 text-[18px] font-semibold transition-all duration-200 ${pathname.startsWith('/services') ? 'text-sage-800' : 'text-gray-700 hover:text-sage-800'}`}
                aria-expanded={servicesOpen}
                aria-haspopup="true"
              >
                Services
                <span className="text-xs" aria-hidden="true">{servicesOpen ? '▲' : '▼'}</span>
              </button>
              {servicesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-sage-100 py-2 z-50">
                  <Link href="/services" className="block px-4 py-2 text-sm font-semibold text-sage-800 hover:bg-sage-50" onClick={() => setServicesOpen(false)}>
                    All Services
                  </Link>
                  <hr className="my-1 border-sage-100" />
                  {SERVICES.map((service) => (
                    <Link key={service.slug} href={`/services/${service.slug}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-sage-50 hover:text-sage-800" onClick={() => setServicesOpen(false)}>
                      {service.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Link href="/about" className={`text-[18px] font-semibold transition-all duration-200 ${pathname === '/about' ? 'text-sage-800' : 'text-gray-700 hover:text-sage-800'}`}>About</Link>
            <Link href="/faq" className={`text-[18px] font-semibold transition-all duration-200 ${pathname === '/faq' ? 'text-sage-800' : 'text-gray-700 hover:text-sage-800'}`}>FAQ</Link>
            <Link href="/contact" className={`text-[18px] font-semibold transition-all duration-200 ${pathname === '/contact' ? 'text-sage-800' : 'text-gray-700 hover:text-sage-800'}`}>Contact</Link>
          </nav>

          {/* CTA + mobile hamburger — right */}
          <div className="flex items-center justify-end">
            <QuoteButton label="Get a Quote" className="hidden md:inline-flex" />
            <button
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-sage-50"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
            >
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current mb-1" />
              <span className="block w-5 h-0.5 bg-current" />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-sage-100 bg-white section-padding py-4" aria-label="Mobile navigation">
          <div className="space-y-1">
            <Link href="/services" className="block py-2 text-sm font-semibold text-sage-800" onClick={() => setMobileOpen(false)}>All Services</Link>
            {SERVICES.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="block py-2 pl-4 text-sm text-gray-700" onClick={() => setMobileOpen(false)}>
                {service.name}
              </Link>
            ))}
            <hr className="border-sage-100 my-2" />
            <Link href="/about" className="block py-2 text-sm font-medium text-gray-700" onClick={() => setMobileOpen(false)}>About</Link>
            <Link href="/faq" className="block py-2 text-sm font-medium text-gray-700" onClick={() => setMobileOpen(false)}>FAQ</Link>
            <Link href="/contact" className="block py-2 text-sm font-medium text-gray-700" onClick={() => setMobileOpen(false)}>Contact</Link>
            <div className="pt-2">
              <QuoteButton label="Get a Quote" className="w-full text-center" />
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
