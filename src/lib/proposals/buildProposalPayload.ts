// Proposal Phase 1 — slim, typed payload for the reusable proposal
// template system in src/components/proposals/*.
//
// This is intentionally narrower than the existing
// src/lib/commercialProposalMapping.ts ProposalPayload (which is used
// by CommercialProposalTemplate and the static HTML template). The
// new template uses only the fields the approved mockup actually
// renders, so the preview surface stays predictable.
//
// Two entry points:
//   1. proposalFixture()  — static dev/preview data, no DB.
//   2. fromCommercialProposalPayload(existing)
//      — adapter that maps the existing ProposalPayload (built by
//        buildProposalPayload in commercialProposalMapping.ts) into
//        the new template payload, so live quotes can render in the
//        new template without re-doing the DB → presentation mapping.

import type { ProposalPayload as LegacyProposalPayload } from '@/lib/commercialProposalMapping'

// ── Types ─────────────────────────────────────────────────────────

export interface ProposalScopeSection {
  title: string
  items: string[]
}

export interface ProposalContact {
  email: string
  website: string
  phone: string
}

export interface ProposalTemplatePayload {
  // Cover
  clientName: string
  siteAddress: string
  proposalDate: string          // pre-formatted, e.g. "23 April 2026"
  referenceNumber: string

  // Executive summary
  executiveSummary: string

  // Service overview
  serviceFrequency: string      // e.g. "5 nights / week"
  serviceDays: string           // e.g. "Mon–Fri"
  serviceTimes: string          // e.g. "After 6 pm"
  serviceStartDate: string      // pre-formatted
  areasCovered: string[]        // bulleted list of areas

  // Scope
  scopeSections: ProposalScopeSection[]

  // Pricing
  monthlyServiceFee: string     // pre-formatted "$2,450 +GST per month"
  pricingNote: string           // single-line note shown under the fee box

  // Terms — safe HTML. The author of this string is the source of
  // truth for sanitisation; the template injects via dangerouslySetInnerHTML.
  termsAndConditionsHtml: string

  // Footer (optional — defaults applied by the template)
  contact?: ProposalContact
}

export const SANO_PROPOSAL_CONTACT: ProposalContact = {
  email: 'hello@sano.nz',
  website: 'sano.nz',
  phone: '0800 726 664',
}

// ── Fixture ──────────────────────────────────────────────────────

export function proposalFixture(): ProposalTemplatePayload {
  return {
    clientName: 'Auckland Commercial Group',
    siteAddress: '120 Customs Street West, Auckland CBD 1010',
    proposalDate: '23 April 2026',
    referenceNumber: 'Q-2026-0142',

    executiveSummary:
      'Sano is pleased to present this proposal for ongoing commercial cleaning at your Customs Street office. Our approach combines a stable, vetted team with measurable cleaning standards, designed for low-disruption after-hours service. We back every contract with named site supervision, scheduled inspections, and a single point of contact for any issue.',

    serviceFrequency: '5 nights / week',
    serviceDays: 'Mon – Fri',
    serviceTimes: 'After 6:00 pm',
    serviceStartDate: '12 May 2026',
    areasCovered: [
      'Reception & ground-floor lobby',
      'Open-plan workstations (Levels 2–4)',
      'Meeting rooms & boardroom',
      'Kitchens & breakout zones',
      'Bathrooms (×6) and end-of-trip facilities',
      'Stairwells, lifts, and corridors',
    ],

    scopeSections: [
      {
        title: 'Daily',
        items: [
          'Vacuum all carpeted areas and entry mats',
          'Spot-mop hard floors; full mop on rotation',
          'Empty all rubbish and recycling bins, replace liners',
          'Wipe and sanitise all desks, kitchen surfaces, and high-touch points',
          'Clean and restock all bathrooms; check consumables',
          'Clean kitchen sinks, benches, and run dishwashers as required',
        ],
      },
      {
        title: 'Weekly',
        items: [
          'Detailed bathroom clean — tiles, grout, fixtures',
          'Polish stainless steel and glass partitions',
          'Vacuum upholstery in reception and breakout areas',
          'Detail meeting-room tables, chairs, and AV surfaces',
        ],
      },
      {
        title: 'Periodic',
        items: [
          'Internal glass clean (monthly)',
          'High dusting — vents, light fittings, ledges (monthly)',
          'Carpet hot-water extraction (quarterly)',
          'Hard-floor strip & seal (annual)',
        ],
      },
    ],

    monthlyServiceFee: '$2,450 +GST per month',
    pricingNote: 'Includes consumables (toilet paper, hand soap, hand towel). 30 days written notice for any contract change.',

    termsAndConditionsHtml: `
      <p>This proposal is valid for 30 days from the date of issue. Pricing assumes the scope and service-frequency described above; material changes (additional areas, frequency, or hours) may attract a revised fee on 30 days' written notice.</p>

      <h3>Service standard</h3>
      <p>Sano will deliver the agreed scope to a measurable cleaning standard, with site supervision and scheduled inspections. Any issue raised by the client is acknowledged within one business day and resolved or replanned before the following service.</p>

      <h3>Insurance &amp; compliance</h3>
      <p>Sano carries public-liability insurance to NZ$2 million and statutory liability cover. All cleaners are vetted, inducted, and trained on site-specific procedures. Compliance documents are available on request.</p>

      <h3>Payment</h3>
      <p>Invoices are issued monthly in arrears, payable on the 20th of the month following invoice date. Sano accepts direct credit; account details are included on every invoice.</p>

      <h3>Termination</h3>
      <p>Either party may terminate this agreement on 30 days' written notice. Outstanding service delivered up to the termination date is invoiced in the normal cycle.</p>
    `,
  }
}

// ── Adapter from existing live mapping ────────────────────────────

/**
 * Map the existing ProposalPayload (built by buildProposalPayload in
 * commercialProposalMapping.ts) onto the slim template payload. Live
 * quote → new template render path.
 */
export function fromCommercialProposalPayload(p: LegacyProposalPayload): ProposalTemplatePayload {
  // Scope groups → template sections. Legacy uses .label and .tasks;
  // each task carries task_name + frequency_label.
  const scopeSections: ProposalScopeSection[] = p.scope_groups.map((g) => ({
    title: g.label,
    items: g.tasks.map((t) => {
      const freq = t.frequency_label?.trim()
      return freq ? `${t.task_name} — ${freq}` : t.task_name
    }),
  }))

  // Service schedule one-liners.
  const ss = p.service_schedule
  const serviceFrequency = ss.frequency_summary?.trim() || ''
  const serviceDays      = ss.service_days?.trim() || ''
  const serviceTimes     = ss.service_window?.trim() || ''
  // Legacy payload doesn't carry a start date directly; it's inside
  // commercial_terms when present. Fall back to "—" otherwise.
  const startRow = p.commercial_terms?.rows?.find((r) => /start/i.test(r.label))
  const serviceStartDate = startRow?.value?.trim() || '—'

  // Areas covered = the scope group titles; fits the "What's in scope"
  // checklist on the Service Overview page.
  const areasCovered = scopeSections.map((s) => s.title)

  // Pricing — single hero figure. Legacy carries base, addons, totals;
  // we present the (incl. GST or excl. GST as configured) total as
  // "$X +GST per month" to match the mockup pricing card.
  const fee = nzd(p.pricing.gst_included ? p.pricing.subtotal_ex_gst : p.pricing.total_inc_gst - p.pricing.gst_amount)
  const monthlyServiceFee = `${fee} +GST per month`

  const pricingNote = p.pricing_support?.trim()
    || p.pricing.gst_note
    || 'Pricing valid for 30 days from issue.'

  // Terms — prefer the structured commercial_terms when present,
  // otherwise the assumptions list. Both render as safe HTML.
  const termsHtml = renderTermsHtml(p)

  return {
    clientName: p.client.company_name || 'Client',
    siteAddress: p.client.site_address || '',
    proposalDate: p.meta.issued,
    referenceNumber: p.meta.reference,

    executiveSummary: p.executive_summary || '',

    serviceFrequency,
    serviceDays,
    serviceTimes,
    serviceStartDate,
    areasCovered,

    scopeSections,

    monthlyServiceFee,
    pricingNote,

    termsAndConditionsHtml: termsHtml,
  }
}

// Render terms HTML from the legacy payload's structured data. Plain
// string concat with HTML entities pre-escaped at the source helpers.
function renderTermsHtml(p: LegacyProposalPayload): string {
  const parts: string[] = []

  if (p.commercial_terms?.rows?.length) {
    parts.push('<h3>Commercial terms</h3><ul>')
    for (const row of p.commercial_terms.rows) {
      parts.push(`<li><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</li>`)
    }
    parts.push('</ul>')
    if (p.commercial_terms.closing) {
      parts.push(`<p>${escapeHtml(p.commercial_terms.closing)}</p>`)
    }
  }

  if (p.assumptions.length > 0) {
    parts.push('<h3>Assumptions</h3><ul>')
    for (const a of p.assumptions) parts.push(`<li>${escapeHtml(a)}</li>`)
    parts.push('</ul>')
  }

  if (p.exclusions.length > 0) {
    parts.push('<h3>Exclusions</h3><ul>')
    for (const e of p.exclusions) parts.push(`<li>${escapeHtml(e)}</li>`)
    parts.push('</ul>')
  }

  if (p.compliance_notes) {
    parts.push(`<h3>Compliance</h3><p>${escapeHtml(p.compliance_notes)}</p>`)
  }

  if (parts.length === 0) {
    return '<p>This proposal is valid for 30 days from the date of issue.</p>'
  }

  return parts.join('\n')
}

function nzd(dollars: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(dollars)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
