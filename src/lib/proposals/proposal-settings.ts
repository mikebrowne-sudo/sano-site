// Proposal Phase 2 — proposal content + commercial defaults.
//
// Single source of truth for the editable parts of the proposal.
// Layout, spacing, typography, component structure stay locked in code;
// only the values listed in ProposalSettings can be edited by an admin
// from /portal/settings/proposals.
//
// The loader always returns a fully-populated, validated object —
// missing rows / malformed JSON / unknown keys all fall back to the
// hardcoded defaults. The proposal will never crash because of bad
// settings.

import type { SupabaseClient } from '@supabase/supabase-js'
import { APPROVED_TERMS_HTML } from './terms-and-conditions'

// ── Types ──────────────────────────────────────────────────────────

export interface ProposalSettingsContent {
  executive_summary_default: string
  pricing_note: string
  prepared_for_label: string
  site_address_label: string
  date_label: string
  reference_label: string
  acceptance_wording: string
}

export interface ProposalSettingsTerms {
  terms_and_conditions_html: string
  default_contract_term_months: number
  default_payment_term_days: number
  default_notice_period_days: number
  liability_clause: string
}

export interface ProposalSettingsCommercial {
  proposal_validity_days: number
  gst_suffix_text: string
  monthly_fee_suffix_text: string
}

export interface ProposalSettingsFooter {
  footer_email: string
  footer_website: string
  footer_phone: string
}

export interface ProposalSettingsSections {
  show_executive_summary: boolean
  show_terms: boolean
  show_acceptance: boolean
}

export interface ProposalSettings {
  content: ProposalSettingsContent
  terms: ProposalSettingsTerms
  commercial: ProposalSettingsCommercial
  footer: ProposalSettingsFooter
  sections: ProposalSettingsSections
}

// ── Defaults ───────────────────────────────────────────────────────

export const DEFAULT_PROPOSAL_SETTINGS: ProposalSettings = {
  content: {
    executive_summary_default:
      'Sano is pleased to present this proposal. Our approach combines a stable, vetted team with measurable cleaning standards and a single point of contact for any service issue.',
    pricing_note:
      'Pricing reflects a consistent, well-managed service with trained staff and quality control processes in place.',
    prepared_for_label: 'Prepared for:',
    site_address_label: 'Site address:',
    date_label: 'Date:',
    reference_label: 'Reference:',
    acceptance_wording:
      'By signing below, the client accepts the scope, pricing, and terms set out in this proposal.',
  },
  terms: {
    // Approved Sano Property Services Limited commercial terms
    // (locked 2026-04-26). Source-of-truth string lives in
    // src/lib/proposals/terms-and-conditions.ts.
    terms_and_conditions_html: APPROVED_TERMS_HTML,
    default_contract_term_months: 12,   // matches approved §2 Contract Term
    default_payment_term_days: 14,      // matches approved §5 Pricing & Payment Terms
    default_notice_period_days: 30,     // matches approved §17 Termination & Notice
    liability_clause:
      'Sano Property Services Limited maintains appropriate insurance cover, including public liability insurance. Liability is limited to the value of services provided within the preceding three-month period, except where required by law.',
  },
  commercial: {
    proposal_validity_days: 30,
    gst_suffix_text: '+ GST',
    monthly_fee_suffix_text: 'per month',
  },
  footer: {
    footer_email: 'hello@sano.nz',
    footer_website: 'sano.nz',
    footer_phone: '0800 726 664',
  },
  sections: {
    show_executive_summary: true,
    show_terms: true,
    // Final polish — Acceptance is now part of the closing flow, so
    // default to on for fresh installs. Any existing `proposal_settings`
    // row with `show_acceptance: false` wins over this default and
    // must be toggled via /portal/settings/proposals.
    show_acceptance: true,
  },
}

// ── Validators (basic, manual — matches project pattern) ───────────

function safeString(input: unknown, fallback: string): string {
  if (typeof input !== 'string') return fallback
  // Empty strings are allowed for some labels but the loader treats
  // them as "use default" — so collapse here.
  return input.length > 0 ? input : fallback
}

function safeInt(input: unknown, fallback: number, min = 0, max = 3650): number {
  const n = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(n)) return fallback
  const i = Math.round(n)
  if (i < min || i > max) return fallback
  return i
}

function safeBool(input: unknown, fallback: boolean): boolean {
  if (typeof input === 'boolean') return input
  return fallback
}

function mergeContent(input: unknown, fb: ProposalSettingsContent): ProposalSettingsContent {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  return {
    executive_summary_default: safeString(s.executive_summary_default, fb.executive_summary_default),
    pricing_note:              safeString(s.pricing_note,              fb.pricing_note),
    prepared_for_label:        safeString(s.prepared_for_label,        fb.prepared_for_label),
    site_address_label:        safeString(s.site_address_label,        fb.site_address_label),
    date_label:                safeString(s.date_label,                fb.date_label),
    reference_label:           safeString(s.reference_label,           fb.reference_label),
    acceptance_wording:        safeString(s.acceptance_wording,        fb.acceptance_wording),
  }
}

function mergeTerms(input: unknown, fb: ProposalSettingsTerms): ProposalSettingsTerms {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  return {
    terms_and_conditions_html:    safeString(s.terms_and_conditions_html, fb.terms_and_conditions_html),
    default_contract_term_months: safeInt(s.default_contract_term_months, fb.default_contract_term_months, 0, 120),
    default_payment_term_days:    safeInt(s.default_payment_term_days,    fb.default_payment_term_days,    0, 365),
    default_notice_period_days:   safeInt(s.default_notice_period_days,   fb.default_notice_period_days,   0, 365),
    liability_clause:             safeString(s.liability_clause,          fb.liability_clause),
  }
}

function mergeCommercial(input: unknown, fb: ProposalSettingsCommercial): ProposalSettingsCommercial {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  return {
    proposal_validity_days:  safeInt(s.proposal_validity_days,  fb.proposal_validity_days,  0, 365),
    gst_suffix_text:         safeString(s.gst_suffix_text,         fb.gst_suffix_text),
    monthly_fee_suffix_text: safeString(s.monthly_fee_suffix_text, fb.monthly_fee_suffix_text),
  }
}

function mergeFooter(input: unknown, fb: ProposalSettingsFooter): ProposalSettingsFooter {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  return {
    footer_email:   safeString(s.footer_email,   fb.footer_email),
    footer_website: safeString(s.footer_website, fb.footer_website),
    footer_phone:   safeString(s.footer_phone,   fb.footer_phone),
  }
}

function mergeSections(input: unknown, fb: ProposalSettingsSections): ProposalSettingsSections {
  const s = (input && typeof input === 'object') ? input as Record<string, unknown> : {}
  return {
    show_executive_summary: safeBool(s.show_executive_summary, fb.show_executive_summary),
    show_terms:             safeBool(s.show_terms,             fb.show_terms),
    show_acceptance:        safeBool(s.show_acceptance,        fb.show_acceptance),
  }
}

/**
 * Merge stored JSON over defaults with full validation. Always returns
 * a complete, type-safe ProposalSettings — unknown / invalid / missing
 * fields silently fall back to defaults. Never throws.
 */
export function mergeProposalSettings(stored: unknown): ProposalSettings {
  const s = (stored && typeof stored === 'object') ? stored as Record<string, unknown> : {}
  return {
    content:    mergeContent(s.content,       DEFAULT_PROPOSAL_SETTINGS.content),
    terms:      mergeTerms(s.terms,           DEFAULT_PROPOSAL_SETTINGS.terms),
    commercial: mergeCommercial(s.commercial, DEFAULT_PROPOSAL_SETTINGS.commercial),
    footer:     mergeFooter(s.footer,         DEFAULT_PROPOSAL_SETTINGS.footer),
    sections:   mergeSections(s.sections,     DEFAULT_PROPOSAL_SETTINGS.sections),
  }
}

/** Server-side validator used by save action. Same pipeline — invalid
 *  keys drop silently and defaults fill any gap. Returns the cleaned
 *  payload ready to persist. */
export function validateProposalSettings(input: unknown):
  | { ok: true; value: ProposalSettings }
  | { error: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'Settings payload must be an object.' }
  }
  return { ok: true, value: mergeProposalSettings(input) }
}

// ── Loader ─────────────────────────────────────────────────────────

const SETTINGS_KEY = 'default'

/**
 * Load proposal settings from `proposal_settings`. Always returns a
 * fully-populated, validated ProposalSettings — falls back to the code
 * defaults when the row is missing or any read error occurs.
 */
export async function loadProposalSettings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public'>,
): Promise<ProposalSettings> {
  const { data, error } = await supabase
    .from('proposal_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error || !data) return DEFAULT_PROPOSAL_SETTINGS
  return mergeProposalSettings(data.value)
}

export { SETTINGS_KEY }
