# Header Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing Header with a two-tier sticky header — a slim evergreen top bar above a clean white main header — using Poppins font, hover-triggered dropdowns for Services and About, and updated nav items.

**Architecture:** Single `Header.tsx` component with inline sub-components (`NavLink`, `ChevronIcon`, `PhoneIcon`) and a constant `ABOUT_LINKS` array. Poppins replaces Outfit as `font-sans` via a new CSS variable in `fonts.ts` and `tailwind.config.ts`. Top bar uses the same `container-max section-padding` wrapper as the main header so the phone text aligns with the CTA button's right edge.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, React Testing Library, Jest, next/font/google

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/fonts.ts` | Modify | Add Poppins export with CSS variable `--font-poppins` |
| `tailwind.config.ts` | Modify | Swap font-sans from Outfit to Poppins |
| `src/app/layout.tsx` | Modify | Add `poppins.variable` to `<html>` className |
| `src/components/Header.tsx` | Replace | Full two-tier header with top bar, dropdowns, mobile menu |
| `src/__tests__/components/Header.test.tsx` | Create | Behaviour tests for all header features |

---

## Task 1: Add Poppins font

**Files:**
- Modify: `src/lib/fonts.ts`
- Modify: `tailwind.config.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add Poppins to fonts.ts**

Replace the contents of `src/lib/fonts.ts` with:

```typescript
import { Poppins, Noto_Serif } from 'next/font/google'

export const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-noto-serif',
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})
```

- [ ] **Step 2: Update tailwind.config.ts to use Poppins**

In `tailwind.config.ts`, change the `fontFamily.sans` line:

```typescript
fontFamily: {
  sans:    ['var(--font-poppins)', 'system-ui', 'sans-serif'],
  display: ['var(--font-noto-serif)', 'Georgia', 'serif'],
  serif:   ['var(--font-noto-serif)', 'Georgia', 'serif'],
},
```

- [ ] **Step 3: Update layout.tsx to apply the Poppins variable**

Replace the import and usage in `src/app/layout.tsx`:

```typescript
import { poppins, notoSerif } from '@/lib/fonts'

// In the component:
<html lang="en" className={`${poppins.variable} ${notoSerif.variable}`}>
```

Full file after change:

```typescript
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
```

- [ ] **Step 4: Verify the build compiles**

```bash
cd F:/Sano/sano-site && npm run build 2>&1 | tail -20
```

Expected: build succeeds, no font-related errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fonts.ts tailwind.config.ts src/app/layout.tsx
git commit -m "feat: switch body font from Outfit to Poppins"
```

---

## Task 2: Write failing Header tests

**Files:**
- Create: `src/__tests__/components/Header.test.tsx`

- [ ] **Step 1: Create the test file**

Create `src/__tests__/components/Header.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/Header'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

jest.mock('next/link', () => {
  return function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) {
    return <a href={href} {...(props as object)}>{children}</a>
  }
})

describe('Header — top bar', () => {
  it('renders the phone label', () => {
    render(<Header />)
    expect(screen.getByText('Call us for a free quote')).toBeInTheDocument()
  })

  it('renders the phone number', () => {
    render(<Header />)
    expect(screen.getByText('0800 726 669')).toBeInTheDocument()
  })
})

describe('Header — main bar', () => {
  it('renders the Sano logo image', () => {
    render(<Header />)
    expect(screen.getByAltText('Sano')).toBeInTheDocument()
  })

  it('renders all desktop nav labels', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /services/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join Our Team' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Blog' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /about/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Contact Us' })).toBeInTheDocument()
  })

  it('renders the Get a Quote CTA', () => {
    render(<Header />)
    expect(screen.getByRole('link', { name: /get a quote/i })).toBeInTheDocument()
  })
})

describe('Header — Services dropdown', () => {
  it('is hidden by default', () => {
    render(<Header />)
    expect(screen.queryByText('All Services')).not.toBeInTheDocument()
  })

  it('shows on mouse enter', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /services/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    expect(screen.getByText('All Services')).toBeInTheDocument()
    expect(screen.getByText('Regular House Cleaning')).toBeInTheDocument()
    expect(screen.getByText('Post-Construction Cleaning')).toBeInTheDocument()
  })

  it('hides on mouse leave', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /services/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    fireEvent.mouseLeave(btn.closest('div')!)
    expect(screen.queryByText('All Services')).not.toBeInTheDocument()
  })
})

describe('Header — About dropdown', () => {
  it('is hidden by default', () => {
    render(<Header />)
    expect(screen.queryByText('About Us')).not.toBeInTheDocument()
  })

  it('shows all About links on mouse enter', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /about/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    expect(screen.getByText('About Us')).toBeInTheDocument()
    expect(screen.getByText('Service Area')).toBeInTheDocument()
    expect(screen.getByText('Our Guarantee')).toBeInTheDocument()
    expect(screen.getByText('Our Policies')).toBeInTheDocument()
    expect(screen.getByText('FAQ')).toBeInTheDocument()
  })

  it('hides on mouse leave', () => {
    render(<Header />)
    const btn = screen.getByRole('button', { name: /about/i })
    fireEvent.mouseEnter(btn.closest('div')!)
    fireEvent.mouseLeave(btn.closest('div')!)
    expect(screen.queryByText('About Us')).not.toBeInTheDocument()
  })
})

describe('Header — mobile menu', () => {
  it('is hidden by default', () => {
    render(<Header />)
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument()
  })

  it('opens on hamburger click', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    expect(screen.getByRole('navigation', { name: /mobile navigation/i })).toBeInTheDocument()
  })

  it('closes on second hamburger click', () => {
    render(<Header />)
    const hamburger = screen.getByRole('button', { name: /toggle menu/i })
    fireEvent.click(hamburger)
    fireEvent.click(hamburger)
    expect(screen.queryByRole('navigation', { name: /mobile navigation/i })).not.toBeInTheDocument()
  })

  it('shows phone number in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(mobileNav).toHaveTextContent('0800 726 669')
  })

  it('shows all service links in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(mobileNav).toHaveTextContent('Regular House Cleaning')
    expect(mobileNav).toHaveTextContent('Post-Construction Cleaning')
  })

  it('shows all About links in mobile menu', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle menu/i }))
    const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i })
    expect(mobileNav).toHaveTextContent('About Us')
    expect(mobileNav).toHaveTextContent('Our Guarantee')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd F:/Sano/sano-site && npx jest src/__tests__/components/Header.test.tsx --no-coverage 2>&1 | tail -30
```

Expected: tests fail — `Header` component doesn't match the new structure yet.

- [ ] **Step 3: Commit the tests**

```bash
git add src/__tests__/components/Header.test.tsx
git commit -m "test: add Header tests for two-tier layout, hover dropdowns, mobile menu"
```

---

## Task 3: Implement the new Header

**Files:**
- Replace: `src/components/Header.tsx`

- [ ] **Step 1: Replace Header.tsx**

Replace the entire contents of `src/components/Header.tsx` with:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
      <div className="bg-[#344C3D]">
        <div className="container-max section-padding">
          <div className="flex justify-end items-center h-9 gap-2">
            <PhoneIcon className="text-[#a8c5b0]" />
            <span className="text-[#a8c5b0] text-[13px] leading-relaxed">Call us for a free quote</span>
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
                src="/brand/sano-logo.jpg"
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
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <button
                  className={`flex items-center gap-1 text-[15px] font-semibold transition-colors duration-200 ${
                    pathname.startsWith('/services') ? 'text-[#344C3D]' : 'text-gray-700 hover:text-[#344C3D]'
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
                      className="block px-4 py-2 text-[13px] font-semibold text-[#344C3D] hover:bg-sage-50"
                      onClick={() => setServicesOpen(false)}
                    >
                      All Services
                    </Link>
                    <hr className="my-1 border-sage-100" />
                    {SERVICES.map((service) => (
                      <Link
                        key={service.slug}
                        href={`/services/${service.slug}`}
                        className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-sage-50 hover:text-[#344C3D]"
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
                onMouseEnter={() => setAboutOpen(true)}
                onMouseLeave={() => setAboutOpen(false)}
              >
                <button
                  className={`flex items-center gap-1 text-[15px] font-semibold transition-colors duration-200 ${
                    ABOUT_LINKS.some((l) => pathname === l.href) ? 'text-[#344C3D]' : 'text-gray-700 hover:text-[#344C3D]'
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
                        className="block px-4 py-2 text-[13px] text-gray-700 hover:bg-sage-50 hover:text-[#344C3D]"
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
            <Link href="/services" className="block py-2 text-[15px] font-semibold text-[#344C3D]" onClick={() => setMobileOpen(false)}>All Services</Link>
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
              <PhoneIcon className="text-[#344C3D]" />
              <span className="text-[13px] text-gray-600">Call us for a free quote</span>
              <span className="text-[13px] font-bold text-[#344C3D] whitespace-nowrap">0800 726 669</span>
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
        isActive ? 'text-[#344C3D]' : 'text-gray-700 hover:text-[#344C3D]'
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
```

- [ ] **Step 2: Run the tests**

```bash
cd F:/Sano/sano-site && npx jest src/__tests__/components/Header.test.tsx --no-coverage 2>&1 | tail -30
```

Expected: all tests pass.

- [ ] **Step 3: Run the full test suite to check for regressions**

```bash
cd F:/Sano/sano-site && npx jest --no-coverage 2>&1 | tail -20
```

Expected: all pre-existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: two-tier header with top bar, Poppins font, hover dropdowns for Services and About"
```

---

## Task 4: Build verification

**Files:** none — verify only

- [ ] **Step 1: Run a production build**

```bash
cd F:/Sano/sano-site && npm run build 2>&1 | tail -30
```

Expected: build completes with no errors or type errors.

- [ ] **Step 2: Push to trigger Netlify deploy**

```bash
git push
```

- [ ] **Step 3: Smoke test on live site**

After Netlify deploys (~2 min), check:
1. Top bar appears with phone number right-aligned
2. Services dropdown opens on hover, closes on mouse leave
3. About dropdown opens on hover, shows all 5 links
4. "Get a Quote" button visible, links to `/contact`
5. On mobile: hamburger opens menu, phone number visible at bottom, "Get a Quote" button at bottom
