'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { SERVICES } from '@/lib/services'
import { QuoteButton } from './QuoteButton'

const ABOUT_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Service Area', href: '/service-area' },
  { label: 'Our Guarantee', href: '/guarantee' },
  { label: 'Our Policies', href: '/policies' },
  { label: 'FAQ', href: '/faq' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const pathname = usePathname()
  const servicesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aboutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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
    <header className="sticky top-0 z-50">

      {/* Top bar */}
      <div className="bg-sage-700">
        <div className="container-max section-padding">
          <div className="flex justify-end items-center h-9 gap-2">
            <PhoneIcon className="text-sage-200" />
            <span className="text-sage-200 text-[13px] leading-relaxed">Call us for a free quote</span>
            <span className="text-white text-[13px] font-bold leading-relaxed whitespace-nowrap">0800 726 669</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="bg-white border-b border-sage-100 shadow-sm">
        <div className="container-max section-padding">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <Link href="/" aria-label="Sano — home" className="flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/sano-logo.png"
                alt="Sano"
                style={{ height: '67px', width: 'auto' }}
              />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
              <NavLink href="/" label="Home" pathname={pathname} />

              {/* Services — hover dropdown */}
              <div
                className="relative"
                onMouseEnter={() => {
                  if (servicesCloseTimer.current) clearTimeout(servicesCloseTimer.current)
                  setServicesOpen(true)
                }}
                onMouseLeave={() => {
                  servicesCloseTimer.current = setTimeout(() => setServicesOpen(false), 200)
                }}
              >
                <button
                  type="button"
                  className={`flex items-center gap-1 text-[15px] font-semibold transition-colors duration-200 ${
                    pathname.startsWith('/services') ? 'text-sage-700' : 'text-gray-700 hover:text-sage-700'
                  }`}
                  aria-expanded={servicesOpen}
                  aria-haspopup="true"
                >
                  Services
                  <ChevronIcon />
                </button>
                {servicesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-sage-100 py-2 z-50">
                    <Link
                      href="/services"
                      className="block px-4 py-2 text-[13px] font-semibold text-sage-700 hover:bg-sage-50"
                      onClick={() => setServicesOpen(false)}
                    >
                      All Services
                    </Link>
                    <hr className="my-1 border-sage-100" />
                    {SERVICES.map((service) => (
                      <Link
                        key={service.slug}
                        href={`/services/${service.slug}`}
                        className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-sage-50 hover:text-sage-700"
                        onClick={() => setServicesOpen(false)}
                      >
                        {service.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <NavLink href="/join-our-team" label="Join Our Team" pathname={pathname} />
              <NavLink href="/blog" label="Blog" pathname={pathname} />

              {/* About — hover dropdown */}
              <div
                className="relative"
                onMouseEnter={() => {
                  if (aboutCloseTimer.current) clearTimeout(aboutCloseTimer.current)
                  setAboutOpen(true)
                }}
                onMouseLeave={() => {
                  aboutCloseTimer.current = setTimeout(() => setAboutOpen(false), 200)
                }}
              >
                <button
                  type="button"
                  className={`flex items-center gap-1 text-[15px] font-semibold transition-colors duration-200 ${
                    ABOUT_LINKS.some((l) => pathname === l.href) ? 'text-sage-700' : 'text-gray-700 hover:text-sage-700'
                  }`}
                  aria-expanded={aboutOpen}
                  aria-haspopup="true"
                >
                  About
                  <ChevronIcon />
                </button>
                {aboutOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-sage-100 py-2 z-50">
                    {ABOUT_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-sage-50 hover:text-sage-700"
                        onClick={() => setAboutOpen(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <NavLink href="/contact" label="Contact Us" pathname={pathname} />
            </nav>

            {/* CTA + hamburger */}
            <div className="flex items-center gap-3">
              <QuoteButton label="Get a Quote" className="hidden md:inline-flex" />
              <button
                type="button"
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
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t border-sage-100 bg-white section-padding py-4"
          aria-label="Mobile navigation"
        >
          <div className="space-y-1">
            <Link href="/" className="block py-2 text-[15px] font-semibold text-gray-700" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link href="/services" className="block py-2 text-[15px] font-semibold text-gray-700" onClick={() => setMobileOpen(false)}>All Services</Link>
            {SERVICES.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="block py-2 pl-4 text-[13px] text-gray-700"
                onClick={() => setMobileOpen(false)}
              >
                {service.name}
              </Link>
            ))}
            <hr className="border-sage-100 my-2" />
            <Link href="/join-our-team" className="block py-2 text-[15px] font-medium text-gray-700" onClick={() => setMobileOpen(false)}>Join Our Team</Link>
            <Link href="/blog" className="block py-2 text-[15px] font-medium text-gray-700" onClick={() => setMobileOpen(false)}>Blog</Link>
            <p className="py-2 text-[15px] font-semibold text-gray-700">About</p>
            {ABOUT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-2 pl-4 text-[13px] text-gray-700"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/contact" className="block py-2 text-[15px] font-medium text-gray-700" onClick={() => setMobileOpen(false)}>Contact Us</Link>
            <hr className="border-sage-100 my-2" />
            <div className="flex items-center gap-2 py-2">
              <PhoneIcon className="text-sage-700" />
              <span className="text-[13px] text-gray-600">Call us for a free quote</span>
              <span className="text-[13px] font-bold text-sage-700 whitespace-nowrap">0800 726 669</span>
            </div>
            <div className="pt-2">
              <QuoteButton label="Get a Quote" className="w-full text-center" />
            </div>
          </div>
        </nav>
      )}

    </header>
  )
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const isActive = pathname === href
  return (
    <Link
      href={href}
      className={`text-[15px] font-semibold transition-colors duration-200 ${
        isActive ? 'text-sage-700' : 'text-gray-700 hover:text-sage-700'
      }`}
    >
      {label}
    </Link>
  )
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PhoneIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.1 1.18 2 2 0 012.08 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
    </svg>
  )
}
