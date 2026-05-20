import type { Metadata } from 'next'
import { ServiceChecklist } from '@/components/ServiceChecklist'
import {
  SANO_100_POINT_HOME_CLEAN,
  SANO_DEEP_CLEAN_DETAIL,
  SANO_125_POINT_PROPERTY_RESET,
} from '@/lib/checklists'

export const metadata: Metadata = {
  title: 'Sano Cleaning Standards — preview',
  description: 'Internal preview of the ServiceChecklist component. Not for public consumption.',
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Preview-only route for visual review of the ServiceChecklist component
 * before service-page integration (Phase C).
 *
 * - Not linked from anywhere in the public site nav.
 * - Marked noindex / nofollow.
 * - Will be deleted in the PR that ships the third Phase C integration.
 */
export default function ChecklistPreviewPage() {
  return (
    <main className="bg-white">
      <header className="section-padding border-b border-sage-100 bg-sage-50 py-10">
        <div className="container-max">
          <p className="eyebrow mb-3">Internal preview</p>
          <h1 className="text-sage-800 mb-3">Sano Cleaning Standards — component preview</h1>
          <p className="body-text max-w-2xl">
            Visual review surface for <code className="rounded bg-white px-1.5 py-0.5 text-sage-700">ServiceChecklist</code>.
            All three Sano Cleaning Standards are rendered below with draft content.
            This route is <strong>noindex</strong> and not linked from the public site;
            it will be removed once Phase C integrations land on each service page.
          </p>
          <p className="body-text mt-4 max-w-2xl">
            The amber <strong>Draft</strong> badge above each heading indicates the
            checklist content is scaffold-only — real Sano source content replaces
            it before any service-page integration.
          </p>
        </div>
      </header>

      <ServiceChecklist
        checklist={SANO_100_POINT_HOME_CLEAN}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="100-Point Home Clean Checklist"
        headingHighlight="100-Point Home Clean"
        intro="Click on each room to see what's included in your regular home clean."
        anchorId="home-clean-checklist"
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for your home"
      />

      <ServiceChecklist
        checklist={SANO_DEEP_CLEAN_DETAIL}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="Deep Clean Detail Checklist"
        headingHighlight="Deep Clean Detail"
        intro="Click on each area to see what's included in a Sano deep clean."
        anchorId="deep-clean-checklist"
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for a deep clean"
      />

      <ServiceChecklist
        checklist={SANO_125_POINT_PROPERTY_RESET}
        eyebrow="WHAT'S INCLUDED"
        displayHeading="125-Point Property Reset Checklist"
        headingHighlight="125-Point Property Reset"
        intro="Click on each area to see what's covered in your end-of-lease clean."
        anchorId="property-reset-checklist"
        showQuoteCta
        ctaHref="/contact"
        ctaLabel="Get a free quote for end of tenancy"
      />
    </main>
  )
}
