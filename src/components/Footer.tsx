import Link from 'next/link'
import { SERVICES } from '@/lib/services'

export function Footer() {
  return (
    <footer className="bg-sage-800 text-white section-padding py-12">
      <div className="container-max">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <p className="font-display text-2xl font-bold mb-3">Sano</p>
            <p className="text-sage-100 text-sm leading-relaxed">Professional, eco-friendly cleaning in Auckland. Vetted cleaners, guaranteed results.</p>
          </div>
          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-sage-300 uppercase tracking-wider mb-4">Services</h3>
            <ul className="space-y-2">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link href={`/services/${service.slug}`} className="text-sm text-sage-100 hover:text-white transition-colors">
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-sage-300 uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2">
              {[
                { href: '/about', label: 'About Sano' },
                { href: '/faq', label: 'FAQ' },
                { href: '/contact', label: 'Contact Us' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-sage-100 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-sage-300 uppercase tracking-wider mb-4">Contact</h3>
            <ul className="space-y-2 text-sm text-sage-100">
              <li>Auckland, New Zealand</li>
              <li>
                <a href="tel:02108799909" className="hover:text-white transition-colors">
                  021 087 99909
                </a>
              </li>
              <li>
                <a href="mailto:michael@sano.nz" className="hover:text-white transition-colors">
                  michael@sano.nz
                </a>
              </li>
            </ul>
            <div className="mt-4 flex gap-3">
              <span className="inline-flex items-center gap-1 bg-sage-500/30 rounded-full px-3 py-1 text-xs text-sage-100">✓ Insured</span>
              <span className="inline-flex items-center gap-1 bg-sage-500/30 rounded-full px-3 py-1 text-xs text-sage-100">✓ Auckland-wide</span>
            </div>
          </div>
        </div>
        <div className="border-t border-sage-500/30 pt-6 text-center text-xs text-sage-300">
          © {new Date().getFullYear()} Sano Cleaning Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
