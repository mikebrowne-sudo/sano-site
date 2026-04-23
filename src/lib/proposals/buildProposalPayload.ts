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
import {
  DEFAULT_PROPOSAL_SETTINGS,
  type ProposalSettings,
} from './proposal-settings'

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

export interface ProposalSectionToggles {
  executiveSummary: boolean
  terms: boolean
  acceptance: boolean
}

export interface ProposalTemplatePayload {
  // Cover values
  coverTagline: string          // e.g. "CLEAN SPACES. BETTER PLACES."
  coverTitle: string            // e.g. "Commercial Cleaning Proposal"
  preparedForLabel: string      // VALUE: e.g. "Sansom Construction"
  clientName: string
  siteAddress: string
  proposalDate: string          // pre-formatted, e.g. "24 April 2026"
  referenceNumber: string

  // Cover field LABELS (from settings — operator-editable)
  preparedForFieldLabel: string  // e.g. "Prepared for:"
  siteAddressFieldLabel: string  // e.g. "Site address:"
  dateFieldLabel: string         // e.g. "Date:"
  referenceFieldLabel: string    // e.g. "Reference:"

  // Executive summary
  executiveSummary: string

  // Service overview
  serviceFrequency: string
  serviceDays: string
  serviceTimes: string
  serviceStartDate: string
  areasCovered: string[]

  // Scope
  scopeSections: ProposalScopeSection[]

  // Pricing
  monthlyServiceFee: string     // pre-formatted hero amount, e.g. "$2,450"
  pricingNote: string
  gstSuffix: string             // settings — e.g. "+ GST"
  monthlyFeeSuffix: string      // settings — e.g. "per month"

  // Terms
  termsAndConditionsHtml: string

  // Acceptance (page not rendered yet — Phase 2 follow-up)
  acceptanceWording: string

  // Section toggles (from settings)
  sections: ProposalSectionToggles

  // Footer
  contact?: ProposalContact
}

export const SANO_PROPOSAL_CONTACT: ProposalContact = {
  email: 'hello@sano.nz',
  website: 'sano.nz',
  phone: '0800 726 664',
}

// ── Fixture ──────────────────────────────────────────────────────

/**
 * Fixture — static data for the preview route. Optional `settings`
 * parameter applies operator-edited defaults (labels, footer contact,
 * pricing suffixes, terms, section toggles). Without settings, the
 * fixture uses DEFAULT_PROPOSAL_SETTINGS in their place — preview
 * still renders correctly on a fresh DB.
 */
export function proposalFixture(settings: ProposalSettings = DEFAULT_PROPOSAL_SETTINGS): ProposalTemplatePayload {
  return {
    coverTagline: 'CLEAN SPACES. BETTER PLACES.',
    coverTitle: 'Commercial Cleaning Proposal',
    preparedForLabel: 'Sansom Construction',
    clientName: 'Sansom Construction',
    siteAddress: '18 & 32 Burleigh Street, Parnell, Auckland 1052',
    proposalDate: '24 April 2026',
    referenceNumber: 'Q-1024',

    preparedForFieldLabel:  settings.content.prepared_for_label,
    siteAddressFieldLabel:  settings.content.site_address_label,
    dateFieldLabel:         settings.content.date_label,
    referenceFieldLabel:    settings.content.reference_label,

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

    monthlyServiceFee: '$2,450',
    pricingNote: settings.content.pricing_note,
    gstSuffix: settings.commercial.gst_suffix_text,
    monthlyFeeSuffix: settings.commercial.monthly_fee_suffix_text,

    termsAndConditionsHtml: settings.terms.terms_and_conditions_html,

    acceptanceWording: settings.content.acceptance_wording,

    sections: {
      executiveSummary: settings.sections.show_executive_summary,
      terms:            settings.sections.show_terms,
      acceptance:       settings.sections.show_acceptance,
    },

    contact: {
      email:   settings.footer.footer_email,
      website: settings.footer.footer_website,
      phone:   settings.footer.footer_phone,
    },
  }
}

// ── Adapter from existing live mapping ────────────────────────────

/**
 * Map the existing ProposalPayload (built by buildProposalPayload in
 * commercialProposalMapping.ts) onto the slim template payload. Live
 * quote → new template render path. Optional settings override the
 * editable defaults (labels, footer, terms, etc.); quote-specific
 * data still wins where present.
 */
export function fromCommercialProposalPayload(
  p: LegacyProposalPayload,
  settings: ProposalSettings = DEFAULT_PROPOSAL_SETTINGS,
): ProposalTemplatePayload {
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

  // Pricing — single hero figure (just the dollar amount). The
  // template renders the GST + monthly suffixes from settings.
  const monthlyServiceFee = nzd(p.pricing.gst_included ? p.pricing.subtotal_ex_gst : p.pricing.total_inc_gst - p.pricing.gst_amount)

  // pricingNote precedence: quote-specific support text → settings
  // pricing_note → legacy gst_note as last resort.
  const pricingNote = p.pricing_support?.trim()
    || settings.content.pricing_note
    || p.pricing.gst_note
    || 'Pricing valid for 30 days from issue.'

  // Terms: ALWAYS the approved settings.terms_and_conditions_html.
  //
  // Earlier versions auto-rendered a "Commercial terms / Assumptions /
  // Exclusions / Compliance" block from the legacy ProposalPayload's
  // operational metadata when present, which silently REPLACED the
  // approved 19-section terms. That metadata is project-management
  // information, not legal terms — it shouldn't sit on the Terms &
  // Conditions page. If we want to surface it later it belongs in
  // its own section.
  const termsHtml = settings.terms.terms_and_conditions_html

  return {
    coverTagline: 'CLEAN SPACES. BETTER PLACES.',
    coverTitle: 'Commercial Cleaning Proposal',
    preparedForLabel: p.client.company_name || 'Client',
    clientName: p.client.company_name || 'Client',
    siteAddress: p.client.site_address || '',
    proposalDate: p.meta.issued,
    referenceNumber: p.meta.reference,

    preparedForFieldLabel: settings.content.prepared_for_label,
    siteAddressFieldLabel: settings.content.site_address_label,
    dateFieldLabel:        settings.content.date_label,
    referenceFieldLabel:   settings.content.reference_label,

    // Quote-specific exec summary wins; settings default fills in.
    executiveSummary: p.executive_summary?.trim() || settings.content.executive_summary_default,

    serviceFrequency,
    serviceDays,
    serviceTimes,
    serviceStartDate,
    areasCovered,

    scopeSections,

    monthlyServiceFee,
    pricingNote,
    gstSuffix:        settings.commercial.gst_suffix_text,
    monthlyFeeSuffix: settings.commercial.monthly_fee_suffix_text,

    termsAndConditionsHtml: termsHtml,

    acceptanceWording: settings.content.acceptance_wording,

    sections: {
      executiveSummary: settings.sections.show_executive_summary,
      terms:            settings.sections.show_terms,
      acceptance:       settings.sections.show_acceptance,
    },

    contact: {
      email:   settings.footer.footer_email,
      website: settings.footer.footer_website,
      phone:   settings.footer.footer_phone,
    },
  }
}

function nzd(dollars: number): string {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD', maximumFractionDigits: 0 }).format(dollars)
}
